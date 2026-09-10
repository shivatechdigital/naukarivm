#!/bin/bash

set -e

echo "=========================================="
echo "🔧 FIXING NESTJS DEPENDENCIES"
echo "=========================================="

echo ""
echo "🔹 Removing old NestJS testing package..."

npm uninstall @nestjs/testing

echo ""
echo "🔹 Installing NestJS 12 compatible testing package..."

npm install -D @nestjs/testing@12

echo ""
echo "🔹 Installing Auth dependencies..."

npm install \
  @nestjs/jwt@12 \
  @nestjs/passport@11 \
  passport \
  passport-jwt \
  bcryptjs \
  class-validator \
  class-transformer

echo ""
echo "🔹 Installing JWT TypeScript definitions..."

npm install -D @types/passport-jwt

echo ""
echo "🔹 Cleaning npm cache..."

npm cache verify

echo ""
echo "🔹 Checking dependency tree..."

npm ls @nestjs/common @nestjs/core @nestjs/testing @nestjs/jwt @nestjs/passport

echo ""
echo "🔹 Generating Prisma Client..."

npx prisma generate

echo ""
echo "🔹 Building backend..."

npm run build

echo ""
echo "=========================================="
echo "✅ NESTJS + AUTH DEPENDENCIES FIXED"
echo "=========================================="

echo ""
echo "Next command:"
echo "npm run start:dev"

echo "=========================================="
