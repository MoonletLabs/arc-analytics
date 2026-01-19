import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { chainsApi, transfersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, StatusBadge, TokenBadge } from '@/components/ui/Badge';
import { formatNumber, formatAddress, formatDateTime, getExplorerUrl } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, ExternalLink, ArrowLeft } from 'lucide-react';

export function ChainDetail() {
  const { chainId } = useParams<{ chainId: string }>();

  const { data: chain, isLoading } = useQuery({
    queryKey: ['chains', chainId],
    queryFn: () => chainsApi.getById(chainId!),
    enabled: !!chainId,
  });

  const { data: transfers } = useQuery({
    queryKey: ['transfers', 'chain', chainId],
    queryFn: () =>
      transfersApi.list({
        sourceChain: chainId,
        limit: '10',
        sortBy: 'burnTimestamp',
        sortOrder: 'desc',
      }),
    enabled: !!chainId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!chain?.data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Chain not found</h2>
        <Link to="/chains" className="text-primary hover:underline mt-4 inline-block">
          Back to chains
        </Link>
      </div>
    );
  }

  const { data: chainData } = chain;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/chains" className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{chainData.name}</h1>
            <Badge variant={chainData.isTestnet ? 'secondary' : 'default'}>
              {chainData.isTestnet ? 'Testnet' : 'Mainnet'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Chain ID: {chainData.chainId} | Domain: {chainData.domain}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-blue-600" />
              Outbound Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Transfers</span>
                <span className="font-medium">
                  {chainData.stats.outbound.totalTransfers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-medium">
                  ${formatNumber(parseFloat(chainData.stats.outbound.totalVolume) / 1e6)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Senders</span>
                <span className="font-medium">
                  {chainData.stats.outbound.uniqueSenders.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-green-600" />
              Inbound Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Transfers</span>
                <span className="font-medium">
                  {chainData.stats.inbound.totalTransfers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-medium">
                  ${formatNumber(parseFloat(chainData.stats.inbound.totalVolume) / 1e6)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Receivers</span>
                <span className="font-medium">
                  {chainData.stats.inbound.uniqueReceivers.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Routes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Outbound Routes</CardTitle>
          </CardHeader>
          <CardContent>
            {chainData.stats.topOutboundRoutes.length > 0 ? (
              <div className="space-y-3">
                {chainData.stats.topOutboundRoutes.map((route, i) => (
                  <div
                    key={route.destChain}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium">
                        {route.destChain.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{route.count} transfers</div>
                      <div className="text-xs text-muted-foreground">
                        ${formatNumber(parseFloat(route.volume) / 1e6)}M
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No outbound transfers</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Inbound Routes</CardTitle>
          </CardHeader>
          <CardContent>
            {chainData.stats.topInboundRoutes.length > 0 ? (
              <div className="space-y-3">
                {chainData.stats.topInboundRoutes.map((route, i) => (
                  <div
                    key={route.sourceChain}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium">
                        {route.sourceChain.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{route.count} transfers</div>
                      <div className="text-xs text-muted-foreground">
                        ${formatNumber(parseFloat(route.volume) / 1e6)}M
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No inbound transfers</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers from {chainData.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers?.data && transfers.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">Token</th>
                    <th className="text-left py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">To</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.data.map((transfer) => (
                    <tr key={transfer.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <TokenBadge token={transfer.token} />
                      </td>
                      <td className="py-3 px-2 font-medium">
                        ${formatNumber(transfer.amountFormatted)}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {transfer.destChain.replace('_', ' ')}
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
