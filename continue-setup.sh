#!/bin/bash

set -e

PROJECT_DIR="$HOME/job-auto-apply"

echo "=========================================="
echo "   JOB AUTO APPLY - CONTINUE SETUP"
echo "=========================================="

cd "$PROJECT_DIR"

# ==========================================================
# DOCKER
# ==========================================================

echo ""
echo ">>> Starting PostgreSQL + Redis..."

sudo docker-compose up -d

echo ""
echo ">>> Docker containers:"
sudo docker ps

# ==========================================================
# BACKEND
# ==========================================================

echo ""
echo "=========================================="
echo "          BACKEND SETUP"
echo "=========================================="

cd "$PROJECT_DIR/backend"

echo ">>> Installing NestJS CLI..."

sudo npm install -g @nestjs/cli

# Create NestJS project only if package.json doesn't exist
if [ ! -f package.json ]; then

    echo ""
    echo ">>> Creating NestJS project..."

    nest new . \
        --package-manager npm \
        --skip-git

else
    echo ""
    echo ">>> NestJS project already exists. Skipping creation."

fi

echo ""
echo ">>> Installing backend dependencies..."

npm install \
    @nestjs/config \
    @nestjs/jwt \
    @nestjs/passport \
    passport \
    passport-jwt \
    bcryptjs \
    class-validator \
    class-transformer \
    @nestjs/bull \
    bull \
    ioredis \
    prisma \
    @prisma/client

npm install -D \
    @types/passport-jwt \
    @types/bcryptjs

# ==========================================================
# ENV
# ==========================================================

echo ""
echo ">>> Creating backend .env..."

cat > .env <<'EOF'
DATABASE_URL="postgresql://jobuser:jobpass123@localhost:5432/job_auto_apply"

JWT_SECRET="change-this-super-secret-key"
JWT_REFRESH_SECRET="change-this-refresh-secret"

REDIS_HOST="localhost"
REDIS_PORT=6379

PORT=3001
FRONTEND_URL="http://localhost:5173"
EOF

# ==========================================================
# PRISMA
# ==========================================================

echo ""
echo ">>> Initializing Prisma..."

mkdir -p prisma

cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  profile      Profile?
  jobs         Job[]
  applications Application[]

  @@map("users")
}

model Profile {
  id              String  @id @default(uuid())
  userId          String  @unique
  experience      Float?
  currentCompany  String?
  currentCtc      Float?
  expectedCtc     Float?
  noticePeriod    String?
  skills          String?
  location        String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Job {
  id            String   @id @default(uuid())
  source        String
  externalJobId String?
  title         String
  company       String?
  location      String?
  experience    String?
  salary        String?
  description   String?
  url           String?
  postedDate    DateTime?
  createdAt     DateTime @default(now())

  userId String?
  user   User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  applications Application[]

  @@index([source])
  @@index([title])
  @@map("jobs")
}

model Application {
  id           String   @id @default(uuid())
  userId       String
  jobId        String
  status       String   @default("PENDING")
  matchScore   Float?
  appliedAt    DateTime?
  errorMessage String?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  job  Job  @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([userId, jobId])
  @@map("applications")
}
EOF

echo ""
echo ">>> Generating Prisma Client..."

npx prisma generate

echo ""
echo ">>> Updating PostgreSQL schema..."

npx prisma db push

# ==========================================================
# NEST MODULES
# ==========================================================

echo ""
echo ">>> Creating NestJS modules..."

nest g module auth --no-spec || true
nest g module users --no-spec || true
nest g module profiles --no-spec || true
nest g module jobs --no-spec || true
nest g module applications --no-spec || true
nest g module automation --no-spec || true

nest g controller auth --no-spec || true
nest g service auth --no-spec || true
nest g service users --no-spec || true

# ==========================================================
# PRISMA SERVICE
# ==========================================================

echo ""
echo ">>> Creating Prisma service..."

mkdir -p src/prisma

cat > src/prisma/prisma.service.ts <<'EOF'
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
EOF

cat > src/prisma/prisma.module.ts <<'EOF'
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
EOF

# ==========================================================
# APP MODULE
# ==========================================================

echo ""
echo ">>> Configuring AppModule..."

cat > src/app.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { AutomationModule } from './automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,
    UsersModule,
    ProfilesModule,
    JobsModule,
    ApplicationsModule,
    AutomationModule,
  ],
})
export class AppModule {}
EOF

# ==========================================================
# MAIN TS
# ==========================================================

echo ""
echo ">>> Configuring main.ts..."

cat > src/main.ts <<'EOF'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;

  await app.listen(port);

  console.log(
    `🚀 Backend running on http://localhost:${port}/api`,
  );
}

