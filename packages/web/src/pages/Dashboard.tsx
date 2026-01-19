import { useQuery } from '@tanstack/react-query';
import { statsApi, transfersApi, chainsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge, TokenBadge } from '@/components/ui/Badge';
import { formatNumber, formatAddress, formatDateTime, getExplorerUrl } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Activity,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Layers,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchArcStats() {
  const res = await fetch(`${API_URL}/api/arc/stats`);
  if (!res.ok) throw new Error('Failed to fetch Arc stats');
  return res.json();
}

async function fetchFXRate() {
  const res = await fetch(`${API_URL}/api/fx/rate`);
  if (!res.ok) throw new Error('Failed to fetch FX rate');
  return res.json();
}

export function Dashboard() {
  const { data: arcStats, isLoading: arcLoading } = useQuery({
    queryKey: ['arc', 'stats'],
    queryFn: fetchArcStats,
    refetchInterval: 30000,
  });

  const { data: fxRate } = useQuery({
    queryKey: ['fx', 'rate'],
    queryFn: fetchFXRate,
    refetchInterval: 10000,
  });

  // Overview stats - can be used for expanded metrics later
  useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.getOverview(),
  });

  const { data: recentTransfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['transfers', 'recent'],
    queryFn: () => transfersApi.getRecent(10),
  });

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainsApi.list(),
  });

  const { data: performance } = useQuery({
    queryKey: ['stats', 'performance'],
    queryFn: () => statsApi.getPerformance(),
  });

  const perf = performance?.data;
  const currentRate = fxRate?.current?.rate || '1.08';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Arc Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time analytics for Arc Network - The Economic OS for the internet
        </p>
      </div>

      {/* Arc Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {arcLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : arcStats ? (
          <>
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Arc TVL</CardTitle>
                <Layers className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${arcStats.tvl?.total || '0'}</div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  <span className="text-usdc">USDC: ${arcStats.tvl?.usdc}</span>
                  <span className="text-eurc">EURC: ${arcStats.tvl?.eurc}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${arcStats.volume24h?.total || '0'}</div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  <span>Cross-chain: ${arcStats.volume24h?.crosschain}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">USDC/EURC Rate</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{parseFloat(currentRate).toFixed(4)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  FX Volume: ${arcStats.volume24h?.fx || '0'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{arcStats.activeWallets24h || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {arcStats.transactions24h?.total || 0} transactions today
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/crosschain">
          <Card className="hover:border-violet-400 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-violet-100 dark:bg-violet-900">
                  <ArrowUpRight className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Cross-chain</h3>
                  <p className="text-sm text-muted-foreground">CCTP transfers to/from Arc</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/fx">
          <Card className="hover:border-violet-400 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                  <RefreshCw className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">StableFX</h3>
                  <p className="text-sm text-muted-foreground">USDC/EURC swaps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/analytics">
          <Card className="hover:border-violet-400 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Analytics</h3>
                  <p className="text-sm text-muted-foreground">Volume charts & trends</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Performance & Chains */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bridge Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Bridge Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {perf ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Bridge Time</span>
                  <span className="font-medium">
                    {perf.avgBridgeTimeSeconds > 0
                      ? `${Math.round(perf.avgBridgeTimeSeconds / 60)} min`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-medium text-green-600">{perf.totalCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-medium text-yellow-600">{perf.totalPending}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <span className="font-medium text-red-600">{perf.totalFailed}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 bg-muted animate-pulse rounded" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Chains */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Connected Chains</CardTitle>
            <Link to="/chains" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {chains?.data ? (
              <div className="space-y-3">
                {chains.data.slice(0, 5).map((chain) => (
                  <Link
                    key={chain.id}
                    to={`/chains/${chain.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {chain.id === 'arc_testnet' && (
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                      )}
                      <div>
                        <div className={`font-medium ${chain.id === 'arc_testnet' ? 'text-violet-600' : ''}`}>
                          {chain.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {chain.stats.totalTransfers} transfers
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center text-green-600">
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                        {chain.stats.inboundTransfers}
                      </span>
                      <span className="flex items-center text-blue-600">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {chain.stats.outboundTransfers}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transfers</CardTitle>
          <Link to="/transfers" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <TableSkeleton rows={5} />
          ) : recentTransfers?.data ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">Token</th>
                    <th className="text-left py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Route</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransfers.data.map((transfer) => (
                    <tr key={transfer.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <TokenBadge token={transfer.token} />
                      </td>
                      <td className="py-3 px-2 font-medium">
                        ${formatNumber(transfer.amountFormatted)}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        <span className={transfer.sourceChain === 'arc_testnet' ? 'text-violet-600 font-medium' : 'text-muted-foreground'}>
                          {transfer.sourceChain === 'arc_testnet' ? 'Arc' : transfer.sourceChain.split('_')[0]}
                        </span>
                        <span className="mx-1">→</span>
                        <span className={transfer.destChain === 'arc_testnet' ? 'text-violet-600 font-medium' : ''}>
                          {transfer.destChain === 'arc_testnet' ? 'Arc' : transfer.destChain.split('_')[0]}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={transfer.status} />
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {formatDateTime(transfer.burnTimestamp)}
                      </td>
                      <td className="py-3 px-2">
                        <a
                          href={getExplorerUrl(transfer.sourceChain, transfer.sourceTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {formatAddress(transfer.sourceTxHash, 4)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transfers found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
