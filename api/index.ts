import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';

let app: NestExpressApplication;

async function getApp(): Promise<NestExpressApplication> {
    if (!app) {
        app = await NestFactory.create<NestExpressApplication>(AppModule);

        // Cookie parser middleware
        app.use(cookieParser());

        app.enableCors({
            origin: [
                'http://localhost:3000',
                'http://localhost:3001',
                'https://job-agent.vercel.app',
                'https://job-agent-lovat.vercel.app',
            ],
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

        await app.init();
    }
    return app;
}

export default async (req: any, res: any) => {
    const app = await getApp();
    const server = app.getHttpAdapter().getInstance();
    return server(req, res);
};
