import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard, GoogleAuthGuard } from './guards';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            signOptions: { expiresIn: '7d' },
        }),
        forwardRef(() => UsersModule),
    ],
    providers: [JwtStrategy, GoogleStrategy, JwtAuthGuard, GoogleAuthGuard],
    exports: [JwtModule, PassportModule, JwtAuthGuard, GoogleAuthGuard],
})
export class AuthModule { }
