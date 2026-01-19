import { z } from 'zod';

// ============================================
// Enums & Literals
// ============================================

export const TokenType = {
  USDC: 'USDC',
  EURC: 'EURC',
  USYC: 'USYC',
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export const ChainType = {
  EVM: 'evm',
  SOLANA: 'solana',
} as const;
export type ChainType = (typeof ChainType)[keyof typeof ChainType];

export const TransferStatus = {
  PENDING: 'pending',
  ATTESTED: 'attested',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

export const TransferType = {
  CCTP: 'cctp',
  NATIVE: 'native',
  FX: 'fx',
} as const;
export type TransferType = (typeof TransferType)[keyof typeof TransferType];

export const Direction = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

export const CCTPVersion = {
  V1: 1,
  V2: 2,
} as const;
export type CCTPVersion = (typeof CCTPVersion)[keyof typeof CCTPVersion];

// ============================================
// Chain Types
// ============================================

export interface ChainConfig {
  id: string;
  name: string;
  chainId: number;
  domain: number; // CCTP domain ID
  type: ChainType;
  isTestnet: boolean;
  explorerUrl: string;
  rpcUrl?: string;
  blockTime?: number; // Average block time in seconds
  
  // CCTP contracts (V1)
  tokenMessenger?: `0x${string}`;
  messageTransmitter?: `0x${string}`;
  
  // CCTP contracts (V2) - Arc uses these
  cctpVersion?: CCTPVersion;
  tokenMessengerV2?: `0x${string}`;
  messageTransmitterV2?: `0x${string}`;
  tokenMinterV2?: `0x${string}`;
  
  // Token addresses
  usdc: `0x${string}`;
  eurc?: `0x${string}`;
  usyc?: `0x${string}`;
  
  // Arc-specific contracts
  fxEscrow?: `0x${string}`;
  usycTeller?: `0x${string}`;
  usycEntitlements?: `0x${string}`;
  
  // Gateway contracts
  gatewayWallet?: `0x${string}`;
  gatewayMinter?: `0x${string}`;
}

// ============================================
// Transfer Types
// ============================================

export interface Transfer {
  id: string;
  token: TokenType;
  amount: string; // Stored as string for precision (bigint serialization)
  amountFormatted: string; // Human readable with decimals

  // Source chain info
  sourceChain: string;
  sourceTxHash: string;
  sourceAddress: string;
  burnTimestamp: Date;
  burnBlockNumber: number;

  // Destination chain info
  destChain: string;
  destTxHash: string | null;
  destAddress: string;
  mintTimestamp: Date | null;
  mintBlockNumber: number | null;

  // CCTP specific
  nonce: string; // uint64 as string
  sourceDomain: number;
  destDomain: number;
  messageHash: string | null;
  attestation: string | null;
  maxFee?: string; // V2 only

  // Status tracking
  status: TransferStatus;
  transferType: TransferType;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferCreateInput {
  token: TokenType;
  amount: string;
  sourceChain: string;
  sourceTxHash: string;
  sourceAddress: string;
  burnTimestamp: Date;
  burnBlockNumber: number;
  destChain: string;
  destAddress: string;
  nonce: string;
  sourceDomain: number;
  destDomain: number;
  maxFee?: string;
  transferType?: TransferType;
}

// ============================================
// Arc Native Transfer Types
// ============================================

export interface ArcNativeTransfer {
  id: string;
  token: TokenType;
  amount: string;
  amountFormatted: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  createdAt: Date;
}

// ============================================
// USYC Types
// ============================================

export const USYCAction = {
  MINT: 'mint',
  REDEEM: 'redeem',
  TRANSFER: 'transfer',
} as const;
export type USYCAction = (typeof USYCAction)[keyof typeof USYCAction];

export interface USYCActivity {
  id: string;
  action: USYCAction;
  amount: string;
  amountFormatted: string;
  usdcAmount?: string;
  usdcAmountFormatted?: string;
  walletAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  createdAt: Date;
}

// ============================================
// FX Swap Types
// ============================================

export interface FXSwap {
  id: string;
  tradeId?: string;
  maker: string;
  taker: string;
  baseToken: TokenType;
  quoteToken: TokenType;
  baseAmount: string;
  baseAmountFormatted: string;
  quoteAmount: string;
  quoteAmountFormatted: string;
  effectiveRate?: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  createdAt: Date;
}

// ============================================
// Arc Network Stats Types
// ============================================

export interface ArcNetworkStats {
  id: number;
  timestamp: Date;
  blockNumber: number;
  txCount: number;
  totalGasUsed?: string;
  avgGasPrice?: string;
  activeWallets?: number;
  newWallets?: number;
  usdcTvl?: string;
  eurcTvl?: string;
  usycTvl?: string;
}

// ============================================
// Stats Types
// ============================================

export interface DailyStats {
  id: number;
  date: Date;
  token: TokenType;
  chain: string;
  direction: Direction;
  transferCount: number;
  totalVolume: string;
  uniqueWallets: number;
  avgAmount: string;
}

export interface RouteStats {
  id: number;
  date: Date;
  token: TokenType;
  sourceChain: string;
  destChain: string;
  transferCount: number;
  totalVolume: string;
}

export interface WalletStats {
  id: number;
  address: string;
  token: TokenType;
  totalTransfers: number;
  totalVolume: string;
  firstSeen: Date;
  lastSeen: Date;
}

export interface IndexerState {
  chainId: string;
  lastBlock: number;
  lastUpdated: Date;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VolumeStats {
  totalVolume: string;
  transferCount: number;
  uniqueWallets: number;
  avgTransferSize: string;
}

export interface ChainVolumeStats extends VolumeStats {
  chain: string;
  inboundVolume: string;
  outboundVolume: string;
  inboundCount: number;
  outboundCount: number;
}

export interface RouteHeatmapData {
  sourceChain: string;
  destChain: string;
  volume: string;
  count: number;
}

export interface PerformanceStats {
  avgBridgeTimeSeconds: number;
  medianBridgeTimeSeconds: number;
  successRate: number;
  totalCompleted: number;
  totalPending: number;
  totalFailed: number;
}

export interface TopWallet {
  address: string;
  totalVolume: string;
  transferCount: number;
  lastActive: Date;
}

// ============================================
// Arc-specific API Types
// ============================================

export interface ArcOverviewStats {
  totalTvl: string;
  usdcTvl: string;
  eurcTvl: string;
  usycTvl: string;
  volume24h: string;
  crosschainVolume24h: string;
  fxVolume24h: string;
  nativeVolume24h: string;
  transactions24h: number;
  activeWallets24h: number;
  currentUsdcEurcRate?: string;
}

export interface FXVolumeStats {
  totalVolume: string;
  swapCount: number;
  uniqueTraders: number;
  avgSwapSize: string;
  usdcToEurcVolume: string;
  eurcToUsdcVolume: string;
}

// ============================================
// API Query Types
// ============================================

export const TransferQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  token: z.enum(['USDC', 'EURC', 'USYC']).optional(),
  sourceChain: z.string().optional(),
  destChain: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['pending', 'attested', 'completed', 'failed']).optional(),
  transferType: z.enum(['cctp', 'native', 'fx']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(['burnTimestamp', 'amount', 'status']).default('burnTimestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type TransferQuery = z.infer<typeof TransferQuerySchema>;

export const StatsQuerySchema = z.object({
  token: z.enum(['USDC', 'EURC', 'USYC']).optional(),
  chain: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

export type StatsQuery = z.infer<typeof StatsQuerySchema>;

export const FXQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  maker: z.string().optional(),
  taker: z.string().optional(),
  baseToken: z.enum(['USDC', 'EURC']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(['timestamp', 'baseAmount', 'quoteAmount']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type FXQuery = z.infer<typeof FXQuerySchema>;

export const USYCQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z.enum(['mint', 'redeem', 'transfer']).optional(),
  wallet: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(['timestamp', 'amount']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type USYCQuery = z.infer<typeof USYCQuerySchema>;

// ============================================
// Event Types (from blockchain)
// ============================================

// CCTP V1 Events
export interface DepositForBurnEvent {
  nonce: bigint;
  burnToken: `0x${string}`;
  amount: bigint;
  depositor: `0x${string}`;
  mintRecipient: `0x${string}`; // bytes32 converted
  destinationDomain: number;
  destinationTokenMessenger: `0x${string}`;
  destinationCaller: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

// CCTP V2 Events (Arc)
export interface DepositForBurnV2Event extends DepositForBurnEvent {
  maxFee: bigint;
}

export interface MintAndWithdrawEvent {
  mintRecipient: `0x${string}`;
  amount: bigint;
  mintToken: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

// ERC20 Transfer Event
export interface ERC20TransferEvent {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

// StableFX Events
export interface FXSwapSettledEvent {
  tradeId: `0x${string}`;
  maker: `0x${string}`;
  taker: `0x${string}`;
  baseToken: `0x${string}`;
  quoteToken: `0x${string}`;
  baseAmount: bigint;
  quoteAmount: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

// USYC Teller Events
export interface USYCDepositEvent {
  depositor: `0x${string}`;
  usdcAmount: bigint;
  usycAmount: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

export interface USYCWithdrawEvent {
  withdrawer: `0x${string}`;
  usycAmount: bigint;
  usdcAmount: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

// ============================================
// Utility Types
// ============================================

export type ChainId = string;
export type Address = `0x${string}`;
export type TxHash = `0x${string}`;
