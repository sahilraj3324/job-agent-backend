import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                // Extract from cookie first
                (request: Request) => {
                    return request?.cookies?.access_token || null;
                },
                // Fallback to Authorization header
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        });
    }

    async validate(payload: { sub: string; email: string }) {
        try {
            const user = await this.usersService.findById(payload.sub);
            return user;
        } catch {
            throw new UnauthorizedException('User not found');
        }
    }
}
