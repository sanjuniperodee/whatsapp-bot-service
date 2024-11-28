import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',  // Allow requests from any origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow specific methods
    credentials: true, // Allow cookies and authentication headers
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


  await app.listen(3001);
}

bootstrap();
