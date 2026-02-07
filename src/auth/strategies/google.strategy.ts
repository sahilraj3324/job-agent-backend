import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private readonly usersService: UsersService) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/users/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<void> {
        const { id, emails, displayName, photos } = profile;

        const email = emails?.[0]?.value;
        const profilePicture = photos?.[0]?.value;

        if (!email) {
            done(new Error('No email found in Google profile'), undefined);
            return;
        }

        try {
            const user = await this.usersService.findOrCreateByGoogle({
                googleId: id,
                email,
                fullName: displayName || 'Unknown',
                profilePicture,
            });

            done(null, user);
        } catch (error) {
            done(error as Error, undefined);
        }
    }
}
