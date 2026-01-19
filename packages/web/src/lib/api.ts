const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Stats API
export const statsApi = {
  getOverview: (token?: string) =>
    fetchApi<{ data: OverviewStats }>(`/stats/overview${token ? `?token=${token}` : ''}`),
  
  getDailyVolume: (params?: StatsQueryParams) =>
    fetchApi<{ data: DailyStat[] }>(`/stats/volume/daily?${new URLSearchParams(params as Record<string, string>)}`),
  
  getVolumeByChain: (token?: string) =>
    fetchApi<{ data: ChainVolume[] }>(`/stats/volume/by-chain${token ? `?token=${token}` : ''}`),
  
  getRoutes: (token?: string, limit = 20) =>
    fetchApi<{ data: Route[] }>(`/stats/routes?limit=${limit}${token ? `&token=${token}` : ''}`),
  
  getRoutesHeatmap: (token?: string) =>
    fetchApi<{ data: HeatmapData[] }>(`/stats/routes/heatmap${token ? `?token=${token}` : ''}`),
  
  getPerformance: (token?: string) =>
    fetchApi<{ data: PerformanceStats }>(`/stats/performance${token ? `?token=${token}` : ''}`),

  // Volume & Activity endpoints
  getHourlyVolume: (token?: string, hours = 168) =>
    fetchApi<{ data: HourlyStat[]; source: string }>(`/stats/volume/hourly?hours=${hours}${token ? `&token=${token}` : ''}`),
  
  getTransferMetrics: (token?: string, days = 7) =>
    fetchApi<{ data: TransferMetrics }>(`/stats/transfers/metrics?days=${days}${token ? `&token=${token}` : ''}`),
  
  getDailyWallets: (token?: string, days = 30) =>
    fetchApi<{ data: DailyWalletStat[] }>(`/stats/wallets/daily?days=${days}${token ? `&token=${token}` : ''}`),

  // Net Flows endpoints
  getNetFlows: (token?: string, days = 7, limit = 100) =>
    fetchApi<{ data: NetFlowEntry[]; period: { days: number; since: string } }>(`/stats/flows/net?days=${days}&limit=${limit}${token ? `&token=${token}` : ''}`),
  
  getTopSinks: (token?: string, days = 7, limit = 20) =>
    fetchApi<{ data: NetFlowEntry[]; period: { days: number; since: string } }>(`/stats/flows/top-sinks?days=${days}&limit=${limit}${token ? `&token=${token}` : ''}`),
  
  getTopSources: (token?: string, days = 7, limit = 20) =>
    fetchApi<{ data: NetFlowEntry[]; period: { days: number; since: string } }>(`/stats/flows/top-sources?days=${days}&limit=${limit}${token ? `&token=${token}` : ''}`),

  // Velocity & Retention endpoints
  getVelocity: (token?: string, days = 7) =>
    fetchApi<{ data: VelocityData[]; period: { days: number; since: string } }>(`/stats/velocity?days=${days}${token ? `&token=${token}` : ''}`),

  getDormancy: (token?: string) =>
    fetchApi<{ data: DormancyData[] }>(`/stats/dormancy${token ? `?token=${token}` : ''}`),

  getWalletRetention: (token?: string, days = 14) =>
    fetchApi<{ data: WalletRetentionEntry[]; period: { days: number } }>(`/stats/wallet-retention?days=${days}${token ? `&token=${token}` : ''}`),

  // Concentration & Risk endpoints
  getTopHolders: (token?: string, top = 10, days = 30) =>
    fetchApi<{ data: TopHoldersData[]; period: { days: number; since: string } }>(`/stats/concentration/top-holders?top=${top}&days=${days}${token ? `&token=${token}` : ''}`),

  getHHI: (token?: string, days = 30) =>
    fetchApi<{ data: HHIData[]; period: { days: number; since: string }; interpretation: Record<string, string> }>(`/stats/concentration/hhi?days=${days}${token ? `&token=${token}` : ''}`),

  getWhaleAlerts: (token?: string, days = 7, threshold?: string, limit = 50) =>
    fetchApi<{ data: WhaleAlertsResponse; period: { days: number; since: string }; threshold: { raw: string; formatted: string } }>(`/stats/whale-alerts?days=${days}&limit=${limit}${token ? `&token=${token}` : ''}${threshold ? `&threshold=${threshold}` : ''}`),
};

