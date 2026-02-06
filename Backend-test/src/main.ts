import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Валидация
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger документация
  const config = new DocumentBuilder()
    .setTitle('Fullstack Test API')
    .setDescription('API documentation for the fullstack test project')
    .setVersion('1.0')
    .addTag('auth', 'Авторизация')
    .addTag('users', 'Пользователи')
    .addTag('promo-codes', 'Промокоды (операционные данные)')
    .addTag('promo-code-usage', 'История использований промокодов')
    .addTag('orders', 'Заказы (создание и управление)')
    .addTag('analytics', 'Аналитика из ClickHouse')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
