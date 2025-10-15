import { Knex } from 'knex';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';
import { UserFactory } from './factories/user.factory';
import { OrderFactory } from './factories/order.factory';
import { CategoryFactory } from './factories/category.factory';

export class DatabaseHelper {
  private static knex: Knex;

  static initialize(knex: Knex) {
    this.knex = knex;
  }

  static async cleanDatabase(): Promise<void> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    // Delete in reverse order of dependencies
    await this.knex('order_request').del();
    await this.knex('category_license').del();
    await this.knex('users').del();
  }

  static async createTestUser(userData?: any): Promise<UserOrmEntity> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    const user = UserFactory.create(userData);
    const userOrm = UserOrmEntity.create({
      id: user.id.value,
      phone: user.phone.value,
      firstName: user.getPropsCopy().firstName,
      lastName: user.getPropsCopy().lastName,
      middleName: user.getPropsCopy().middleName,
      birthDate: user.getPropsCopy().birthDate,
      deviceToken: user.getPropsCopy().deviceToken,
      isBlocked: user.getPropsCopy().isBlocked || false,
      blockedUntil: user.getPropsCopy().blockedUntil,
      blockReason: user.getPropsCopy().blockReason,
    });

    await this.knex('users').insert(userOrm);
    return userOrm;
  }

  static async createTestOrder(orderData?: any): Promise<OrderRequestOrmEntity> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    const order = OrderFactory.create(orderData);
    const orderOrm = OrderRequestOrmEntity.create({
      id: order.id.value,
      clientId: order.getPropsCopy().clientId.value,
      driverId: order.getPropsCopy().driverId?.value,
      orderType: order.getPropsCopy().orderType,
      orderStatus: order.getPropsCopy().orderStatus,
      from: order.getPropsCopy().from,
      to: order.getPropsCopy().to,
      fromMapboxId: order.getPropsCopy().fromMapboxId,
      toMapboxId: order.getPropsCopy().toMapboxId,
      lat: order.getPropsCopy().lat,
      lng: order.getPropsCopy().lng,
      price: order.getPropsCopy().price.value,
      comment: order.getPropsCopy().comment,
      startTime: order.getPropsCopy().startTime,
      arrivalTime: order.getPropsCopy().arrivalTime,
    });

    await this.knex('order_request').insert(orderOrm);
    return orderOrm;
  }

  static async createTestCategory(categoryData?: any): Promise<CategoryLicenseOrmEntity> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    const category = CategoryFactory.create(categoryData);
    const categoryOrm = CategoryLicenseOrmEntity.create({
      id: global.testUtils.generateTestUUID(),
      ...category,
    });

    await this.knex('category_license').insert(categoryOrm);
    return categoryOrm;
  }

  // Order management methods
  static async acceptOrder(orderId: string, driverId: string): Promise<void> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    await this.knex('order_request')
      .where('id', orderId)
      .update({
        driverId,
        orderStatus: 'STARTED',
        updatedAt: new Date(),
      });
  }

  static async getOrderById(orderId: string): Promise<OrderRequestOrmEntity | null> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    const order = await this.knex('order_request')
      .where('id', orderId)
      .first();

    return order || null;
  }

  static async updateOrderStatus(orderId: string, status: string): Promise<void> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    await this.knex('order_request')
      .where('id', orderId)
      .update({
        orderStatus: status,
        updatedAt: new Date(),
      });
  }

  static async cancelOrder(orderId: string, reason: string): Promise<void> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    await this.knex('order_request')
      .where('id', orderId)
      .update({
        orderStatus: 'REJECTED',
        rejectReason: reason,
        updatedAt: new Date(),
      });
  }

  static async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    // This would typically update a driver location table
    // For now, we'll just log it
    console.log(`Driver ${driverId} location updated: ${lat}, ${lng}`);
  }

  static async getOrdersByStatus(status: string): Promise<OrderRequestOrmEntity[]> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    return await this.knex('order_request')
      .where('orderStatus', status);
  }

  static async getOrdersByClientId(clientId: string): Promise<OrderRequestOrmEntity[]> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    return await this.knex('order_request')
      .where('clientId', clientId);
  }

  static async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<OrderRequestOrmEntity[]> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    return await this.knex('order_request')
      .whereBetween('createdAt', [startDate, endDate]);
  }

  static async getOrdersByPriceRange(minPrice: number, maxPrice: number): Promise<OrderRequestOrmEntity[]> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    return await this.knex('order_request')
      .whereBetween('price', [minPrice, maxPrice]);
  }

  static async createTestScenario(scenario: 'client-driver-order' | 'blocked-user' | 'multiple-orders'): Promise<any> {
    switch (scenario) {
      case 'client-driver-order':
        const client = await this.createTestUser(UserFactory.createClient());
        const driver = await this.createTestUser(UserFactory.createDriver());
        const order = await this.createTestOrder({
          clientId: new (await import('@libs/ddd/domain/value-objects/uuid.value-object')).UUID(client.id),
          driverId: new (await import('@libs/ddd/domain/value-objects/uuid.value-object')).UUID(driver.id),
        });
        return { client, driver, order };

      case 'blocked-user':
        const blockedUser = await this.createTestUser(UserFactory.createBlockedUser());
        return { blockedUser };

      case 'multiple-orders':
        const user1 = await this.createTestUser(UserFactory.createClient());
        const user2 = await this.createTestUser(UserFactory.createDriver());
        const order1 = await this.createTestOrder({
          clientId: new (await import('@libs/ddd/domain/value-objects/uuid.value-object')).UUID(user1.id),
          orderStatus: 'CREATED',
        });
        const order2 = await this.createTestOrder({
          clientId: new (await import('@libs/ddd/domain/value-objects/uuid.value-object')).UUID(user1.id),
          orderStatus: 'COMPLETED',
        });
        return { user1, user2, order1, order2 };

      default:
        throw new Error(`Unknown test scenario: ${scenario}`);
    }
  }

  static async getTableCount(tableName: string): Promise<number> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    const result = await this.knex(tableName).count('* as count').first();
    return parseInt(result.count as string);
  }

  static async findUserByPhone(phone: string): Promise<UserOrmEntity | null> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    return await this.knex('users').where('phone', phone).first();
  }

  static async findOrderById(id: string): Promise<OrderRequestOrmEntity | null> {
    if (!this.knex) {
      throw new Error('DatabaseHelper not initialized. Call initialize() first.');
    }

    return await this.knex('order_request').where('id', id).first();
  }
}