// Transfers API
export const transfersApi = {
  list: (params?: TransferQueryParams) =>
    fetchApi<PaginatedResponse<Transfer>>(`/transfers?${new URLSearchParams(params as Record<string, string>)}`),
  
  getById: (id: string) =>
    fetchApi<{ data: Transfer }>(`/transfers/${id}`),
  
  getByTxHash: (txHash: string) =>
    fetchApi<{ data: Transfer }>(`/transfers/tx/${txHash}`),
  
  getRecent: (limit = 10) =>
    fetchApi<{ data: Transfer[] }>(`/transfers/recent?limit=${limit}`),
};

// Chains API
export const chainsApi = {
  list: (testnet = true) =>
    fetchApi<{ data: ChainWithStats[] }>(`/chains?testnet=${testnet}`),
  
  getById: (chainId: string, testnet = true) =>
    fetchApi<{ data: ChainDetail }>(`/chains/${chainId}?testnet=${testnet}`),
};

// Wallets API
export const walletsApi = {
  getTop: (token?: string, limit = 20) =>
    fetchApi<{ data: TopWallet[] }>(`/wallets/top?limit=${limit}${token ? `&token=${token}` : ''}`),
  
  getStats: (token?: string) =>
    fetchApi<{ data: WalletGlobalStats }>(`/wallets/stats${token ? `?token=${token}` : ''}`),
  
  getByAddress: (address: string) =>
    fetchApi<{ data: WalletDetail }>(`/wallets/${address}`),
  
  getTransfers: (address: string, params?: { page?: number; limit?: number }) =>
    fetchApi<PaginatedResponse<Transfer>>(`/wallets/${address}/transfers?${new URLSearchParams(params as Record<string, string>)}`),
};

// Types
export interface OverviewStats {
  totalTransfers: number;
  totalVolume: string;
  totalVolumeFormatted: string;
  uniqueWallets: number;
  avgTransferSize: string;
  avgTransferSizeFormatted: string;
  completedTransfers: number;
  pendingTransfers: number;
  successRate: string;
  last24h: {
    transfers: number;
    volume: string;
    volumeFormatted: string;
  };
}

export interface DailyStat {
  id: number;
  date: string;
  token: string;
  chain: string;
  direction: string;
  transferCount: number;
  totalVolume: string;
  uniqueWallets: number;
  avgAmount: string;
}

export interface ChainVolume {
  chain: string;
  outboundTransfers: number;
  outboundVolume: string;
  inboundTransfers: number;
  inboundVolume: string;
}

export interface Route {
  sourceChain: string;
  destChain: string;
  transferCount: number;
  totalVolume: string;
  avgAmount: string;
}

export interface HeatmapData {
  sourceChain: string;
  destChain: string;
  volume: string;
  count: number;
}

export interface PerformanceStats {
  avgBridgeTimeSeconds: number;
  minBridgeTimeSeconds: number;
  maxBridgeTimeSeconds: number;
  totalCompleted: number;
  totalPending: number;
  totalFailed: number;
  successRate: string;
}

export interface Transfer {
  id: string;
  token: string;
  amount: string;
  amountFormatted: string;
  sourceChain: string;
  sourceTxHash: string;
  sourceAddress: string;
  burnTimestamp: string;
  destChain: string;
  destTxHash: string | null;
  destAddress: string;
  mintTimestamp: string | null;
  status: string;
  nonce: string;
}

