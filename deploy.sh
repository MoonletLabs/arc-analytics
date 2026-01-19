#!/bin/bash
set -e

# USDC/EURC Analytics - Docker Swarm Deployment Script
# =====================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}USDC/EURC Analytics - Swarm Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo -e "${YELLOW}Please create .env.production with your configuration.${NC}"
    echo ""
    echo "Example:"
    echo "  cp .env.example .env.production"
    echo "  # Then edit .env.production with your RPC URLs and credentials"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Set defaults
export TAG=${TAG:-latest}
export REGISTRY=${REGISTRY:-}

echo -e "${YELLOW}Step 1: Building Docker images...${NC}"
docker build -t ${REGISTRY}usdc-eurc-analytics-api:${TAG} -f Dockerfile.api .
docker build -t ${REGISTRY}usdc-eurc-analytics-indexer:${TAG} -f Dockerfile.indexer .
docker build -t ${REGISTRY}usdc-eurc-analytics-web:${TAG} -f Dockerfile.web .

# Push to registry if REGISTRY is set
if [ -n "$REGISTRY" ]; then
    echo -e "${YELLOW}Step 2: Pushing images to registry...${NC}"
    docker push ${REGISTRY}usdc-eurc-analytics-api:${TAG}
    docker push ${REGISTRY}usdc-eurc-analytics-indexer:${TAG}
    docker push ${REGISTRY}usdc-eurc-analytics-web:${TAG}
else
    echo -e "${YELLOW}Step 2: Skipping registry push (no REGISTRY set)${NC}"
fi

echo -e "${YELLOW}Step 3: Deploying stack to Swarm...${NC}"
docker stack deploy -c docker-stack.yml usdc-eurc-analytics

echo -e "${YELLOW}Step 4: Waiting for services to start...${NC}"
sleep 10

echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
# Run migrations using a one-off container
docker run --rm \
    --network usdc-eurc-analytics_backend \
    -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-usdc_eurc_analytics}" \
    ${REGISTRY}usdc-eurc-analytics-api:${TAG} \
    sh -c "cd /app/packages/db && npx drizzle-kit push --force"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Services:"
docker stack services usdc-eurc-analytics
echo ""
echo -e "Web UI: ${GREEN}http://localhost:${WEB_PORT:-80}${NC}"
echo -e "API:    ${GREEN}http://localhost:${WEB_PORT:-80}/api${NC}"
echo ""
echo "Useful commands:"
echo "  docker stack services usdc-eurc-analytics  # List services"
echo "  docker service logs -f usdc-eurc-analytics_indexer  # Indexer logs"
echo "  docker service logs -f usdc-eurc-analytics_api  # API logs"
echo "  docker stack rm usdc-eurc-analytics  # Remove stack"
