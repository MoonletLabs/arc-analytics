# USDC/EURC Analytics Platform - Project Memories

## Project Overview

**Goal**: Build a standalone analytics platform to track USDC and EURC cross-chain movements via Circle's CCTP (Cross-Chain Transfer Protocol).

**Source Reference**: Based on analysis of `/Users/krisboit/Work/research/circle-bridge-kit-transfer` - Circle's sample Bridge Kit application.

**Project Location**: `/Users/krisboit/Work/research/opencode/arc/usdc-eurc-analytics`

---

## Requirements

### Scope
- **Personal + Global Analytics**: Both user dashboards and global metrics
- **Tokens**: USDC and EURC from day one
- **Chains**: All CCTP-supported chains, starting with testnets

### Key Metrics to Track
1. **Transfer Volumes** - Total moved per chain, per day/week/month
2. **Popular Routes** - Most common source -> destination chain pairs
3. **Transaction History** - Individual transfer details (amount, chains, timestamps)
4. **Wallet Analytics** - Top wallets, unique users, repeat users
5. **Bridge Performance** - Transfer times, success rates, gas costs

---

## Architecture

```
Frontend (React) --> API Layer (Hono) --> Database (PostgreSQL)
                                              ^
                                              |
                                    Indexer Service
                                              |
                    +------------+------------+------------+
                    |            |            |            |
                EVM RPCs    Solana RPC    Circle APIs
```

