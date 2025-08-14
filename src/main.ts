import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      configService.get<string>('frontendUrl'),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global API prefix aligned with Plan.md: /v1
  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'r/(.*)', method: RequestMethod.ALL }],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('ToLink URL Shortener')
    .setDescription('A powerful URL shortener API')
    .setVersion('1.0')
    .addTag('URLs', 'URL shortening operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = configService.get<number>('port') || 8080;
  await app.listen(port);

  console.log(`🚀 ToLink backend is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger documentation available at: http://localhost:${port}/swagger`,
  );
}

bootstrap();
