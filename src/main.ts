import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware
  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://job-agent.vercel.app', 'https://job-agent-lovat.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Job Agent API')
    .setDescription('API documentation for Job Agent application')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 4000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 4000}`);
  console.log(`📚 Swagger UI: http://localhost:${process.env.PORT ?? 4000}/api`);
}
bootstrap();