### Project Structure
```
usdc-eurc-analytics/
├── packages/
│   ├── shared/            # Types, constants, ABIs, utils
│   ├── db/                # Drizzle schema, migrations
│   ├── indexer/           # Blockchain event indexer
│   ├── api/               # Hono REST API
│   └── web/               # React frontend dashboard
├── docker-compose.yml     # PostgreSQL + Redis
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Frontend | React 18 + Vite + TailwindCSS + Recharts |
| API | Hono + @hono/node-server |
| Database | PostgreSQL + Drizzle ORM |
| Indexer | viem for EVM chains |
| Jobs | BullMQ + Redis (prepared) |
| Validation | Zod |

---

## Database Schema

### Tables (Drizzle)
1. **transfers** - Core transfer records (burn/mint events)
2. **daily_stats** - Aggregated daily volumes per chain/route
3. **route_stats** - Popular source->dest combinations
4. **wallet_stats** - Per-wallet activity metrics
5. **chains** - Supported chains metadata
6. **indexer_state** - Track last indexed block per chain

### Key Fields for `transfers`
- id (uuid), token (USDC/EURC), amount, amountFormatted
- sourceChain, sourceTxHash, sourceAddress, burnTimestamp, burnBlockNumber
- destChain, destTxHash, destAddress, mintTimestamp, mintBlockNumber
- nonce, sourceDomain, destDomain, messageHash, attestation
- status (pending/attested/completed/failed)

---

## API Endpoints (Implemented)

### Transfers `/api/transfers`
- `GET /` - List with filters (token, chain, status, address, date range)
- `GET /:id` - Single transfer by ID
- `GET /tx/:txHash` - Transfer by transaction hash
- `GET /recent` - Recent transfers

### Stats `/api/stats`
- `GET /overview` - Global overview metrics
- `GET /volume/daily` - Daily volume time series
- `GET /volume/by-chain` - Volume grouped by chain
- `GET /routes` - Popular routes list
- `GET /routes/heatmap` - Route matrix data
- `GET /performance` - Bridge timing & success metrics

### Chains `/api/chains`
- `GET /` - All supported chains with stats
- `GET /:id` - Chain details with top routes

### Wallets `/api/wallets`
- `GET /top` - Top wallets by volume
- `GET /stats` - Global wallet statistics
- `GET /:address` - Wallet details & breakdown
- `GET /:address/transfers` - Wallet transfer history

---

## Frontend Pages (Implemented)

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview cards, recent transfers, performance |
| Analytics | `/analytics` | Volume charts, chain comparison, top routes |
| Routes | `/routes` | Route heatmap matrix, popular routes list |
| Chains | `/chains` | Chain cards with inbound/outbound stats |
| Chain Detail | `/chains/:chainId` | Chain metrics, top routes, recent transfers |
| Wallet | `/wallet/:address` | Wallet summary, breakdown, transfer history |
| Transfers | `/transfers` | Filterable transfer table with pagination |
| Transfer Detail | `/transfers/:id` | Transfer progress, addresses, transactions |

---

## CCTP Events Indexed

### DepositForBurn (Source Chain - Burn Event)
```solidity
event DepositForBurn(
  uint64 indexed nonce,
  address indexed burnToken,
  uint256 amount,
  address indexed depositor,
  bytes32 mintRecipient,
  uint32 destinationDomain,
  bytes32 destinationTokenMessenger,
  bytes32 destinationCaller
);
```

### MintAndWithdraw (Destination Chain - Mint Event)
```solidity
event MintAndWithdraw(
  address indexed mintRecipient,
  uint256 amount,
  address indexed mintToken
);
```

---

## CCTP Contract Addresses (Testnet)

| Chain | Domain | TokenMessenger | USDC |
|-------|--------|----------------|------|
| Ethereum Sepolia | 0 | 0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5 | 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 |
| Avalanche Fuji | 1 | 0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0 | 0x5425890298aed601595a70AB815c96711a31Bc65 |
| Arbitrum Sepolia | 3 | 0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5 | 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d |
| Base Sepolia | 6 | 0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5 | 0x036CbD53842c5426634e7929541eC2318f3dCF7e |
| Polygon Amoy | 7 | 0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5 | 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 |
| Optimism Sepolia | 2 | 0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5 | 0x5fd84259d66Cd46123540766Be93DFE6D43130D7 |

---

## Implementation Status

### Phase 1: Foundation - COMPLETED
- [x] Create project memories
- [x] Initialize monorepo with Turborepo
- [x] Set up package structure
- [x] Configure TypeScript
- [x] Create database schema with Drizzle
- [x] Define shared types and constants
- [x] Add CCTP ABIs

### Phase 2: Indexer - MOSTLY COMPLETE
- [x] Build base indexer with viem
- [x] Parse DepositForBurn events
- [x] Parse MintAndWithdraw events
- [x] Correlate burn/mint pairs
- [ ] Add Solana devnet support (pending)
- [ ] Set up BullMQ for background jobs (pending)
- [ ] Historical backfill capability (pending)

### Phase 3: API - COMPLETED
- [x] Set up Hono server
- [x] Implement transfer endpoints
- [x] Implement stats endpoints
- [x] Implement chain endpoints
- [x] Implement wallet endpoints
- [x] Add pagination, filtering

### Phase 4: Frontend - COMPLETED
- [x] Initialize React app with Vite
- [x] TailwindCSS setup with dark mode
- [x] Dashboard page with metrics cards
- [x] Analytics page with charts (Recharts)
- [x] Routes heatmap page
- [x] Chain explorer & detail pages
- [x] Wallet dashboard page
- [x] Transfers list with filters
- [x] Transfer detail page

### Phase 5: Polish - PARTIALLY COMPLETE
- [x] Docker compose setup (PostgreSQL + Redis)
- [ ] Testing (pending)
- [ ] Deployment config (pending)

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL & Redis)

### Setup
```bash
cd usdc-eurc-analytics

# Install dependencies
pnpm install

# Start database
docker-compose up -d

# Copy env file
cp .env.example .env
# Edit .env with your RPC URLs and configure sync days

# Run database migrations
pnpm db:push

