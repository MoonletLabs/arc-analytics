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
