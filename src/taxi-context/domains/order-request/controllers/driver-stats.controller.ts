import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@infrastructure/guards';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { OrderRequestRepository } from '../../../domain-repositories/order-request/order-request.repository';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderStatus } from '@infrastructure/enums';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';

@ApiBearerAuth()
@ApiTags('Driver Stats & Location')
@Controller('v1/order-requests')
export class DriverStatsController {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  @Get('driver/stats')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get driver statistics' })
  @ApiResponse({ status: 200, description: 'Driver stats retrieved successfully' })
  async getDriverStats(@IAM() user: UserOrmEntity) {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get completed orders for today
      const todayOrders = await OrderRequestOrmEntity.query()
        .where('driverId', user.id)
        .where('orderStatus', OrderStatus.COMPLETED)
        .where('createdAt', '>=', today)
        .where('createdAt', '<', tomorrow);

      // Calculate today's earnings
      const todayEarnings = todayOrders.reduce((sum, order) => sum + (order.price || 0), 0);

      // Get all completed orders for rating calculation
      const allCompletedOrders = await OrderRequestOrmEntity.query()
        .where('driverId', user.id)
        .where('orderStatus', OrderStatus.COMPLETED)
        .whereNotNull('rating');

      // Calculate average rating
      const averageRating = allCompletedOrders.length > 0 
        ? allCompletedOrders.reduce((sum, order) => sum + (order.rating || 0), 0) / allCompletedOrders.length
        : 5.0;

      // Get total orders count
      const totalOrders = await OrderRequestOrmEntity.query()
        .where('driverId', user.id)
        .where('orderStatus', OrderStatus.COMPLETED)
        .resultSize();

      // Calculate acceptance rate (simplified - you may want to track this separately)
      const acceptanceRate = 95; // Placeholder - implement proper tracking

      return {
        todayEarnings,
        todayTrips: todayOrders.length,
        rating: Math.round(averageRating * 10) / 10,
        acceptance: acceptanceRate,
        totalTrips: totalOrders,
      };
    } catch (error) {
      console.error('Error getting driver stats:', error);
      throw error;
    }
  }

  @Post('location/update')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Update driver location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateLocation(
    @Body() body: { lng: number; lat: number; orderId?: string },
    @IAM() user: UserOrmEntity
  ) {
    const { lng, lat, orderId } = body;
    
    if (lat && lng) {
      await this.cacheStorageService.updateDriverLocation(user.id, lng.toString(), lat.toString());
      
      if (orderId) {
        const order = await this.orderRequestRepository.findOneById(orderId);
        if (order && order.getPropsCopy().driverId?.value === user.id) {
          const location = await this.cacheStorageService.getDriverLocation(user.id);
          const clientSocketId = await this.cacheStorageService.getSocketClientId(orderId);
          if (clientSocketId && !location) {
            // TODO: Emit to WebSocket
            console.log('Should emit newOrder to client socket');
          }
        }
      }
    }
    
    return { success: true };
  }
}
