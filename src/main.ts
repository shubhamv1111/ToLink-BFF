import { setDefaultResultOrder } from 'dns';
import * as https from 'https';
setDefaultResultOrder('ipv4first');
// Force IPv4 for all outgoing HTTPS connections; prevents ETIMEDOUT on IPv6
// when passport-oauth2 exchanges the authorization code for an access token.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(https as any).globalAgent = new https.Agent({ family: 4 });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      configService.get<string>('frontendUrl'),
      'http://localhost:4000',
      'http://127.0.0.1:4000',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Parse cookies for httpOnly JWT session
  app.use(cookieParser());

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
    exclude: [{ path: 'r/:shortCode', method: RequestMethod.ALL }],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('ToLink URL Shortener')
    .setDescription('A powerful URL shortener API')
    .setVersion('1.0')
    .addTag('App', 'App info and root')
    .addTag('Authentication', 'Cookie-based auth endpoints')
    .addTag('URLs', 'URL shortening operations')
    .addTag('Redirection', 'Public redirection endpoint')
    .addCookieAuth('tolink_session')
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