# Start development
pnpm dev
```

### Indexer Configuration
The indexer can be configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `INDEXER_SYNC_DAYS` | 7 | Number of days to sync on first run (0 = latest only) |
| `INDEXER_POLL_INTERVAL_MS` | 12000 | Polling interval in milliseconds |
| `INDEXER_BATCH_SIZE` | 1000 | Max blocks to fetch per batch |

**Examples:**
- `INDEXER_SYNC_DAYS=1` - Quick test, sync last 24 hours
- `INDEXER_SYNC_DAYS=7` - Default, sync last week
- `INDEXER_SYNC_DAYS=30` - Full month of data
- `INDEXER_SYNC_DAYS=0` - Start from latest block only (no historical)

### Services
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Database**: postgresql://localhost:5432

---

## Progress Log

### Session 1 - Initial Planning
- Analyzed circle-bridge-kit-transfer codebase
- Defined requirements with user
- Created architecture plan
- Documented in MEMORIES.md

### Session 1 - Implementation (Continued)
- Created full monorepo structure
- Implemented shared package (types, constants, ABIs, utils)
- Implemented database package (Drizzle schema)
- Implemented indexer (EVM chain support)
- Implemented API (Hono with all endpoints)
- Implemented frontend (React + TailwindCSS + Recharts)
- Created Docker compose for local dev

### Session 2 - Indexer Improvements & Bug Fixes
- Added `INDEXER_SYNC_DAYS` env variable to control historical sync depth
- Indexer now calculates starting block based on chain-specific block times
- Supports different block times for each chain (Arbitrum ~250ms, Ethereum ~12s, etc.)
- Makes testing much easier - set to 1 day for quick tests, 30 days for full data
- Fixed TypeScript errors (ChainDetail type, unused imports, blockNumber nullability)
- Fixed dotenv loading from monorepo root (loads from both `../../.env` and `./.env`)
- Added missing `db:push` script to root package.json
- Added `drizzle-orm` dependency to indexer package
- Added `--force` flag to db:push for non-interactive execution
- Verified indexer works: successfully indexes burn/mint events from all chains

---

## Docker Swarm Deployment

### Files Created
- `Dockerfile.api` - API service image
- `Dockerfile.indexer` - Indexer service image
- `Dockerfile.web` - Web frontend (nginx)
- `docker-stack.yml` - Swarm stack configuration
- `nginx.conf` - Nginx config for frontend
- `deploy.sh` - Deployment script
- `.env.production.example` - Production env template

### First Run Deployment

```bash
# 1. Initialize Swarm (if not already)
docker swarm init

# 2. Create production env file
cp .env.production.example .env.production
# Edit .env.production with your RPC URLs and credentials

# 3. Run deployment script
./deploy.sh
```

### Manual Deployment Steps

```bash
# 1. Build images
docker build -t usdc-eurc-analytics-api:latest -f Dockerfile.api .
docker build -t usdc-eurc-analytics-indexer:latest -f Dockerfile.indexer .
docker build -t usdc-eurc-analytics-web:latest -f Dockerfile.web .

# 2. Deploy stack
export $(grep -v '^#' .env.production | xargs)
docker stack deploy -c docker-stack.yml usdc-eurc-analytics

# 3. Wait for postgres to be ready, then run migrations
docker run --rm \
  --network usdc-eurc-analytics_backend \
  -e DATABASE_URL="postgresql://postgres:password@postgres:5432/usdc_eurc_analytics" \
  usdc-eurc-analytics-api:latest \
  sh -c "cd /app/packages/db && npx drizzle-kit push --force"
```

### Useful Commands

```bash
# List services
docker stack services usdc-eurc-analytics

# View logs
docker service logs -f usdc-eurc-analytics_indexer
docker service logs -f usdc-eurc-analytics_api

# Scale services
docker service scale usdc-eurc-analytics_api=3

# Remove stack
docker stack rm usdc-eurc-analytics
```

---

## Remaining Work

1. **Solana Support** - Add Solana devnet CCTP indexing
2. **BullMQ Jobs** - Background processing, historical backfill
3. **Testing** - Unit tests for indexer, API, components

---

## Notes & Decisions

1. **Standalone project** - Not extending the Circle sample app
2. **Testnets first** - Start with testnet chains, add mainnet later
3. **Both tokens** - USDC and EURC support from day one
4. **PostgreSQL** - Chosen for strong analytics query support
5. **Turborepo** - For efficient monorepo management
6. **No wallet connect yet** - Just address search for now

---

## Useful Links

- Circle CCTP Docs: https://developers.circle.com/stablecoins/cctp-getting-started
- Bridge Kit: https://developers.circle.com/stablecoins/bridge-kit
- Drizzle ORM: https://orm.drizzle.team/
- Hono: https://hono.dev/
- viem: https://viem.sh/
- Recharts: https://recharts.org/
