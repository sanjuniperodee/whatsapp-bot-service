import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { JwtAuthGuard } from '@infrastructure/guards';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('admin/order-requests')
export class AdminOrderRequestController {
  @Get()
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get completed orders' })
  async getOrders(
    @Query('orderType') orderType: number,
    @Query('orderStatus') orderStatus: number,
    @Query('clientId') clientId: string,
    @Query('_start') _start: number,
    @Query('_end') _end: number,
    @Query('_sort') _sort = 'id',
    @Query('_order') _order: 'ASC' | 'DESC' = 'ASC',
    @Res({ passthrough: true }) res: Response
  ) {
    // Ensure _start and _end are numbers
    const start = Number(_start) || 0;
    const end = Number(_end) || 10;
    const limit = end - start;

    // Build the base query
    const baseQuery = OrderRequestOrmEntity.query()

    if(orderStatus)
      baseQuery.where({'orderStatus': orderStatus});

    if(orderType)
      baseQuery.where({'orderType': orderType});

    if(clientId)
      baseQuery.where({'clientId': clientId});

    // Get total count before pagination
    const totalCountResult = await baseQuery.clone()
    const totalCount = totalCountResult.length;

    // Apply sorting
    baseQuery.orderBy(_sort, _order);

    // Apply pagination using offset and limit
    baseQuery.offset(start).limit(limit);

    // Execute the query to get paginated data
    const orderRequests = await baseQuery;

    // Set the X-Total-Count header
    res.setHeader('X-Total-Count', totalCount);

    // Optionally, set Access-Control-Expose-Headers if not set globally
    res.header('Access-Control-Expose-Headers', 'X-Total-Count');

    return orderRequests;
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return OrderRequestOrmEntity.query().findById(id);
  }
}
