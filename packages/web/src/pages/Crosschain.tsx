import { useQuery } from '@tanstack/react-query';
import { statsApi, chainsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { ArrowRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export function Crosschain() {
  const { data: routes, isLoading } = useQuery({
    queryKey: ['stats', 'routes'],
    queryFn: () => statsApi.getRoutes(undefined, 50),
  });

  const { data: heatmap } = useQuery({
    queryKey: ['stats', 'routes', 'heatmap'],
    queryFn: () => statsApi.getRoutesHeatmap(),
  });

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainsApi.list(),
  });

  // Build heatmap matrix
  const chainList = chains?.data?.map((c) => c.id) || [];
  const heatmapMatrix = chainList.map((source) =>
    chainList.map((dest) => {
      if (source === dest) return null;
      const route = heatmap?.data?.find(
        (r) => r.sourceChain === source && r.destChain === dest
      );
      return route ? { volume: route.volume, count: route.count } : null;
    })
  );

  // Get max count for color scaling
  const maxCount = Math.max(...(heatmap?.data?.map((r) => r.count) || [1]));

  // Calculate Arc-specific stats
  const arcInbound = routes?.data?.filter(r => r.destChain === 'arc_testnet') || [];
  const arcOutbound = routes?.data?.filter(r => r.sourceChain === 'arc_testnet') || [];
  
  const totalInbound = arcInbound.reduce((sum, r) => sum + r.transferCount, 0);
  const totalOutbound = arcOutbound.reduce((sum, r) => sum + r.transferCount, 0);
  const volumeInbound = arcInbound.reduce((sum, r) => sum + parseFloat(r.totalVolume), 0);
  const volumeOutbound = arcOutbound.reduce((sum, r) => sum + parseFloat(r.totalVolume), 0);

  const getHeatmapColor = (count: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-violet-600 text-white';
    if (intensity > 0.5) return 'bg-violet-500 text-white';
    if (intensity > 0.25) return 'bg-violet-400';
    if (intensity > 0) return 'bg-violet-300';
    return 'bg-muted';
  };

  const formatChainName = (id: string) => {
    const names: Record<string, string> = {
      'arc_testnet': 'Arc',
      'ethereum_sepolia': 'Ethereum',
      'arbitrum_sepolia': 'Arbitrum',
      'base_sepolia': 'Base',
    };
    return names[id] || id.split('_')[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cross-chain Transfers</h1>
        <p className="text-muted-foreground">
          CCTP transfers between Arc and other chains
        </p>
      </div>

      {/* Arc Flow Summary */}
      <div className="grid gap-4 md:grid-cols-2">
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

      {/* Route Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Route Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {chainList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-2 text-xs text-muted-foreground">From / To</th>
                    {chainList.map((chain) => (
                      <th key={chain} className="p-2 text-xs text-muted-foreground">
                        {formatChainName(chain)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chainList.map((source, i) => (
                    <tr key={source}>
                      <td className="p-2 text-xs font-medium">{formatChainName(source)}</td>
                      {chainList.map((dest, j) => {
                        const data = heatmapMatrix[i]?.[j];
                        return (
                          <td key={dest} className="p-1">
                            {source === dest ? (
                              <div className="w-12 h-12 bg-muted-foreground/10 rounded" />
                            ) : (
                              <div
                                className={`w-12 h-12 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                                  data ? getHeatmapColor(data.count) : 'bg-muted'
                                }`}
                                title={
                                  data
                                    ? `${formatChainName(source)} → ${formatChainName(dest)}: ${data.count} transfers`
                                    : 'No transfers'
                                }
                              >
                                {data?.count || '-'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Routes List */}
      <Card>
        <CardHeader>
          <CardTitle>All Routes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : routes?.data && routes.data.length > 0 ? (
            <div className="space-y-3">
              {routes.data.map((route, i) => (
                <div
                  key={`${route.sourceChain}-${route.destChain}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${route.sourceChain === 'arc_testnet' ? 'text-violet-600' : ''}`}>
                        {formatChainName(route.sourceChain)}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className={`text-sm font-medium ${route.destChain === 'arc_testnet' ? 'text-violet-600' : ''}`}>
                        {formatChainName(route.destChain)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-sm font-medium">
                        {route.transferCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">transfers</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        ${formatNumber(parseFloat(route.totalVolume) / 1e6)}
                      </div>
                      <div className="text-xs text-muted-foreground">volume</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No routes found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
