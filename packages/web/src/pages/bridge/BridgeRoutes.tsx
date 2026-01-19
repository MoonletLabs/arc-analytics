import { useQuery } from '@tanstack/react-query';
import { statsApi, chainsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function BridgeRoutes() {
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

  const getHeatmapColor = (count: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-blue-600 text-white';
    if (intensity > 0.5) return 'bg-blue-500 text-white';
    if (intensity > 0.25) return 'bg-blue-400';
    if (intensity > 0) return 'bg-blue-300';
    return 'bg-muted';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bridge Routes</h1>
        <p className="text-muted-foreground">
          Cross-chain transfer routes and volume
        </p>
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
                    <th className="p-2 text-xs text-muted-foreground text-left">From / To</th>
                    {chainList.map((chain) => (
                      <th key={chain} className="p-2 text-xs text-muted-foreground text-center">
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
                              <div className="w-14 h-14 bg-muted-foreground/10 rounded" />
                            ) : (
                              <div
                                className={`w-14 h-14 rounded flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                                  data ? getHeatmapColor(data.count) : 'bg-muted'
                                }`}
                                title={
                                  data
                                    ? `${formatChainName(source)} → ${formatChainName(dest)}: ${data.count} transfers, $${formatNumber(parseFloat(data.volume) / 1e6)}M`
                                    : 'No transfers'
                                }
                              >
                                <span>{data?.count || '-'}</span>
                                {data && (
                                  <span className="text-[10px] opacity-75">
                                    ${formatNumber(parseFloat(data.volume) / 1e6)}M
                                  </span>
                                )}
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

      {/* All Routes List */}
      <Card>
        <CardHeader>
          <CardTitle>All Routes by Volume</CardTitle>
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
                  className="p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold text-primary shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div
                        className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium truncate ${
                          route.sourceChain === 'arc_testnet'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-muted'
                        }`}
                      >
                        {formatChainName(route.sourceChain)}
                      </div>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <div
                        className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium truncate ${
                          route.destChain === 'arc_testnet'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-muted'
                        }`}
                      >
                        {formatChainName(route.destChain)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-center">
                    <div className="flex-1">
                      <div className="text-sm sm:text-lg font-bold">
                        {route.transferCount.toLocaleString()}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">transfers</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm sm:text-lg font-bold">
                        ${formatNumber(parseFloat(route.totalVolume) / 1e6)}M
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">volume</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm sm:text-lg font-bold">
                        ${formatNumber(parseFloat(route.avgAmount) / 1e6)}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">avg size</div>
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

function formatChainName(id: string) {
  const names: Record<string, string> = {
    'arc_testnet': 'Arc',
    'ethereum_sepolia': 'Ethereum',
    'arbitrum_sepolia': 'Arbitrum',
    'base_sepolia': 'Base',
  };
  return names[id] || id.split('_')[0];
}
