import type { ChainConfig } from '../types/index.js';

// ============================================
// CCTP Domain IDs
// ============================================

export const CCTP_DOMAINS = {
  ETHEREUM: 0,
  AVALANCHE: 1,
  OP_MAINNET: 2,
  ARBITRUM: 3,
  NOBLE: 4,
  SOLANA: 5,
  BASE: 6,
  POLYGON_POS: 7,
} as const;

// Reverse mapping: domain -> chain name
export const DOMAIN_TO_CHAIN: Record<number, string> = {
  0: 'ethereum',
  1: 'avalanche',
  2: 'optimism',
  3: 'arbitrum',
  4: 'noble',
  5: 'solana',
  6: 'base',
  7: 'polygon',
};

// ============================================
// Testnet Chain Configurations
// ============================================

export const TESTNET_CHAINS: Record<string, ChainConfig> = {
  ethereum_sepolia: {
    id: 'ethereum_sepolia',
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    domain: 0,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  avalanche_fuji: {
    id: 'avalanche_fuji',
    name: 'Avalanche Fuji',
    chainId: 43113,
    domain: 1,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://testnet.snowtrace.io',
    tokenMessenger: '0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0',
    messageTransmitter: '0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
  },
  arbitrum_sepolia: {
    id: 'arbitrum_sepolia',
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    domain: 3,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.arbiscan.io',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
  base_sepolia: {
    id: 'base_sepolia',
    name: 'Base Sepolia',
    chainId: 84532,
    domain: 6,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  polygon_amoy: {
    id: 'polygon_amoy',
    name: 'Polygon Amoy',
    chainId: 80002,
    domain: 7,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://amoy.polygonscan.com',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdc: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  },
  optimism_sepolia: {
    id: 'optimism_sepolia',
    name: 'Optimism Sepolia',
    chainId: 11155420,
    domain: 2,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
};

// ============================================
// Mainnet Chain Configurations (for future use)
// ============================================

export const MAINNET_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    domain: 0,
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://etherscan.io',
    tokenMessenger: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitter: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    eurc: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    chainId: 43114,
    domain: 1,
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://snowtrace.io',
    tokenMessenger: '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
    messageTransmitter: '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    eurc: '0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    domain: 3,
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://arbiscan.io',
    tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    eurc: '0x863708032B5c328faFA11E7B8F6FFdD5E3E7e77f',
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    domain: 6,
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://basescan.org',
    tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitter: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    eurc: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon PoS',
    chainId: 137,
    domain: 7,
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com',
    tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
    messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    eurc: '0x0000000000000000000000000000000000000000', // Not available yet
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    domain: 2,
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://optimistic.etherscan.io',
    tokenMessenger: '0x2B4069517957735bE00ceE0fadAE88a26365528f',
    messageTransmitter: '0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    eurc: '0x0000000000000000000000000000000000000000', // Not available yet
  },
};

// ============================================
// Active Chains (start with testnets)
// ============================================

export const ACTIVE_CHAINS = TESTNET_CHAINS;

// ============================================
// Token Decimals
// ============================================

export const TOKEN_DECIMALS = {
  USDC: 6,
  EURC: 6,
} as const;

// ============================================
// Utility Functions
// ============================================

export function getChainByDomain(domain: number, isTestnet = true): ChainConfig | undefined {
  const chains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  return Object.values(chains).find((chain) => chain.domain === domain);
}

export function getChainById(chainId: string, isTestnet = true): ChainConfig | undefined {
  const chains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  return chains[chainId];
}

export function getChainByEvmChainId(evmChainId: number, isTestnet = true): ChainConfig | undefined {
  const chains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  return Object.values(chains).find((chain) => chain.chainId === evmChainId);
}

export function getAllChains(isTestnet = true): ChainConfig[] {
  const chains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  return Object.values(chains);
}

export function isValidChain(chainId: string, isTestnet = true): boolean {
  const chains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  return chainId in chains;
}
