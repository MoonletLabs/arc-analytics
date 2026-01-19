import type { ChainConfig, CCTPVersion } from '../types/index.js';

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
  ARC: 26,
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
  26: 'arc',
};

// ============================================
// Arc Testnet Configuration
// ============================================

export const ARC_TESTNET_CONFIG = {
  chainId: 5042002,
  domain: 26,
  rpcUrl: 'https://rpc.testnet.arc.network',
  wsUrl: 'wss://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  blockTime: 0.5, // Sub-second finality
  
  // Token addresses
  usdc: '0x3600000000000000000000000000000000000000' as `0x${string}`,
  eurc: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
  usyc: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C' as `0x${string}`,
  
  // CCTP V2 contracts
  tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' as `0x${string}`,
  messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as `0x${string}`,
  tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192' as `0x${string}`,
  
  // StableFX
  fxEscrow: '0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1' as `0x${string}`,
  
  // USYC contracts
  usycTeller: '0x9fdF14c5B14173D74C08Af27AebFf39240dC105A' as `0x${string}`,
  usycEntitlements: '0xcc205224862c7641930c87679e98999d23c26113' as `0x${string}`,
  
  // Gateway
  gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as `0x${string}`,
  gatewayMinter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as `0x${string}`,
  
  // Common contracts
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`,
  multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11' as `0x${string}`,
} as const;

// ============================================
// Testnet Chain Configurations
// ============================================

export const TESTNET_CHAINS: Record<string, ChainConfig> = {
  // Arc Testnet - Primary chain for this analytics platform
  arc_testnet: {
    id: 'arc_testnet',
    name: 'Arc Testnet',
    chainId: ARC_TESTNET_CONFIG.chainId,
    domain: ARC_TESTNET_CONFIG.domain,
    type: 'evm',
    isTestnet: true,
    explorerUrl: ARC_TESTNET_CONFIG.explorerUrl,
    rpcUrl: ARC_TESTNET_CONFIG.rpcUrl,
    blockTime: ARC_TESTNET_CONFIG.blockTime,
    cctpVersion: 2 as CCTPVersion,
    tokenMessengerV2: ARC_TESTNET_CONFIG.tokenMessengerV2,
    messageTransmitterV2: ARC_TESTNET_CONFIG.messageTransmitterV2,
    tokenMinterV2: ARC_TESTNET_CONFIG.tokenMinterV2,
    usdc: ARC_TESTNET_CONFIG.usdc,
    eurc: ARC_TESTNET_CONFIG.eurc,
    usyc: ARC_TESTNET_CONFIG.usyc,
    fxEscrow: ARC_TESTNET_CONFIG.fxEscrow,
    usycTeller: ARC_TESTNET_CONFIG.usycTeller,
    usycEntitlements: ARC_TESTNET_CONFIG.usycEntitlements,
    gatewayWallet: ARC_TESTNET_CONFIG.gatewayWallet,
    gatewayMinter: ARC_TESTNET_CONFIG.gatewayMinter,
  },
  
  // Ethereum Sepolia - Major chain for CCTP
  ethereum_sepolia: {
    id: 'ethereum_sepolia',
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    domain: 0,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io',
    blockTime: 12,
    cctpVersion: 1 as CCTPVersion,
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  
  // Arbitrum Sepolia - Major chain for CCTP
  arbitrum_sepolia: {
    id: 'arbitrum_sepolia',
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    domain: 3,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.arbiscan.io',
    blockTime: 0.25,
    cctpVersion: 1 as CCTPVersion,
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
  
  // Base Sepolia - Major chain for CCTP
  base_sepolia: {
    id: 'base_sepolia',
    name: 'Base Sepolia',
    chainId: 84532,
    domain: 6,
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org',
    blockTime: 2,
    cctpVersion: 1 as CCTPVersion,
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4F3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};

// ============================================
// Active Chains
// ============================================

export const ACTIVE_CHAINS = TESTNET_CHAINS;

// Arc is the primary chain
export const PRIMARY_CHAIN = TESTNET_CHAINS.arc_testnet;

// Chains that support CCTP cross-chain transfers
export const CCTP_CHAINS = Object.values(TESTNET_CHAINS).filter(
  chain => chain.tokenMessenger || chain.tokenMessengerV2
);

// ============================================
// Token Decimals
// ============================================

export const TOKEN_DECIMALS = {
  USDC: 6,
  EURC: 6,
  USYC: 6,
  // Note: Arc native USDC gas uses 18 decimals, but ERC-20 interface uses 6
  USDC_NATIVE_GAS: 18,
} as const;

// ============================================
// Utility Functions
// ============================================

export function getChainByDomain(domain: number): ChainConfig | undefined {
  return Object.values(TESTNET_CHAINS).find((chain) => chain.domain === domain);
}

export function getChainById(chainId: string): ChainConfig | undefined {
  return TESTNET_CHAINS[chainId];
}

export function getChainByEvmChainId(evmChainId: number): ChainConfig | undefined {
  return Object.values(TESTNET_CHAINS).find((chain) => chain.chainId === evmChainId);
}

export function getAllChains(): ChainConfig[] {
  return Object.values(TESTNET_CHAINS);
}

export function isValidChain(chainId: string): boolean {
  return chainId in TESTNET_CHAINS;
}

export function isArcChain(chainId: string): boolean {
  return chainId === 'arc_testnet';
}

export function getTokenMessenger(chain: ChainConfig): `0x${string}` | undefined {
  if (chain.cctpVersion === 2) {
    return chain.tokenMessengerV2;
  }
  return chain.tokenMessenger;
}

export function getMessageTransmitter(chain: ChainConfig): `0x${string}` | undefined {
  if (chain.cctpVersion === 2) {
    return chain.messageTransmitterV2;
  }
  return chain.messageTransmitter;
}

export function getCCTPVersion(chain: ChainConfig): CCTPVersion {
  return chain.cctpVersion || 1;
}
