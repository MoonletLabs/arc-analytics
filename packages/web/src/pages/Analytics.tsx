import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#2775CA', '#0052FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function Analytics() {
  const { data: overview } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.getOverview(),
  });

  const { data: dailyVolume, isLoading: dailyLoading } = useQuery({
    queryKey: ['stats', 'volume', 'daily'],
    queryFn: () => statsApi.getDailyVolume(),
  });

  const { data: volumeByChain, isLoading: chainLoading } = useQuery({
    queryKey: ['stats', 'volume', 'by-chain'],
    queryFn: () => statsApi.getVolumeByChain(),
  });

  const { data: routes } = useQuery({
    queryKey: ['stats', 'routes'],
    queryFn: () => statsApi.getRoutes(undefined, 10),
  });

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

  // Process chain volume data for chart
  const chainChartData = volumeByChain?.data
    ? volumeByChain.data.map((chain) => ({
        name: chain.chain.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()),
        outbound: parseFloat(chain.outboundVolume) / 1e6,
        inbound: parseFloat(chain.inboundVolume) / 1e6,
        total:
          (parseFloat(chain.outboundVolume) + parseFloat(chain.inboundVolume)) / 1e6,
      }))
    : [];

  // Process routes for pie chart
  const routePieData = routes?.data?.slice(0, 6).map((route, i) => ({
    name: `${route.sourceChain} → ${route.destChain}`.replace(/_/g, ' '),
    value: route.transferCount,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Volume trends and transfer analytics
        </p>
      </div>

      {/* Summary Cards */}
      {overview?.data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                ${formatNumber(overview.data.totalVolumeFormatted)}
              </div>
              <p className="text-sm text-muted-foreground">All-time Volume</p>
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
        </div>
      )}

      {/* Daily Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Volume</CardTitle>
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
        {/* Volume by Chain */}
        <Card>
          <CardHeader>
            <CardTitle>Volume by Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {chainLoading ? (
              <div className="h-[300px] bg-muted animate-pulse rounded" />
            ) : chainChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chainChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${formatNumber(value)}M`}
                    className="text-xs"
                  />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm text-green-600">
                              Inbound: ${formatNumber(payload[0].payload.inbound)}M
                            </p>
                            <p className="text-sm text-blue-600">
                              Outbound: ${formatNumber(payload[0].payload.outbound)}M
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="inbound" fill="#10B981" name="Inbound" stackId="a" />
                  <Bar dataKey="outbound" fill="#2775CA" name="Outbound" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Top Routes</CardTitle>
          </CardHeader>
          <CardContent>
            {routePieData && routePieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={routePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
