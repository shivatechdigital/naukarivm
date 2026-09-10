#!/bin/bash

set -e

PROJECT="$HOME/job-auto-apply"
BACKEND="$PROJECT/backend"

echo "=========================================="
echo "🔐 JOB AUTO APPLY - AUTH SETUP"
echo "=========================================="

cd "$BACKEND"

# ------------------------------------------
# 1. Backup existing auth/users
# ------------------------------------------
echo ""
echo "🔹 [1/8] Creating backup..."

BACKUP="$BACKEND/auth-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

[ -d src/auth ] && cp -r src/auth "$BACKUP/" || true
[ -d src/users ] && cp -r src/users "$BACKUP/" || true

echo "✅ Backup: $BACKUP"

# ------------------------------------------
# 2. Install dependencies
# ------------------------------------------
echo ""
echo "🔹 [2/8] Installing Auth dependencies..."

npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs class-validator class-transformer

npm install -D @types/passport-jwt

echo "✅ Dependencies installed"

# ------------------------------------------
# 3. Create directories
# ------------------------------------------
echo ""
echo "🔹 [3/8] Creating Auth structure..."

mkdir -p src/auth/dto
mkdir -p src/auth/guards
mkdir -p src/auth/strategies
mkdir -p src/users

# ------------------------------------------
# 4. Register DTO
# ------------------------------------------
echo ""
echo "🔹 [4/8] Creating DTOs..."

cat > src/auth/dto/register.dto.ts <<'FILE'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Name zaroori hai' })
  @MinLength(2, { message: 'Name kam se kam 2 characters ka hona chahiye' })
  @MaxLength(50)
  name: string;

  @IsEmail({}, { message: 'Valid email daalo bhai' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password kam se kam 8 characters ka hona chahiye' })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password me 1 uppercase, 1 lowercase, 1 number zaroori hai',
  })
  password: string;
}
FILE

cat > src/auth/dto/login.dto.ts <<'FILE'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Valid email daalo' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
FILE

cat > src/auth/dto/refresh-token.dto.ts <<'FILE'
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
FILE

# ------------------------------------------
# 5. Users Service + Module
# ------------------------------------------
cat > src/users/users.service.ts <<'FILE'
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, email: string, password: string) {
    const normalizedEmail = email.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Yeh email pehle se registered hai');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User nahi mila');
    }

    return user;
  }

  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
FILE

cat > src/users/users.module.ts <<'FILE'
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
FILE

# ------------------------------------------
# 6. JWT Strategy + Guard
# ------------------------------------------
cat > src/auth/strategies/jwt.strategy.ts <<'FILE'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User active nahi hai');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
FILE

cat > src/auth/guards/jwt-auth.guard.ts <<'FILE'
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
FILE

# ------------------------------------------
# 7. Auth Service + Controller + Module
# ------------------------------------------
cat > src/auth/auth.service.ts <<'FILE'
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(
      dto.name,
      dto.email,
      dto.password,
    );

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      message: 'Registration successful! 🎉',
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ya password galat hai');
    }

    const isPasswordValid = await this.usersService.verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ya password galat hai');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account deactivated hai. Support se contact karo.',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      message: 'Login successful! 👋',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || '',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = await this.generateTokens(user.id, user.email);

      return {
        message: 'Token refreshed ✅',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        hasProfile: !!user.profile,
        hasPreferences: !!user.preferences,
      },
    };
  }

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          type: 'access',
        },
        {
          secret: this.configService.get<string>('JWT_SECRET') || '',
          expiresIn: '15m',
        },
      ),

      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          type: 'refresh',
        },
        {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') || '',
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
FILE

cat > src/auth/auth.controller.ts <<'FILE'
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
FILE

cat > src/auth/auth.module.ts <<'FILE'
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || '',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
FILE

# ------------------------------------------
# 8. Environment + Build + Test
# ------------------------------------------
echo ""
echo "🔹 [8/8] Updating environment..."

ENV_FILE="$BACKEND/.env"

touch "$ENV_FILE"

grep -q '^JWT_SECRET=' "$ENV_FILE" || \
echo 'JWT_SECRET="change-this-super-secret-access-key"' >> "$ENV_FILE"

grep -q '^JWT_REFRESH_SECRET=' "$ENV_FILE" || \
echo 'JWT_REFRESH_SECRET="change-this-super-secret-refresh-key"' >> "$ENV_FILE"

grep -q '^PORT=' "$ENV_FILE" || \
echo 'PORT=3001' >> "$ENV_FILE"

grep -q '^FRONTEND_URL=' "$ENV_FILE" || \
echo 'FRONTEND_URL="http://localhost:5173"' >> "$ENV_FILE"

echo "✅ Environment ready"

echo ""
echo "🔹 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔹 Building backend..."
npm run build

echo ""
echo "=========================================="
echo "🎉 AUTH SETUP SUCCESSFUL"
echo "=========================================="

echo ""
echo "Available endpoints:"
echo "  POST http://localhost:3001/api/auth/register"
echo "  POST http://localhost:3001/api/auth/login"
echo "  POST http://localhost:3001/api/auth/refresh"
echo "  GET  http://localhost:3001/api/auth/profile"

echo ""
echo "Backup:"
echo "  $BACKUP"

echo ""
echo "Next:"
echo "  npm run start:dev"

echo "=========================================="
