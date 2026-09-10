#!/bin/bash

set -e

echo "========================================="
echo " Job Auto Apply - Auth Setup"
echo " NestJS 12 + Prisma 6 + JWT"
echo "========================================="

cd "$(dirname "$0")"

echo ""
echo "📦 Checking dependencies..."

npm install @nestjs/jwt@12 @nestjs/passport@12 @nestjs/config@12 passport passport-jwt bcryptjs class-validator class-transformer

npm install -D @types/passport-jwt @types/bcryptjs

echo ""
echo "📁 Creating Auth and Users directories..."

mkdir -p src/auth/dto
mkdir -p src/auth/guards
mkdir -p src/auth/strategies
mkdir -p src/users

echo ""
echo "👤 Creating UsersService..."

cat > src/users/users.service.ts <<'TS'
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    name: string,
    email: string,
    password: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        preferences: true,
      },
    });
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.verifyPassword(
      password,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}
TS

echo "📦 Creating UsersModule..."

cat > src/users/users.module.ts <<'TS'
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
TS

echo "📝 Creating Register DTO..."

cat > src/auth/dto/register.dto.ts <<'TS'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
TS

echo "📝 Creating Login DTO..."

cat > src/auth/dto/login.dto.ts <<'TS'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
TS

echo "📝 Creating Refresh Token DTO..."

cat > src/auth/dto/refresh-token.dto.ts <<'TS'
import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
TS

echo "🔐 Creating JWT Strategy..."

cat > src/auth/strategies/jwt.strategy.ts <<'TS'
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
TS

echo "🛡️ Creating JWT Guard..."

cat > src/auth/guards/jwt-auth.guard.ts <<'TS'
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
TS

echo "🔑 Creating AuthService..."

cat > src/auth/auth.service.ts <<'TS'
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
TS

echo "🎮 Creating AuthController..."

cat > src/auth/auth.controller.ts <<'TS'
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(
      dto.name,
      dto.email,
      dto.password,
    );
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(
      dto.email,
      dto.password,
    );
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refreshToken(
      dto.refreshToken,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.getProfile(
      req.user.userId,
    );
  }
}
TS

echo "🧩 Creating AuthModule..."

cat > src/auth/auth.module.ts <<'TS'
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
TS

echo ""
echo "🧱 Checking PrismaService..."

if [ ! -f src/prisma.service.ts ]; then
  echo "❌ src/prisma.service.ts not found."
  echo ""
  echo "Your project needs a PrismaService before Auth can compile."
  echo "Please show:"
  echo "  find src -maxdepth 2 -type f | sort"
  exit 1
fi

echo "✅ PrismaService found."

echo ""
echo "🔧 Updating AppModule..."

cat > src/app.module.ts <<'TS'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

export const {
  ObserveModule,
  ObserveInstrument,
} = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ObserveModule.forRoot({
      appKey:
        process.env.OBSERVE_APP_KEY ||
        'YOUR_APP_KEY',
      appSecret:
        process.env.OBSERVE_APP_SECRET ||
        'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),

    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
TS

echo ""
echo "🔧 Updating main.ts..."

cat > src/main.ts <<'TS'
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    {
      instrument: ObserveInstrument,
    },
  );

  app.setGlobalPrefix('api');

  const port =
    Number(process.env.PORT) || 3001;

  await app.listen(
    port,
    '0.0.0.0',
  );

  console.log(
    `🚀 Backend running on http://localhost:${port}`,
  );
}

bootstrap();
TS

echo ""
echo "🔐 Checking JWT environment variables..."

touch .env

grep -q '^JWT_SECRET=' .env || \
  echo 'JWT_SECRET="change-this-super-secret-key"' >> .env

grep -q '^JWT_REFRESH_SECRET=' .env || \
  echo 'JWT_REFRESH_SECRET="change-this-refresh-secret"' >> .env

grep -q '^PORT=' .env || \
  echo 'PORT=3001' >> .env

echo "✅ JWT/PORT environment variables checked."

echo ""
echo "🧪 Building backend..."

npx prisma generate

npm run build

echo ""
echo "========================================="
echo "✅ AUTH SETUP COMPLETED"
echo "========================================="
echo ""
echo "Available endpoints:"
echo ""
echo "POST  /api/auth/register"
echo "POST  /api/auth/login"
echo "POST  /api/auth/refresh"
echo "GET   /api/auth/profile"
echo ""
echo "Start backend:"
echo "npm run start:dev"
echo ""
