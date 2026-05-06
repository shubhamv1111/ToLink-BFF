import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

const GOOGLE_NOT_CONFIGURED = 'GOOGLE_OAUTH_NOT_CONFIGURED';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly googleConfigured: boolean;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    const callbackURL = configService.get<string>('google.callbackUrl');

    super({
      clientID: clientID || GOOGLE_NOT_CONFIGURED,
      clientSecret: clientSecret || GOOGLE_NOT_CONFIGURED,
      callbackURL: callbackURL || 'http://localhost:8080/auth/google/callback',
      scope: ['email', 'profile'],
    });

    this.googleConfigured = !!(clientID && clientSecret);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    if (!this.googleConfigured) {
      return done(
        new UnauthorizedException('Google OAuth is not configured'),
        false,
      );
    }

    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      profilePhoto: photos[0]?.value,
    };
    done(null, user);
  }
}

