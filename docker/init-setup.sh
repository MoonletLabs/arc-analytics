#!/bin/bash
set -e

echo "=========================================="
echo "  USDC/EURC Analytics - Initial Setup"
echo "=========================================="

cd "$(dirname "$0")"

# Step 1: Clean up any existing data
echo ""
echo "[1/5] Cleaning up existing data..."
docker compose down -v 2>/dev/null || true
echo "  - Removed containers and volumes"

# Step 2: Start only the database
echo ""
echo "[2/5] Starting database..."
docker compose up -d db
echo "  - Waiting for database to be ready..."
sleep 5

# Wait for postgres to be fully ready
until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
  echo "  - Waiting for postgres..."
  sleep 2
done
echo "  - Database is ready"

# Step 3: Run migrations
echo ""
echo "[3/5] Running database migrations..."
docker compose run --rm \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/usdc_eurc_analytics \
  api sh -c "cd /app && pnpm --filter @usdc-eurc-analytics/db db:push"
echo "  - Migrations complete"

# Step 4: Seed dummy data
echo ""
echo "[4/5] Seeding dummy data..."
docker compose run --rm \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/usdc_eurc_analytics \
  api sh -c "cd /app && pnpm exec tsx scripts/seed-dummy-data.ts"
echo "  - Seed complete"

# Step 5: Stop everything
echo ""
echo "[5/5] Stopping services..."
docker compose down
echo "  - All services stopped"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application, run:"
echo "  cd docker && docker compose up -d"
echo ""
echo "Then access:"
echo "  - App: http://localhost:8080"
echo ""
echo "For Cloudflare tunnel, point your domain to port 8080"
echo ""
