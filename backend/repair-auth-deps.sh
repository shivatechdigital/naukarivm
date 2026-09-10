#!/bin/bash

set -e

echo "=========================================="
echo "🔧 REPAIRING NESTJS 12 AUTH DEPENDENCIES"
echo "=========================================="

echo ""
echo "🔹 Removing incompatible Auth packages..."

npm uninstall \
  @nestjs/passport \
  @nestjs/jwt \
  passport \
  passport-jwt \
  bcryptjs

echo ""
echo "🔹 Installing NestJS 12 compatible packages..."

npm install \
  @nestjs/jwt@12 \
  @nestjs/passport@12 \
  passport \
  passport-jwt \
  bcryptjs \
  class-validator \
  class-transformer

echo ""
echo "🔹 Installing TypeScript definitions..."

npm install -D @types/passport-jwt

echo ""
echo "🔹 Checking installed NestJS versions..."

npm ls \
  @nestjs/common \
  @nestjs/core \
  @nestjs/testing \
  @nestjs/jwt \
  @nestjs/passport

echo ""
echo "🔹 Generating Prisma Client..."

npx prisma generate

echo ""
echo "🔹 Building Backend..."

npm run build

echo ""
echo "=========================================="
echo "🎉 AUTH DEPENDENCIES FIXED"
echo "=========================================="

echo ""
echo "Next:"
echo "cd ~/job-auto-apply/backend"
echo "npm run start:dev"

echo "=========================================="
