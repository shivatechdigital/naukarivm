import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
  ) {
    const user = await this.usersService.create(
      name,
      email,
      password,
    );

    return this.generateTokens(
      user.id,
      user.email,
    );
  }

  async login(
    email: string,
    password: string,
  ) {
    const user =
      await this.usersService.validateUser(
        email,
        password,
      );

    return this.generateTokens(
      user.id,
      user.email,
    );
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret =
        this.configService.get<string>(
          'JWT_REFRESH_SECRET',
        ) || '';

      const payload =
        await this.jwtService.verifyAsync<{
          sub: string;
          email: string;
        }>(refreshToken, {
          secret,
        });

      const user =
        await this.usersService.findById(
          payload.sub,
        );

      if (!user) {
        throw new UnauthorizedException(
          'User not found',
        );
      }

      return this.generateTokens(
        user.id,
        user.email,
      );
    } catch {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }
  }

  async getProfile(userId: string) {
    const user =
      await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException(
        'User not found',
      );
    }

    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }

  private async generateTokens(
    userId: string,
    email: string,
  ) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken =
      await this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>(
            'JWT_SECRET',
          ) || '',
        expiresIn: '15m',
      });

    const refreshToken =
      await this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>(
            'JWT_REFRESH_SECRET',
          ) || '',
        expiresIn: '7d',
      });

    return {
      accessToken,
      refreshToken,
    };
  }
}
