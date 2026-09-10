#!/bin/bash

set -e

echo "=============================================="
echo " Job Auto Apply - Profile Schema Fix"
echo " Prisma 6 + PostgreSQL"
echo "=============================================="

cd "$(dirname "$0")"

SCHEMA="prisma/schema.prisma"
BACKUP="prisma/schema.prisma.backup-$(date +%Y%m%d-%H%M%S)"

echo ""
echo "📦 Backing up current Prisma schema..."
cp "$SCHEMA" "$BACKUP"
echo "✅ Backup created: $BACKUP"

echo ""
echo "📝 Writing compatible Prisma schema..."

cat > "$SCHEMA" <<'PRISMA'
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

  profile        Profile?
  preferences    JobPreference?
  jobs           Job[]
  applications   Application[]

  @@map("users")
}

model Profile {
  id                String   @id @default(uuid())
  userId            String   @unique

  phone             String?
  dateOfBirth       DateTime?
  gender            String?

  currentCompany    String?
  currentTitle      String?

  experience        Float?
  experienceYears   Float?

  currentCtc        Float?
  expectedCtc       Float?

  noticePeriod      String?

  skills            String[] @default([])

  education         Json?
  certifications    String[] @default([])

  location          String?
  currentCity       String?
  preferredCities   String[] @default([])

  willingToRelocate Boolean  @default(false)

  resumeUrl         String?
  resumeText        String?

  naukriProfileUrl  String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model JobPreference {
  id                    String   @id @default(uuid())
  userId                String   @unique

  jobTitles             String[] @default([])
  keywords              String[] @default([])
  locations             String[] @default([])

  experienceMin         Float?
  experienceMax         Float?

  salaryMin             Float?
  salaryMax             Float?

  jobTypes              String[] @default([])
  industries            String[] @default([])
  companySizes          String[] @default([])

  excludedCompanies     String[] @default([])
  excludedKeywords      String[] @default([])
  blacklistJobIds       String[] @default([])

  isActive              Boolean  @default(true)

  maxApplicationsPerDay Int      @default(20)
  matchScoreThreshold   Float    @default(60)

  cronExpression        String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("job_preferences")
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
PRISMA

echo "✅ Prisma schema updated"

echo ""
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️ Updating database..."
npx prisma db push

echo ""
echo "🧹 Cleaning old build..."
rm -rf dist

echo ""
echo "🧪 Building backend..."
npm run build

echo ""
echo "=============================================="
echo " ✅ PROFILE + PREFERENCES SCHEMA FIXED"
echo "=============================================="
echo ""
echo "Next:"
echo "  npm run start:dev"
echo ""
