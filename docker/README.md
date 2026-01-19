# Docker Deployment

Deploy the USDC/EURC Analytics dashboard on any VM with Docker.

## Quick Start

### 1. Initial Setup (First time only)

This will create the database, run migrations, and seed with dummy data:

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

## Commands

| Command | Description |
|---------|-------------|
| `./init-setup.sh` | Full reset: removes data, runs migrations, seeds dummy data |
| `docker compose up -d` | Start all services in background |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove all data |
| `docker compose logs -f` | View logs |
| `docker compose logs -f api` | View API logs only |
| `docker compose logs -f nginx` | View nginx proxy logs |
| `docker compose ps` | Check service status |

## Services

| Service | Internal Port | Description |
|---------|---------------|-------------|
| `nginx` | 80 (exposed: 8080) | Reverse proxy - single entry point |
| `web` | 80 | Frontend (nginx serving React app) |
| `api` | 3001 | Backend API (Node.js/Hono) |
| `db` | 5432 | PostgreSQL database |

## Architecture

```
                    ┌─────────────┐
                    │   Browser   │
                    │ / Cloudflare│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   nginx     │ :8080
                    │  (proxy)    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
           /*                        /api/*
              │                         │
              ▼                         ▼
    ┌─────────────────┐       ┌─────────────────┐
    │     nginx       │       │   Hono API      │
    │     (web)       │       │   (api)         │
    └────────┬────────┘       └────────┬────────┘
             │                         │
             ▼                         │
    ┌─────────────────┐                │
    │  React SPA      │                │
    │  (static)       │                │
    └─────────────────┘                │
                              ┌────────▼────────┐
                              │   PostgreSQL    │
                              │   (db)          │
                              └─────────────────┘
```

## Troubleshooting

### Check all services are running
```bash
docker compose ps
```

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nginx
docker compose logs -f api
docker compose logs -f web
```

### Database connection issues
```bash
docker compose exec db psql -U postgres -d usdc_eurc_analytics -c "SELECT 1"
```

### Rebuild images after code changes
```bash
docker compose build --no-cache
docker compose up -d
```

### Reset everything
```bash
docker compose down -v
./init-setup.sh
docker compose up -d
```

### Test health endpoint
```bash
curl http://localhost:8080/health
```
