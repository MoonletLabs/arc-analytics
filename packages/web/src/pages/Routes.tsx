import { useQuery } from '@tanstack/react-query';
import { statsApi, chainsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function RoutesPage() {
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
    if (intensity > 0.75) return 'bg-usdc text-white';
    if (intensity > 0.5) return 'bg-usdc/70 text-white';
    if (intensity > 0.25) return 'bg-usdc/40';
    if (intensity > 0) return 'bg-usdc/20';
    return 'bg-muted';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Routes</h1>
        <p className="text-muted-foreground">
          Cross-chain transfer routes and popularity
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
                    <th className="p-2 text-xs text-muted-foreground">From / To</th>
                    {chainList.map((chain) => (
                      <th key={chain} className="p-2 text-xs text-muted-foreground">
                        {chain.split('_')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chainList.map((source, i) => (
                    <tr key={source}>
                      <td className="p-2 text-xs font-medium">{source.split('_')[0]}</td>
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
                                    ? `${source} → ${dest}: ${data.count} transfers`
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
          <CardTitle>Popular Routes</CardTitle>
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
                      <div className="text-sm font-medium">
                        {route.sourceChain.replace('_', ' ')}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-medium">
                        {route.destChain.replace('_', ' ')}
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
                        ${formatNumber(parseFloat(route.totalVolume) / 1e6)}M
                      </div>
                      <div className="text-xs text-muted-foreground">volume</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        ${formatNumber(parseFloat(route.avgAmount) / 1e6)}
                      </div>
                      <div className="text-xs text-muted-foreground">avg</div>
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
