import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Очищаем таблицы
  await knex('order_requests').del();
  await knex('users').del();

  // Создаем тестовых пользователей
  const users = [];
  for (let i = 1; i <= 1000; i++) {
    users.push({
      id: `user-${i}`,
      phone: `+7${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      name: `Test User ${i}`,
      email: `test${i}@example.com`,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  await knex('users').insert(users);

  // Создаем тестовые заказы
  const orders = [];
  const statuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
  
  for (let i = 1; i <= 5000; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    orders.push({
      id: `order-${i}`,
      user_id: randomUser.id,
      status: randomStatus,
      from_address: `Test Address ${i}`,
      to_address: `Destination ${i}`,
      price: Math.floor(Math.random() * 1000) + 100,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Случайная дата за последние 30 дней
      updated_at: new Date(),
    });
  }

  await knex('order_requests').insert(orders);

  console.log('✅ Performance test data seeded successfully!');
  console.log(`📊 Created ${users.length} users and ${orders.length} orders`);
} 