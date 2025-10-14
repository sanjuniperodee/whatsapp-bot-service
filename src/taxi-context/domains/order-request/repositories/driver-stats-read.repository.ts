import { Injectable } from '@nestjs/common';
import { DriverStatsReadModel } from '../read-models/driver-stats.read-model';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class DriverStatsReadRepository {
  async getDriverStats(driverId: string): Promise<DriverStatsReadModel> {
    // Получаем сегодняшние заказы
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .where('orderStatus', OrderStatus.COMPLETED)
      .where('createdAt', '>=', today)
      .where('createdAt', '<', tomorrow);

    const todayEarnings = todayOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const todayTrips = todayOrders.length;

    // Получаем все завершенные заказы для рейтинга
    const allCompletedOrders = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .where('orderStatus', OrderStatus.COMPLETED)
      .whereNotNull('rating');

    const averageRating = allCompletedOrders.length > 0 
      ? allCompletedOrders.reduce((sum, order) => sum + (order.rating || 0), 0) / allCompletedOrders.length
      : 5.0;

    const totalTrips = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .where('orderStatus', OrderStatus.COMPLETED)
      .resultSize();

    // Получаем статистику по категориям
    const categoryStats = await this.getCategoryStats(driverId);

    // Получаем статистику по дням (последние 30 дней)
    const dailyStats = await this.getDailyStats(driverId);

    return {
      driverId,
      todayEarnings,
      todayTrips,
      totalTrips,
      averageRating: Math.round(averageRating * 10) / 10,
      acceptanceRate: 95, // TODO: Реализовать подсчет acceptance rate
      lastActiveAt: undefined, // TODO: Получить из кеша
      categoryStats,
      dailyStats,
    };
  }

  private async getCategoryStats(driverId: string) {
    const categories = await CategoryLicenseOrmEntity.query()
      .where('driverId', driverId);

    const categoryStats = [];

    for (const category of categories) {
      const orders = await OrderRequestOrmEntity.query()
        .where('driverId', driverId)
        .where('orderType', category.categoryType)
        .where('orderStatus', OrderStatus.COMPLETED);

      const trips = orders.length;
      const earnings = orders.reduce((sum, order) => sum + (order.price || 0), 0);
      const averageRating = orders.length > 0 
        ? orders.reduce((sum, order) => sum + (order.rating || 0), 0) / orders.length
        : 5.0;

      categoryStats.push({
        categoryType: category.categoryType,
        trips,
        earnings,
        averageRating: Math.round(averageRating * 10) / 10,
      });
    }

    return categoryStats;
  }

  private async getDailyStats(driverId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .where('orderStatus', OrderStatus.COMPLETED)
      .where('createdAt', '>=', thirtyDaysAgo)
      .orderBy('createdAt', 'desc');

    // Группируем по дням
    const dailyMap = new Map<string, { trips: number; earnings: number }>();

    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { trips: 0, earnings: 0 });
      }
      const dayStats = dailyMap.get(date)!;
      dayStats.trips++;
      dayStats.earnings += order.price || 0;
    }

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      trips: stats.trips,
      earnings: stats.earnings,
    }));
  }
}
