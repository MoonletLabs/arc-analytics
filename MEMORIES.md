# Arc Analytics Platform - Project Memories

## Project Overview

**Goal**: Build a comprehensive analytics platform for Arc Network - Circle's L1 blockchain purpose-built for USDC/EURC. Track cross-chain transfers (CCTP), native stablecoin activity, USYC yield token, and StableFX swaps.

**Repository**: https://github.com/MoonletLabs/arc-analytics

**Project Location**: `/Users/krisboit/Work/research/opencode/arc/usdc-eurc-analytics`

---

## Arc Network Overview

Arc is Circle's new **Layer-1 blockchain** - "The Economic OS for the internet":
- **USDC as native gas** - Pay fees in stablecoins
- **Sub-second finality** - Deterministic settlement
- **CCTP V2 integration** - Cross-chain transfers
- **StableFX** - Institutional FX engine for USDC/EURC swaps
- **USYC** - Yield-bearing tokenized money market fund

### Arc Testnet Details

| Property | Value |
|----------|-------|
| Chain ID | 5042002 |
| Domain (CCTP) | 26 |
| RPC | https://rpc.testnet.arc.network |
| WebSocket | wss://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Block Time | ~500ms |

### Arc Contract Addresses (Testnet)

| Contract | Address |
|----------|---------|
| USDC (ERC-20) | `0x3600000000000000000000000000000000000000` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` |
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` |
| FxEscrow (StableFX) | `0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1` |
| USYC Teller | `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A` |

---

## What We're Building

### Analytics Coverage

1. **Cross-chain (CCTP)** - Transfers between Arc and other chains
2. **Native transfers** - USDC/EURC/USYC movements on Arc
3. **StableFX** - USDC <-> EURC swap analytics
4. **USYC Activity** - Mint/redeem/transfer tracking
5. **Network Health** - TVL, TPS, gas metrics

### Supported Chains

| Chain | Domain | CCTP Version |
|-------|--------|--------------|
| Arc Testnet | 26 | V2 |
| Ethereum Sepolia | 0 | V1 |
| Arbitrum Sepolia | 3 | V1 |
| Base Sepolia | 6 | V1 |

---

## Architecture

```
Frontend (React) --> API Layer (Hono) --> Database (PostgreSQL)
                                               ^
                                               |
                          +--------------------+--------------------+
                          |                    |                    |
                    CCTP Indexer         Arc Indexers         StableFX Indexer
                    (V1 + V2)        (Native + USYC)              (FX)
                          |                    |                    |
                    All Chains            Arc Only              Arc Only
```

