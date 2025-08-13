import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClusterManager } from './cluster';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