export interface TransferQueryParams {
  page?: string;
  limit?: string;
  token?: string;
  sourceChain?: string;
  destChain?: string;
  address?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface StatsQueryParams {
  token?: string;
  chain?: string;
  fromDate?: string;
  toDate?: string;
  granularity?: string;
}

export interface ChainWithStats {
  id: string;
  name: string;
  chainId: number;
  domain: number;
  type: string;
  isTestnet: boolean;
  explorerUrl: string;
  stats: {
    outboundTransfers: number;
    inboundTransfers: number;
    totalTransfers: number;
  };
}

export interface ChainDetail {
  id: string;
  name: string;
  chainId: number;
  domain: number;
  type: string;
  isTestnet: boolean;
  explorerUrl: string;
  stats: {
    outbound: {
      totalTransfers: number;
      totalVolume: string;
      uniqueSenders: number;
    };
    inbound: {
      totalTransfers: number;
      totalVolume: string;
      uniqueReceivers: number;
    };
    topOutboundRoutes: Array<{ destChain: string; count: number; volume: string }>;
    topInboundRoutes: Array<{ sourceChain: string; count: number; volume: string }>;
  };
}

export interface TopWallet {
  address: string;
  token: string;
  totalTransfers: number;
  totalVolume: string;
  totalVolumeFormatted: string;
  firstSeen: string;
  lastSeen: string;
}

export interface WalletGlobalStats {
  totalWallets: number;
  avgTransfersPerWallet: number;
  avgVolumePerWallet: string;
  activeWalletsLast7Days: number;
}

export interface WalletDetail {
  address: string;
  summary: {
    totalOutboundTransfers: number;
    totalInboundTransfers: number;
    outboundVolume: string;
    outboundVolumeFormatted: string;
    inboundVolume: string;
    inboundVolumeFormatted: string;
  };
  breakdown: {
    outboundByChain: Array<{ chain: string; count: number; volume: string }>;
    inboundByChain: Array<{ chain: string; count: number; volume: string }>;
  };
  recentTransfers: Transfer[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Volume & Activity Types
export interface HourlyStat {
  hour: string;
  token: string;
  transferCount: number;
  totalVolume: string;
  uniqueSenders: number;
  uniqueReceivers: number;
  minAmount: string;
  maxAmount: string;
  medianAmount?: string;
  p90Amount?: string;
}

export interface TransferMetrics {
  byToken: TokenMetrics[];
  wallets: {
    uniqueSenders: number;
    uniqueReceivers: number;
    totalUniqueWallets: number;
  };
  period: {
    days: number;
    since: string;
  };
}

export interface TokenMetrics {
  token: string;
  transferCount: number;
  totalVolume: string;
  totalVolumeFormatted: string;
  avgAmount: string;
  avgAmountFormatted: string;
  medianAmount: string;
  medianAmountFormatted: string;
  p90Amount: string;
  p90AmountFormatted: string;
  p10Amount: string;
  p10AmountFormatted: string;
  minAmount: string;
  maxAmount: string;
}

export interface DailyWalletStat {
  date: string;
  token: string;
  unique_senders: number;
  unique_receivers: number;
  transfer_count: number;
}

// Net Flows Types
export interface NetFlowEntry {
  address: string;
  token: string;
  inflow: string;
  inflowFormatted: string;
  outflow: string;
  outflowFormatted: string;
  netFlow: string;
  netFlowFormatted: string;
  inflowCount: number;
  outflowCount: number;
}

// Velocity & Retention Types
export interface VelocityData {
  token: string;
  totalVolume: string;
  totalVolumeFormatted: string;
  transferCount: number;
  activeSupply: string;
  activeSupplyFormatted: string;
  activeWallets: number;
  velocity: string;
  velocityDescription: string;
}

export interface DormancyData {
  threshold: number;
  data: DormancyEntry[];
}

export interface DormancyEntry {
  token: string;
  totalWallets: number;
  dormantWallets: number;
  dormancyRate: string;
}

export interface WalletRetentionEntry {
  date: string;
  token: string;
  totalActive: number;
  newWallets: number;
  returningWallets: number;
  retentionRate: string;
}

// Concentration & Risk Types
export interface TopHoldersData {
  token: string;
  totalSupply: string;
  totalSupplyFormatted: string;
  totalHolders: number;
  top10Share: string;
  top50Share: string;
  holders: HolderEntry[];
}

export interface HolderEntry {
  rank: number;
  address: string;
  balance: string;
  balanceFormatted: string;
  sharePct: string;
}

export interface HHIData {
  token: string;
  hhi: string;
  holderCount: number;
  minHhi: string;
  concentration: string;
}

export interface WhaleAlertsResponse {
  transfers: WhaleTransfer[];
  summary: {
    count: number;
    totalVolume: string;
    totalVolumeFormatted: string;
    avgSize: string;
    avgSizeFormatted: string;
  };
}

export interface WhaleTransfer {
  id: string;
  token: string;
  amount: string;
  amountFormatted: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}
