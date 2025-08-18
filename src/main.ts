// Polyfill for crypto in Node.js
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClusterManager } from './cluster';
import * as compression from 'compression';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Оптимизации для производительности
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'debug', 'error', 'warn'],
  });

  // Включаем сжатие ответов
  app.use(compression());

  // Оптимизируем парсинг JSON и URL-encoded данных
  app.use(json({ 
    limit: '10mb',
    // Ускоряем парсинг JSON
    strict: false,
  }));
  
  app.use(urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // Увеличиваем лимиты для высоких нагрузок
  app.use((req, res, next) => {
    res.setTimeout(30000); // 30 секунд таймаут
    next();
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['X-Total-Count'],
  });

  const config = new DocumentBuilder()
    .setTitle('Taxi Service API')
    .setDescription('API documentation for the Taxi Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

// Start clustering if in production
if (process.env.NODE_ENV === 'production') {
  const clusterManager = new ClusterManager();
  clusterManager.start();
  
  // Only start the app if this is a worker process
  if (!require('cluster').isPrimary) {
    bootstrap().catch((error) => {
      console.error(`❌ Worker ${process.pid} failed to start:`, error);
      process.exit(1);
    });
  }
} else {
  // Development mode - no clustering
  bootstrap().catch((error) => {
    console.error('❌ Application failed to start:', error);
    process.exit(1);
  });
}
