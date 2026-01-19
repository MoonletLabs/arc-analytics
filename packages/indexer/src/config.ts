import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { TESTNET_CHAINS, type ChainConfig } from '@usdc-eurc-analytics/shared';

// Load .env from monorepo root
dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
// Also try loading from current directory (for when run from root)
dotenvConfig({ path: resolve(process.cwd(), '.env') });

export interface IndexerConfig {
  databaseUrl: string;
  redisUrl: string;
  pollIntervalMs: number;
  batchSize: number;
  syncDays: number; // Number of days to sync on first run
  chains: Record<string, ChainConfig & { rpcUrl: string }>;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): IndexerConfig {
  // Build chain configs with RPC URLs
  const chains: Record<string, ChainConfig & { rpcUrl: string }> = {};

  // Map environment variable names to chain IDs
  const rpcEnvMap: Record<string, string> = {
    ethereum_sepolia: 'RPC_ETHEREUM_SEPOLIA',
    avalanche_fuji: 'RPC_AVALANCHE_FUJI',
    arbitrum_sepolia: 'RPC_ARBITRUM_SEPOLIA',
    base_sepolia: 'RPC_BASE_SEPOLIA',
    polygon_amoy: 'RPC_POLYGON_AMOY',
    optimism_sepolia: 'RPC_OPTIMISM_SEPOLIA',
  };

  for (const [chainId, chainConfig] of Object.entries(TESTNET_CHAINS)) {
    const envKey = rpcEnvMap[chainId];
    const rpcUrl = envKey ? process.env[envKey] : undefined;

    if (rpcUrl) {
      chains[chainId] = {
        ...chainConfig,
        rpcUrl,
      };
    }
  }

  return {
    databaseUrl: getEnvOrThrow('DATABASE_URL'),
    redisUrl: getEnvOrDefault('REDIS_URL', 'redis://localhost:6379'),
    pollIntervalMs: parseInt(getEnvOrDefault('INDEXER_POLL_INTERVAL_MS', '12000'), 10),
    batchSize: parseInt(getEnvOrDefault('INDEXER_BATCH_SIZE', '1000'), 10),
    syncDays: parseInt(getEnvOrDefault('INDEXER_SYNC_DAYS', '7'), 10),
    chains,
  };
}

export const config = loadConfig();
