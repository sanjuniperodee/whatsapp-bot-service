import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Res, Query, Param } from '@nestjs/common';
import { Response } from 'express';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('admin')
export class ClientOrderRequestController {
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
      users = await UserOrmEntity.query().findByIds(ids);
      totalCount = users.length;
    } else {
      // Handle pagination and sorting
      const start = Number(_start) || 0;
      const end = Number(_end) || 10;
      const limit = end - start;

      const baseQuery = UserOrmEntity.query().withGraphFetched('orders')
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
  @ApiOperation({ summary: 'Get clients' })
  async getDrivers(
    @Res({ passthrough: true }) res: Response,
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
      users = await UserOrmEntity.query().findByIds(ids);
      totalCount = users.length;
    } else {
      // Handle pagination and sorting
      const start = Number(_start) || 0;
      const end = Number(_end) || 10;
      const limit = end - start;

      const baseQuery = UserOrmEntity.query().withGraphFetched({orders: true});

      // Get total count before pagination
      const totalCountResult = await baseQuery.clone();
      totalCount = totalCountResult.length;

      // Apply sorting
      baseQuery.orderBy(_sort, _order);

      // Apply pagination
      users = await baseQuery.offset(start).limit(limit);
    }

    // Set the X-Total-Count header
    res.setHeader('X-Total-Count', String(totalCount));

    return users;
  }

  @Get('clients/:id')
  async getUser(@Param('id') id: string) {
    return UserOrmEntity.query().findById(id);
  }
}