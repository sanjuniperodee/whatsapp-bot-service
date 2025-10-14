export interface DriverStatsReadModel {
  driverId: string;
  todayEarnings: number;
  todayTrips: number;
  totalTrips: number;
  averageRating: number;
  acceptanceRate: number;
  lastActiveAt?: Date;
  
  // Статистика по категориям
  categoryStats: {
    categoryType: string;
    trips: number;
    earnings: number;
    averageRating: number;
  }[];
  
  // Статистика по дням (последние 30 дней)
  dailyStats: {
    date: string;
    trips: number;
    earnings: number;
  }[];
}
