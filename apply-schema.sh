#!/bin/bash

set -e

PROJECT="$HOME/job-auto-apply"
BACKEND="$PROJECT/backend"

echo "=========================================="
echo "🗄️  APPLYING JOB AUTO APPLY DATABASE SCHEMA"
echo "=========================================="

cd "$BACKEND"

echo ""
echo "🔹 [1/4] Checking Prisma..."
npx prisma -v

echo ""
echo "🔹 [2/4] Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔹 [3/4] Syncing database..."
npx prisma db push

echo ""
echo "🔹 [4/4] Checking database..."
npx prisma db pull --print >/dev/null

echo ""
echo "=========================================="
echo "✅ DATABASE SCHEMA APPLIED SUCCESSFULLY"
echo "=========================================="

echo ""
echo "Expected models:"
echo "  ✅ User"
echo "  ✅ Profile"
echo "  ✅ JobPreference"
echo "  ✅ Job"
echo "  ✅ Application"
echo "  ✅ NaukriSession"
echo "  ✅ AutomationLog"

echo ""
echo "Database:"
echo "  PostgreSQL"
echo "  Database: job_auto_apply"

echo ""
echo "Next:"
echo "  cd $BACKEND"
echo "  npx prisma studio"
echo "=========================================="
