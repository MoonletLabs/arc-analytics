import { z } from 'zod';

// ============================================
// Enums & Literals
// ============================================

export const TokenType = {
  USDC: 'USDC',
  EURC: 'EURC',
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

export const Direction = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

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
  tokenMessenger: `0x${string}`;
  messageTransmitter: `0x${string}`;
  usdc: `0x${string}`;
  eurc?: `0x${string}`;
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

  // Status tracking
  status: TransferStatus;

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
// API Query Types
// ============================================

export const TransferQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  token: z.enum(['USDC', 'EURC']).optional(),
  sourceChain: z.string().optional(),
  destChain: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['pending', 'attested', 'completed', 'failed']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(['burnTimestamp', 'amount', 'status']).default('burnTimestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type TransferQuery = z.infer<typeof TransferQuerySchema>;

export const StatsQuerySchema = z.object({
  token: z.enum(['USDC', 'EURC']).optional(),
  chain: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

export type StatsQuery = z.infer<typeof StatsQuerySchema>;

// ============================================
// Event Types (from blockchain)
// ============================================

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

export interface MintAndWithdrawEvent {
  mintRecipient: `0x${string}`;
  amount: bigint;
  mintToken: `0x${string}`;
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
