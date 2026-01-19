# Docker Deployment

## Local Development

Run database in Docker, app locally with hot reload:

```bash
# First time setup (creates DB, runs migrations, seeds data)
pnpm dev:setup

# Start DB
pnpm dev:db

# In another terminal, start app with hot reload
pnpm dev

# Stop DB when done
pnpm dev:db:stop
```

Access:
- **Web**: http://localhost:5173
- **API**: http://localhost:3001

## Production (VM Deployment)

Deploy the full stack on a VM with Docker:

### 1. Initial Setup (First time only)

```bash
cd docker
./init-setup.sh
```

### 2. Start the Application

```bash
cd docker
docker compose up -d
```

Access: **http://localhost:8080**

### 3. Stop the Application

```bash
cd docker
docker compose down
```

## Cloudflare Tunnel Setup

To expose the app through Cloudflare on a domain:

1. Install cloudflared on your VM
2. Create a tunnel: `cloudflared tunnel create usdc-analytics`
3. Configure the tunnel to point to `http://localhost:8080`
4. Run the tunnel: `cloudflared tunnel run usdc-analytics`

Or use Cloudflare Zero Trust dashboard to create a tunnel pointing to `localhost:8080`.

## Commands Summary

### Local Development
| Command | Description |
|---------|-------------|
| `pnpm dev:setup` | First time: create DB, migrate, seed data |
| `pnpm dev:db` | Start PostgreSQL in Docker |
| `pnpm dev` | Start API + Web with hot reload |
| `pnpm dev:db:stop` | Stop PostgreSQL |

### Production
| Command | Description |
|---------|-------------|
| `./init-setup.sh` | Full reset: removes data, runs migrations, seeds dummy data |
| `docker compose up -d` | Start all services in background |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove all data |
| `docker compose logs -f` | View logs |

## Architecture

### Local Development
```
Browser → localhost:5173 (Vite) → localhost:3001 (API) → localhost:5432 (PostgreSQL/Docker)
```

### Production
```
Browser/Cloudflare → nginx:8080 → web + api → PostgreSQL
```

## Troubleshooting

### Rebuild images after code changes
```bash
cd docker
docker compose build --no-cache
docker compose up -d
```

### Reset everything (production)
```bash
cd docker
docker compose down -v
./init-setup.sh
docker compose up -d
```

### Reset dev database
```bash
pnpm dev:db:stop
docker volume rm docker_postgres_data_dev
pnpm dev:setup
```
