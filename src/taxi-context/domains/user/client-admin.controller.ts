import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Res, Query, Param, Post, Body, Put, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { BlockUserDto } from './dto/block-user.dto';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { JwtAuthGuard } from '@infrastructure/guards';
import { UserUnblockSchedulerService } from './services/user-unblock-scheduler.service';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('admin')
export class ClientOrderRequestController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userUnblockSchedulerService: UserUnblockSchedulerService,
  ) {}

  @Get('clients')
  @ApiOperation({ summary: 'Get clients' })
  async getClients(
    @Res({ passthrough: true }) res: Response,
    @Query('orderStatus') orderStatus: string,
    @Query('orderType') orderType: string,
    @Query('phone') phone: string,
    @Query('_start') _start?: number,
    @Query('_end') _end?: number,
    @Query('_sort') _sort = 'id',
    @Query('_order') _order: 'ASC' | 'DESC' = 'ASC',
    @Query('id') idParam?: string | string[],
  ) {
    let users;
    let totalCount;

    if (idParam) {
      // If 'id' query parameter is provided, fetch users by IDs
      const ids = Array.isArray(idParam) ? idParam : [idParam];
      users = await UserOrmEntity.query().findByIds(ids).withGraphFetched('[categoryLicenses, orders]');
      totalCount = users.length;
    } else {
      // Handle pagination and sorting
      const start = Number(_start) || 0;
      const end = Number(_end) || 10;
      const limit = end - start;

      const baseQuery = UserOrmEntity.query()
        .withGraphFetched('[categoryLicenses, orders]')
        .modifyGraph('orders', (builder) => {
          if (orderStatus) {
            builder.where('orderStatus', '=', orderStatus);
          }
          if (orderType) {
            builder.where('orderType', '=', orderType);
          }
        });
      // Get total count before pagination
      if(phone)
          baseQuery.where({phone})
      const totalCountResult = await baseQuery.clone();
      totalCount = totalCountResult.length;

      // Apply sorting
      if (_sort === 'orders.length') {
        baseQuery
          .select('users.*')
          .leftJoinRelated('orders') // LEFT JOIN instead of INNER JOIN
          .groupBy('users.id') // Group by user ID
          .count('orders.id as orderCount') // Count related orders (0 if no orders)
          .orderBy('orderCount', _order); // Sort by the count
      } else {
        baseQuery.orderBy(_sort, _order);
      }

      // Apply pagination
      users = await baseQuery.offset(start).limit(limit);
    }

    // Set the X-Total-Count header
    res.setHeader('X-Total-Count', String(totalCount));

    return users;
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Get drivers' })
  async getDrivers(
    @Res({ passthrough: true }) res: Response,
    @Query('orderStatus') orderStatus: string,
    @Query('orderType') orderType: string,
    @Query('phone') phone: string,
    @Query('_start') _start?: number,
    @Query('_end') _end?: number,
    @Query('_sort') _sort = 'id',
    @Query('_order') _order: 'ASC' | 'DESC' = 'ASC',
    @Query('id') idParam?: string | string[],
  ) {
    let users;
    let totalCount;

    if (idParam) {
      // If 'id' query parameter is provided, fetch users by IDs
      const ids = Array.isArray(idParam) ? idParam : [idParam];
      users = await UserOrmEntity.query().findByIds(ids).withGraphFetched('[categoryLicenses, orders_as_driver]');
      totalCount = users.length;
    } else {
      // Handle pagination and sorting
      const start = Number(_start) || 0;
      const end = Number(_end) || 10;
      const limit = end - start;

      const baseQuery = UserOrmEntity.query()
        .withGraphFetched('[categoryLicenses, orders_as_driver]')
        .modifyGraph('orders_as_driver', (builder) => {
          if (orderStatus) {
            builder.where('orderStatus', '=', orderStatus);
          }
          if (orderType) {
            builder.where('orderType', '=', orderType);
          }
        });
      
      // Get total count before pagination
      if(phone)
        baseQuery.where({phone})
      const totalCountResult = await baseQuery.clone();
      totalCount = totalCountResult.length;

      // Apply sorting
      if (_sort === 'orders_as_driver.length') {
        baseQuery
          .select('users.*')
          .leftJoinRelated('orders_as_driver') // LEFT JOIN instead of INNER JOIN
          .groupBy('users.id') // Group by user ID
          .count('orders_as_driver.id as orderCount') // Count related orders (0 if no orders)
          .orderBy('orderCount', _order); // Sort by the count
      } else {
        baseQuery.orderBy(_sort, _order);
      }

      // Apply pagination
      users = await baseQuery.offset(start).limit(limit);
    }

    // Set the X-Total-Count header
    res.setHeader('X-Total-Count', String(totalCount));

    return users;
  }

  @Get('clients/:id')
  async getClient(@Param('id') id: string) {
    return UserOrmEntity.query().findById(id).withGraphFetched({orders: true, orders_as_driver: true });
  }

  @Get('drivers/:id')
  async getDriver(@Param('id') id: string) {
    return UserOrmEntity.query().findById(id).withGraphFetched({orders: true, orders_as_driver: true });
  }

  @Post('users/block')
  // @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Block user' })
  async blockUser(@Body() blockUserDto: BlockUserDto) {
    const { userId, blockedUntil, reason } = blockUserDto;
    
    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const blockedUntilDate = blockedUntil ? new Date(blockedUntil) : undefined;
    user.blockUser(blockedUntilDate, reason);
    
    await this.userRepository.save(user);
    
    return { message: 'User blocked successfully', userId };
  }

  @Put('users/:id/unblock')
  // @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Unblock user' })
  async unblockUser(@Param('id') userId: string) {
    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.unblockUser();
    await this.userRepository.save(user);
    
    return { message: 'User unblocked successfully', userId };
  }

  @Post('users/check-unblock')
  // @UseGuards(JwtAuthGuard()) // Временно убираем для тестирования
  @ApiOperation({ summary: 'Force check and unblock expired users' })
  async forceCheckUnblockUsers() {
    await this.userUnblockSchedulerService.forceCheckUnblockUsers();
    return { message: 'Unblock check completed' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  async getStats() {
    // Получаем общее количество пользователей
    const totalUsers = await UserOrmEntity.query().count();
    
    // Получаем количество водителей (пользователи с лицензиями)
    const driversCountResult = await UserOrmEntity.query()
      .select('users.id')
      .joinRelated('categoryLicenses')
      .groupBy('users.id')
      .count();
    const totalDrivers = driversCountResult.length;

    // Получаем статистику заказов
    const totalOrders = await OrderRequestOrmEntity.query().count();
    
    const activeOrders = await OrderRequestOrmEntity.query()
      .whereIn('orderStatus', ['CREATED', 'STARTED', 'WAITING', 'ONGOING'])
      .count();
    
    const completedOrders = await OrderRequestOrmEntity.query()
      .where('orderStatus', 'COMPLETED')
      .count();
    
    const rejectedOrders = await OrderRequestOrmEntity.query()
      .whereIn('orderStatus', ['REJECTED', 'REJECTED_BY_CLIENT', 'REJECTED_BY_DRIVER'])
      .count();

    // Заказы за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await OrderRequestOrmEntity.query()
      .where('createdAt', '>=', today.toISOString())
      .count();

    // Подсчет выручки от завершенных заказов
    const revenueResult = await OrderRequestOrmEntity.query()
      .where('orderStatus', 'COMPLETED')
      .sum('price as revenue');
    const revenue = revenueResult[0]?.['sum(`price`)'] || 0;

    return {
      totalUsers: parseInt(totalUsers[0]?.['count(*)'] || '0'),
      totalDrivers: totalDrivers,
      totalOrders: parseInt(totalOrders[0]?.['count(*)'] || '0'),
      activeOrders: parseInt(activeOrders[0]?.['count(*)'] || '0'),
      completedOrders: parseInt(completedOrders[0]?.['count(*)'] || '0'),
      rejectedOrders: parseInt(rejectedOrders[0]?.['count(*)'] || '0'),
      todayOrders: parseInt(todayOrders[0]?.['count(*)'] || '0'),
      revenue: parseFloat(revenue.toString())
    };
  }
}