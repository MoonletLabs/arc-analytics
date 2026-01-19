import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { TESTNET_CHAINS, ARC_TESTNET_CONFIG, type ChainConfig } from '@usdc-eurc-analytics/shared';

// Load .env from monorepo root
dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
// Also try loading from current directory (for when run from root)
dotenvConfig({ path: resolve(process.cwd(), '.env') });

export interface IndexerConfig {
  databaseUrl: string;
  pollIntervalMs: number;
  batchSize: number;
  syncDays: number; // Number of days to sync on first run
  chains: Record<string, ChainConfig & { rpcUrl: string }>;
  arcConfig: ChainConfig & { rpcUrl: string };
  enableArcNative: boolean;
  enableUSYC: boolean;
  enableStableFX: boolean;
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

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export function loadConfig(): IndexerConfig {
  // Build chain configs with RPC URLs
  const chains: Record<string, ChainConfig & { rpcUrl: string }> = {};

  // Map environment variable names to chain IDs
  const rpcEnvMap: Record<string, string> = {
    arc_testnet: 'RPC_ARC_TESTNET',
    ethereum_sepolia: 'RPC_ETHEREUM_SEPOLIA',
    arbitrum_sepolia: 'RPC_ARBITRUM_SEPOLIA',
    base_sepolia: 'RPC_BASE_SEPOLIA',
  };

  for (const [chainId, chainConfig] of Object.entries(TESTNET_CHAINS)) {
    const envKey = rpcEnvMap[chainId];
    // Use configured RPC or fall back to chain's default rpcUrl
    const rpcUrl = envKey ? process.env[envKey] || chainConfig.rpcUrl : chainConfig.rpcUrl;

    if (rpcUrl) {
      chains[chainId] = {
        ...chainConfig,
        rpcUrl,
      };
    }
  }

  // Arc config (always use default RPC if not specified)
  const arcRpcUrl = process.env.RPC_ARC_TESTNET || ARC_TESTNET_CONFIG.rpcUrl;
  const arcConfig: ChainConfig & { rpcUrl: string } = {
    ...TESTNET_CHAINS.arc_testnet,
    rpcUrl: arcRpcUrl,
  };

  // Ensure Arc is in chains
  if (!chains.arc_testnet) {
    chains.arc_testnet = arcConfig;
  }

  return {
    databaseUrl: getEnvOrThrow('DATABASE_URL'),
    pollIntervalMs: parseInt(getEnvOrDefault('INDEXER_POLL_INTERVAL_MS', '12000'), 10),
    batchSize: parseInt(getEnvOrDefault('INDEXER_BATCH_SIZE', '1000'), 10),
    syncDays: parseInt(getEnvOrDefault('INDEXER_SYNC_DAYS', '7'), 10),
    chains,
    arcConfig,
    enableArcNative: getEnvBool('ENABLE_ARC_NATIVE', true),
    enableUSYC: getEnvBool('ENABLE_USYC', true),
    enableStableFX: getEnvBool('ENABLE_STABLEFX', true),
  };
}

export const config = loadConfig();
