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
  Clock,
  Users,
  Activity,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

export function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
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

  const stats = overview?.data;
  const perf = performance?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of USDC/EURC cross-chain transfers via Circle CCTP
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : stats ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${formatNumber(stats.totalVolumeFormatted)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalTransfers.toLocaleString()} total transfers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${formatNumber(stats.last24h.volumeFormatted)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.last24h.transfers.toLocaleString()} transfers today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Wallets</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueWallets.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Avg ${formatNumber(stats.avgTransferSizeFormatted)} per transfer
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingTransfers} pending
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
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
            <CardTitle>Active Chains</CardTitle>
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
                    <div>
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {chain.stats.totalTransfers} transfers
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
                        <span className="text-muted-foreground">
                          {transfer.sourceChain.replace('_', ' ')}
                        </span>
                        <span className="mx-1">→</span>
                        <span>{transfer.destChain.replace('_', ' ')}</span>
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
