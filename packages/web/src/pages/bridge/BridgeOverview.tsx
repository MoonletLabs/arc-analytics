import { useQuery } from '@tanstack/react-query';
import { statsApi, chainsApi, transfersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { StatusBadge, TokenBadge } from '@/components/ui/Badge';
import { formatNumber, formatAddress, formatDateTime, getExplorerUrl } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#2775CA', '#0052FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function BridgeOverview() {
  const { data: overview } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.getOverview(),
  });

  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['stats', 'performance'],
    queryFn: () => statsApi.getPerformance(),
  });

  const { data: dailyVolume, isLoading: dailyLoading } = useQuery({
    queryKey: ['stats', 'volume', 'daily'],
    queryFn: () => statsApi.getDailyVolume(),
  });

  const { data: routes } = useQuery({
    queryKey: ['stats', 'routes'],
    queryFn: () => statsApi.getRoutes(undefined, 50),
  });

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainsApi.list(),
  });

  const { data: recentTransfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['transfers', 'recent'],
    queryFn: () => transfersApi.getRecent(5),
  });

  const perf = performance?.data;

  // Process daily volume data for chart
  const dailyChartData = dailyVolume?.data
    ? [...dailyVolume.data]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .reduce((acc: any[], item) => {
          const existing = acc.find((d) => d.date === item.date);
          if (existing) {
            existing.volume += parseFloat(item.totalVolume) / 1e6;
            existing.transfers += item.transferCount;
          } else {
            acc.push({
              date: item.date,
              volume: parseFloat(item.totalVolume) / 1e6,
              transfers: item.transferCount,
            });
          }
          return acc;
        }, [])
    : [];

  // Process routes for pie chart
  const routePieData = routes?.data?.slice(0, 6).map((route, i) => ({
    name: `${formatChainName(route.sourceChain)} → ${formatChainName(route.destChain)}`,
    value: route.transferCount,
    color: COLORS[i % COLORS.length],
  }));

  // Calculate Arc-specific stats
  const arcInbound = routes?.data?.filter(r => r.destChain === 'arc_testnet') || [];
  const arcOutbound = routes?.data?.filter(r => r.sourceChain === 'arc_testnet') || [];
  
  const totalInbound = arcInbound.reduce((sum, r) => sum + r.transferCount, 0);
  const totalOutbound = arcOutbound.reduce((sum, r) => sum + r.transferCount, 0);
  const volumeInbound = arcInbound.reduce((sum, r) => sum + parseFloat(r.totalVolume), 0);
  const volumeOutbound = arcOutbound.reduce((sum, r) => sum + parseFloat(r.totalVolume), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bridge Overview</h1>
        <p className="text-muted-foreground">
          CCTP cross-chain transfer analytics and performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {overview?.data ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  ${formatNumber(overview.data.totalVolumeFormatted)}
                </div>
                <p className="text-sm text-muted-foreground">Total Bridge Volume</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {overview.data.totalTransfers.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  ${formatNumber(overview.data.avgTransferSizeFormatted)}
                </div>
                <p className="text-sm text-muted-foreground">Avg Transfer Size</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {overview.data.uniqueWallets.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Unique Wallets</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
      </div>

      {/* Bridge Performance & Arc Flow Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Bridge Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Bridge Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : perf ? (
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
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Completed
                  </span>
                  <span className="font-medium text-green-600">{perf.totalCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-yellow-500" /> Pending
                  </span>
                  <span className="font-medium text-yellow-600">{perf.totalPending}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" /> Failed
                  </span>
                  <span className="font-medium text-red-600">{perf.totalFailed}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-bold text-green-600">{perf.successRate}%</span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Arc Inbound */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
              Inbound to Arc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInbound.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${formatNumber(volumeInbound / 1e6)}M total volume
            </p>
            <div className="mt-3 space-y-1">
              {arcInbound.slice(0, 3).map(route => (
                <div key={route.sourceChain} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From {formatChainName(route.sourceChain)}</span>
                  <span>{route.transferCount} transfers</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Arc Outbound */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
              Outbound from Arc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOutbound.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${formatNumber(volumeOutbound / 1e6)}M total volume
            </p>
            <div className="mt-3 space-y-1">
              {arcOutbound.slice(0, 3).map(route => (
                <div key={route.destChain} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To {formatChainName(route.destChain)}</span>
                  <span>{route.transferCount} transfers</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Bridge Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          ) : dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2775CA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2775CA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(value) => `$${formatNumber(value)}M`}
                  className="text-xs"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">
                            {new Date(payload[0].payload.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-usdc">
                            Volume: ${formatNumber(payload[0].payload.volume)}M
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Transfers: {payload[0].payload.transfers}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#2775CA"
                  fillOpacity={1}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Routes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Routes</CardTitle>
            <Link to="/bridge/routes" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {routePieData && routePieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={routePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {routePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {routePieData.map((route, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="truncate flex-1">{route.name}</span>
                      <span className="font-medium">{route.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Chains */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Connected Chains</CardTitle>
            <Link to="/bridge/chains" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {chains?.data ? (
              <div className="space-y-3">
                {chains.data.slice(0, 4).map((chain) => (
                  <Link
                    key={chain.id}
                    to={`/bridge/chains/${chain.id}`}
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
                {[1, 2, 3, 4].map((i) => (
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
          <CardTitle>Recent Bridge Transfers</CardTitle>
          <Link to="/bridge/transfers" className="text-sm text-primary hover:underline">
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
                          {formatChainName(transfer.sourceChain)}
                        </span>
                        <span className="mx-1">→</span>
                        <span className={transfer.destChain === 'arc_testnet' ? 'text-violet-600 font-medium' : ''}>
                          {formatChainName(transfer.destChain)}
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

function formatChainName(id: string) {
  const names: Record<string, string> = {
    'arc_testnet': 'Arc',
    'ethereum_sepolia': 'Ethereum',
    'arbitrum_sepolia': 'Arbitrum',
    'base_sepolia': 'Base',
  };
  return names[id] || id.split('_')[0];
}
