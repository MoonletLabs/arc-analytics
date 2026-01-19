# USDC/EURC Analytics Platform

A comprehensive analytics platform for tracking USDC and EURC cross-chain movements via Circle's CCTP (Cross-Chain Transfer Protocol).

## Features

- **Global Analytics**: Track total volumes, transfer counts, and trends across all chains
- **Route Analysis**: Visualize popular transfer routes with heatmaps
- **Chain Explorer**: View per-chain metrics and transfer activity
- **Wallet Dashboard**: Search any wallet to see their transfer history
- **Real-time Indexing**: Automatically indexes new transfers as they happen
- **Dark Mode**: Full dark mode support

## Tech Stack

| Component | Technology |
|-----------|------------|
| Monorepo | Turborepo + pnpm |
| Frontend | React 18, Vite, TailwindCSS, Recharts |
| API | Hono (TypeScript) |
| Database | PostgreSQL + Drizzle ORM |
| Indexer | viem (EVM chains) |
| Cache/Queue | Redis + BullMQ |

## Project Structure

```
usdc-eurc-analytics/
├── packages/
│   ├── shared/      # Types, constants, ABIs, utilities
│   ├── db/          # Database schema and migrations
│   ├── indexer/     # Blockchain event indexer
│   ├── api/         # REST API server
│   └── web/         # React frontend
├── docker-compose.yml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Installation

```bash
# Clone and enter directory
cd usdc-eurc-analytics

# Install dependencies
pnpm install

# Start PostgreSQL and Redis
docker-compose up -d

# Copy environment file
cp .env.example .env
```

### Configuration

Edit `.env` with your RPC endpoints:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/usdc_eurc_analytics
REDIS_URL=redis://localhost:6379

# Add your RPC URLs (get from Alchemy, Infura, etc.)
RPC_ETHEREUM_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_ARBITRUM_SEPOLIA=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_BASE_SEPOLIA=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
```

### Running

```bash
# Push database schema
pnpm db:push

# Start all services in development
pnpm dev

# Or run individually:
pnpm --filter @usdc-eurc-analytics/api dev
pnpm --filter @usdc-eurc-analytics/indexer dev
pnpm --filter @usdc-eurc-analytics/web dev
```

### Access

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Database Studio**: `pnpm db:studio`

## API Endpoints

### Transfers
- `GET /api/transfers` - List transfers with filters
- `GET /api/transfers/:id` - Get transfer by ID
- `GET /api/transfers/recent` - Recent transfers

### Statistics
- `GET /api/stats/overview` - Global metrics
- `GET /api/stats/volume/daily` - Daily volume
- `GET /api/stats/routes` - Popular routes
- `GET /api/stats/performance` - Bridge performance

### Chains
- `GET /api/chains` - All supported chains
- `GET /api/chains/:id` - Chain details

### Wallets
- `GET /api/wallets/top` - Top wallets
- `GET /api/wallets/:address` - Wallet details

## Supported Chains (Testnet)

| Chain | Domain ID |
|-------|-----------|
| Ethereum Sepolia | 0 |
| Avalanche Fuji | 1 |
| Optimism Sepolia | 2 |
| Arbitrum Sepolia | 3 |
| Base Sepolia | 6 |
| Polygon Amoy | 7 |

## Screenshots

### Dashboard
Overview with key metrics, recent transfers, and chain activity.

### Analytics
Volume charts, trends, and route analysis.

### Route Heatmap
Visual matrix showing transfer volume between chains.

### Chain Explorer
Per-chain metrics with top routes and recent activity.

## Development

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean
```

## Roadmap

- [ ] Solana devnet support
- [ ] Historical backfill jobs
- [ ] Wallet connect integration
- [ ] Real-time WebSocket updates
- [ ] Mainnet support
- [ ] Export functionality (CSV, JSON)

## License

MIT
