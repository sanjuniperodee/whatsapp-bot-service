import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src/services/cloud-cache-storage.service';

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
    @InjectRepository(OrderRequestOrmEntity)
    private readonly orderRepository: Repository<OrderRequestOrmEntity>,
    private readonly cacheService: CloudCacheStorageService,
  ) {}

  async simpleDbQuery() {
    const startTime = Date.now();
    
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(*)', 'count')
      .getRawOne();
    
    const endTime = Date.now();
    
    return {
      result,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async complexDbQuery() {
    const startTime = Date.now();
    
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .select([
        'order.id',
        'order.status',
        'order.createdAt',
        'user.id',
        'user.phone',
      ])
      .orderBy('order.createdAt', 'DESC')
      .limit(100)
      .getMany();
    
    const endTime = Date.now();
    
    return {
      count: result.length,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async cacheTest() {
    const startTime = Date.now();
    const key = 'performance:test';
    const testData = {
      message: 'Cached data',
      timestamp: new Date().toISOString(),
      random: Math.random(),
    };

    // Set cache
    await this.cacheService.setValueWithExp(key, testData, 60);
    
    // Get from cache
    const cachedData = await this.cacheService.getValue(key);
    
    const endTime = Date.now();
    
    return {
      cachedData,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async heavyComputation(iterations: number) {
    const startTime = Date.now();
    
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    
    const endTime = Date.now();
    
    return {
      result: result.toFixed(6),
      iterations,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async memoryTest() {
    const startTime = Date.now();
    
    // Создаем большой массив для тестирования памяти
    const largeArray = new Array(10000).fill(null).map((_, i) => ({
      id: i,
      data: `test-data-${i}`,
      timestamp: new Date().toISOString(),
    }));
    
    const memoryUsage = process.memoryUsage();
    const endTime = Date.now();
    
    return {
      arraySize: largeArray.length,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      },
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async createTestData(count: number) {
    const startTime = Date.now();
    
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = this.userRepository.create({
        phone: `+7${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        firstName: `Test`,
        lastName: `User${i}`,
        isBlocked: false,
      });
      users.push(user);
    }
    
    await this.userRepository.save(users);
    
    const endTime = Date.now();
    
    return {
      created: users.length,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async getUserById(id: string) {
    const startTime = Date.now();
    
    const user = await this.userRepository.findOne({ where: { id } });
    
    const endTime = Date.now();
    
    return {
      user,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async getUsers(limit: number, offset: number) {
    const startTime = Date.now();
    
    const [users, total] = await this.userRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    
    const endTime = Date.now();
    
    return {
      users,
      total,
      limit,
      offset,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async getOrders(limit: number, offset: number) {
    const startTime = Date.now();
    
    const [orders, total] = await this.orderRepository.findAndCount({
      take: limit,
      skip: offset,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    
    const endTime = Date.now();
    
    return {
      orders,
      total,
      limit,
      offset,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  async getStats() {
    const startTime = Date.now();
    
    const [userCount, orderCount] = await Promise.all([
      this.userRepository.count(),
      this.orderRepository.count(),
    ]);
    
    const memoryUsage = process.memoryUsage();
    const endTime = Date.now();
    
    return {
      stats: {
        users: userCount,
        orders: orderCount,
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      },
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }
} 