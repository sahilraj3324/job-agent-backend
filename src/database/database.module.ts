import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-agent'),
    ],
})
export class DatabaseModule implements OnModuleInit {
    private readonly logger = new Logger(DatabaseModule.name);

    constructor(@InjectConnection() private readonly connection: Connection) { }

    onModuleInit() {
        this.connection.on('connected', () => {
            this.logger.log('✅ MongoDB connected successfully');
        });

        this.connection.on('error', (error) => {
            this.logger.error('❌ MongoDB connection error:', error);
        });

        this.connection.on('disconnected', () => {
            this.logger.warn('⚠️ MongoDB disconnected');
        });

        // Log current state
        if (this.connection.readyState === 1) {
            this.logger.log(`✅ MongoDB connected to: ${this.connection.host}:${this.connection.port}/${this.connection.name}`);
        }
    }
}