bootstrap();
EOF

# ==========================================================
# BACKEND BUILD TEST
# ==========================================================

echo ""
echo ">>> Testing backend build..."

npm run build

echo ""
echo "✅ Backend build successful!"

# ==========================================================
# WORKER
# ==========================================================

echo ""
echo "=========================================="
echo "          WORKER SETUP"
echo "=========================================="

cd "$PROJECT_DIR/worker"

if [ ! -f package.json ]; then
    echo ">>> Initializing worker..."

    npm init -y
fi

echo ""
echo ">>> Installing worker dependencies..."

npm install \
    bull \
    ioredis \
    playwright \
    dotenv

npm install -D \
    typescript \
    @types/node \
    ts-node

# ==========================================================
# WORKER DIRECTORIES
# ==========================================================

mkdir -p src/queues
mkdir -p src/processors
mkdir -p src/playwright

# ==========================================================
# WORKER TYPESCRIPT CONFIG
# ==========================================================

echo ""
echo ">>> Creating worker tsconfig.json..."

cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

# ==========================================================
# WORKER ENV
# ==========================================================

cat > .env <<'EOF'
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://jobuser:jobpass123@localhost:5432/job_auto_apply
EOF

# ==========================================================
# WORKER INDEX
# ==========================================================

echo ""
echo ">>> Creating worker..."

cat > src/index.ts <<'EOF'
import dotenv from 'dotenv';

dotenv.config();

import { Queue } from 'bull';

const redisUrl =
  process.env.REDIS_URL || 'redis://localhost:6379';

const jobQueue = new Queue(
  'naukri-jobs',
  redisUrl,
);

async function startWorker() {
  console.log('🤖 Worker started...');

  jobQueue.process(
    'search-and-apply',
    async (job) => {
      console.log(`Processing job: ${job.id}`);
      console.log(`User: ${job.data.userId}`);

      /*
       * Naukri automation will be implemented here.
       *
       * 1. Load browser session
       * 2. Open Playwright
       * 3. Search jobs
       * 4. Filter jobs
       * 5. Match profile
       * 6. Apply
       */

      return {
        status: 'completed',
      };
    },
  );

  console.log(
    '✅ Worker listening for jobs...',
  );
}

startWorker().catch((error) => {
  console.error('Worker failed:', error);
  process.exit(1);
});
EOF

# ==========================================================
# PLAYWRIGHT
# ==========================================================

echo ""
echo ">>> Installing Playwright Chromium..."

npx playwright install chromium

echo ""
echo ">>> Installing Playwright system dependencies..."

sudo npx playwright install-deps chromium

# ==========================================================
# WORKER BUILD
# ==========================================================

echo ""
echo ">>> Building worker..."

npx tsc

echo ""
echo "✅ Worker build successful!"

# ==========================================================
# FINAL STATUS
# ==========================================================

cd "$PROJECT_DIR"

echo ""
echo "=========================================="
echo "       SETUP COMPLETED SUCCESSFULLY"
echo "=========================================="

echo ""
echo "Project:"
echo "$PROJECT_DIR"

echo ""
echo "Docker:"
sudo docker ps

echo ""
echo "Frontend:"
if [ -f frontend/package.json ]; then
    echo "✅ React + Vite"
else
    echo "❌ Frontend missing"
fi

echo ""
echo "Backend:"
if [ -f backend/package.json ]; then
    echo "✅ NestJS"
else
    echo "❌ Backend missing"
fi

echo ""
echo "Database:"
echo "✅ PostgreSQL"

echo ""
echo "Cache/Queue:"
echo "✅ Redis"

echo ""
echo "Worker:"
if [ -f worker/dist/index.js ]; then
    echo "✅ Worker compiled"
else
    echo "❌ Worker build failed"
fi

echo ""
echo "Playwright:"
echo "✅ Chromium installed"

echo ""
echo "=========================================="
echo "          HOW TO START"
echo "=========================================="

echo ""
echo "Terminal 1 - Backend:"
echo "cd ~/job-auto-apply/backend"
echo "npm run start:dev"

echo ""
echo "Terminal 2 - Frontend:"
echo "cd ~/job-auto-apply/frontend"
echo "npm run dev -- --host 0.0.0.0"

echo ""
echo "Terminal 3 - Worker:"
echo "cd ~/job-auto-apply/worker"
echo "npx ts-node src/index.ts"

echo ""
echo "Frontend:"
echo "http://localhost:5173"

echo ""
echo "Backend:"
echo "http://localhost:3001/api"

echo ""
echo "=========================================="
echo "       READY FOR DEVELOPMENT 🚀"
echo "=========================================="