### Project Structure
```
usdc-eurc-analytics/
├── packages/
│   ├── shared/            # Types, constants, ABIs, utils
│   ├── db/                # Drizzle schema (PostgreSQL)
│   ├── indexer/           # All blockchain indexers
│   │   ├── chains/
│   │   │   ├── evm.ts         # CCTP V1/V2 indexer
│   │   │   ├── arc-native.ts  # Native transfer indexer
│   │   │   ├── arc-usyc.ts    # USYC activity indexer
│   │   │   └── arc-stablefx.ts # FX swap indexer
│   │   └── services/
│   ├── api/               # Hono REST API
│   └── web/               # React frontend
├── docker-compose.yml
├── docker-stack.yml
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
| Validation | Zod |

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `transfers` | CCTP cross-chain transfers |
| `arc_native_transfers` | Native USDC/EURC/USYC on Arc |
| `usyc_activity` | USYC mints, redeems, transfers |
| `fx_swaps` | StableFX swap records |
| `fx_daily_stats` | FX aggregated daily stats |
| `arc_network_stats` | Network health snapshots |
| `daily_stats` | Daily volume per chain |
| `route_stats` | Popular routes |
| `wallet_stats` | Per-wallet metrics |
| `chains` | Chain metadata |
| `indexer_state` | Last indexed block per indexer |

### Key Schema Updates (Session 3)
- Added `maxFee` to transfers (CCTP V2)
- Added `transferType` field (cctp, native, fx)
- New tables for Arc-specific data
- Support for USYC token type

---

## CCTP V1 vs V2

Arc uses **CCTP V2** which has different event signatures:

### V1 DepositForBurn (Other chains)
```solidity
event DepositForBurn(
  uint64 indexed nonce,
  address indexed burnToken,  // indexed
  uint256 amount,
  address indexed depositor,
  bytes32 mintRecipient,
  uint32 destinationDomain,
  bytes32 destinationTokenMessenger,
  bytes32 destinationCaller
);
```

### V2 DepositForBurn (Arc)
```solidity
event DepositForBurn(
  uint64 indexed nonce,
  address burnToken,          // NOT indexed
  uint256 amount,
  address indexed depositor,
  bytes32 mintRecipient,
  uint32 destinationDomain,
  bytes32 destinationTokenMessenger,
  bytes32 destinationCaller,
  uint256 indexed maxFee      // NEW field
);
```

---

## API Endpoints

### Existing (Updated)
- `GET /api/transfers` - Now supports `transferType` filter
- `GET /api/stats/overview` - Now includes Arc-specific metrics
- `GET /api/chains` - Includes Arc with enhanced data

### New Arc Endpoints
- `GET /api/arc/stats` - Arc network overview
- `GET /api/arc/transfers` - Native transfers on Arc
- `GET /api/arc/tvl` - TVL breakdown

### New USYC Endpoints
- `GET /api/usyc/activity` - USYC mints/redeems/transfers
- `GET /api/usyc/stats` - USYC metrics

### New FX Endpoints
- `GET /api/fx/swaps` - Recent FX swaps
- `GET /api/fx/volume` - FX volume by day
- `GET /api/fx/rate` - USDC/EURC rate history

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Arc overview, TVL, volume, rate |
| Analytics | `/analytics` | Volume charts, trends |
| Cross-chain | `/crosschain` | CCTP flows to/from Arc |
| FX | `/fx` | StableFX swap analytics |
| Chains | `/chains` | Chain comparison |
| Transfers | `/transfers` | All transfer activity |
| Wallet | `/wallet/:address` | Wallet lookup |

---

## Implementation Status

### Session 3 - Arc Network Integration (IN PROGRESS)

#### Completed
- [x] Updated shared/constants with Arc config
- [x] Added CCTP V2 ABIs
- [x] Updated ChainConfig type for Arc fields
- [x] Added new database tables
- [x] Updated EVM indexer for V2 support
- [x] Created Arc native transfer indexer
- [x] Created USYC activity indexer
- [x] Created StableFX indexer
- [x] Updated transfer service for all indexers

#### In Progress
- [ ] Update main indexer orchestration
- [ ] Add new API endpoints
- [ ] Rebrand frontend to "Arc Analytics"
- [ ] Update Dashboard with Arc metrics
- [ ] Create FX page
- [ ] Update navigation

#### Pending
- [ ] Test indexers against Arc testnet
- [ ] Commit and push changes

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/arc_analytics

# RPC URLs (Arc uses default if not specified)
RPC_ARC_TESTNET=https://rpc.testnet.arc.network
RPC_ETHEREUM_SEPOLIA=https://...
RPC_ARBITRUM_SEPOLIA=https://...
RPC_BASE_SEPOLIA=https://...

# Indexer config
INDEXER_SYNC_DAYS=7
INDEXER_POLL_INTERVAL_MS=12000
INDEXER_BATCH_SIZE=1000

# Feature flags
ENABLE_ARC_NATIVE=true
ENABLE_USYC=true
ENABLE_STABLEFX=true
```

---

## Getting Started

```bash
cd usdc-eurc-analytics

# Install dependencies
pnpm install

# Start database
docker-compose up -d

# Run migrations
pnpm db:push

# Start development (all services)
pnpm dev
```

### Services
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Database**: postgresql://localhost:5432

---

## Progress Log

### Session 1 - Initial Build
- Built USDC/EURC cross-chain analytics platform
- CCTP V1 indexer for 6 testnet chains
- Full API and frontend implementation

### Session 2 - Improvements
- Added INDEXER_SYNC_DAYS configuration
- Fixed TypeScript errors
- Docker Swarm deployment setup

### Session 3 - Arc Network Integration
- Pivoted to Arc-focused analytics platform
- Added CCTP V2 support for Arc
- Created indexers for native transfers, USYC, StableFX
- Reduced chains to Arc + 3 major (Eth, Arb, Base)
- Updated database schema with new tables
- Rebranding to "Arc Analytics"

---

## Useful Links

- **Arc Network**: https://arc.network
- **Arc Docs**: https://docs.arc.network
- **Arc Explorer**: https://testnet.arcscan.app
- **Circle Faucet**: https://faucet.circle.com
- **CCTP Docs**: https://developers.circle.com/stablecoins/cctp-getting-started
- **StableFX Docs**: https://developers.circle.com/stablefx

---

## Notes & Decisions

1. **Arc is primary chain** - Platform is Arc-focused, not generic CCTP
2. **Testnet only** - Hardcoded for testnet, mainnet later
3. **USYC included** - Track yield-bearing token from start
4. **StableFX on-chain only** - No Circle API, just contract events
5. **Reduced chain set** - Arc + Ethereum/Arbitrum/Base Sepolia
6. **Powered by Moonlet** - Footer branding
