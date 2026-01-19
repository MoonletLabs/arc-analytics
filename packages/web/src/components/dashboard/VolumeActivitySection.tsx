import { useQuery } from '@tanstack/react-query';
import { statsApi, type TokenMetrics } from '@/lib/api';
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
} from 'recharts';
import { Activity, Users, TrendingUp, BarChart3 } from 'lucide-react';

interface VolumeActivitySectionProps {
  token?: string;
}

export function VolumeActivitySection({ token }: VolumeActivitySectionProps) {
  const { data: hourlyData, isLoading: hourlyLoading } = useQuery({
    queryKey: ['stats', 'hourly', token],
    queryFn: () => statsApi.getHourlyVolume(token, 168), // 7 days
    refetchInterval: 60000,
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['stats', 'metrics', token],
    queryFn: () => statsApi.getTransferMetrics(token, 7),
    refetchInterval: 60000,
  });

  const { data: dailyWallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['stats', 'wallets', 'daily', token],
    queryFn: () => statsApi.getDailyWallets(token, 30),
    refetchInterval: 60000,
  });

  // Process hourly data for chart
  const hourlyChartData = hourlyData?.data
    ? [...hourlyData.data]
        .sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime())
        .reduce((acc: any[], item) => {
          const hourKey = item.hour;
          const existing = acc.find((d) => d.hour === hourKey);
          const volume = parseFloat(item.totalVolume) / 1e6;
          
          if (existing) {
            existing.volume += volume;
            existing.transfers += item.transferCount;
          } else {
            acc.push({
              hour: hourKey,
              volume,
              transfers: item.transferCount,
              token: item.token,
            });
          }
          return acc;
        }, [])
    : [];

  // Process daily wallets for chart
  const walletsChartData = dailyWallets?.data
    ? [...dailyWallets.data]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .reduce((acc: any[], item) => {
          const dateKey = item.date;
          const existing = acc.find((d) => d.date === dateKey);
          const senders = parseInt(String(item.unique_senders)) || 0;
          const receivers = parseInt(String(item.unique_receivers)) || 0;
          const transfers = parseInt(String(item.transfer_count)) || 0;
          
          if (existing) {
            existing.senders += senders;
            existing.receivers += receivers;
            existing.transfers += transfers;
          } else {
            acc.push({
              date: dateKey,
              senders,
              receivers,
              transfers,
            });
          }
          return acc;
        }, [])
    : [];

  const metrics = metricsData?.data;
  const totalTransfers = metrics?.byToken?.reduce((sum, t) => sum + t.transferCount, 0) || 0;
  const totalVolume = metrics?.byToken?.reduce((sum, t) => sum + parseFloat(t.totalVolume), 0) || 0;

  // Get median and p90 for display
  const primaryToken = metrics?.byToken?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Volume & Activity</h2>
        <p className="text-muted-foreground">
          Transfer volume, counts, and wallet activity on Arc
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">7d Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${formatNumber(totalVolume / 1e6)}M
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalTransfers.toLocaleString()} transfers
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Wallets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.wallets?.totalUniqueWallets?.toLocaleString() || 0}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-green-600">{metrics?.wallets?.uniqueSenders || 0} senders</span>
                  <span className="text-blue-600">{metrics?.wallets?.uniqueReceivers || 0} receivers</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Transfer</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${primaryToken?.medianAmountFormatted || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  "typical" transfer size
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P90 Transfer</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${primaryToken?.p90AmountFormatted || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  90th percentile (whale territory)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Transfer Volume (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {hourlyLoading ? (
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          ) : hourlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hourlyChartData}>
                <defs>
                  <linearGradient id="hourlyVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2775CA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2775CA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(hour) => {
                    const d = new Date(hour);
                    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
                  }}
                  className="text-xs"
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                  className="text-xs"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">
                            {new Date(data.hour).toLocaleString()}
                          </p>
                          <p className="text-sm text-usdc">
                            Volume: ${formatNumber(data.volume)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Transfers: {data.transfers}
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
                  fill="url(#hourlyVolumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hourly data available. Run the indexer to collect transfer data.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Unique Wallets */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Unique Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            {walletsLoading ? (
              <div className="h-[250px] bg-muted animate-pulse rounded" />
            ) : walletsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={walletsChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">
                              {new Date(data.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-green-600">
                              Senders: {data.senders}
                            </p>
                            <p className="text-sm text-blue-600">
                              Receivers: {data.receivers}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Transfers: {data.transfers}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="senders" fill="#10B981" name="Senders" stackId="a" />
                  <Bar dataKey="receivers" fill="#2775CA" name="Receivers" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No wallet data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Size Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-[250px] bg-muted animate-pulse rounded" />
            ) : metrics?.byToken && metrics.byToken.length > 0 ? (
              <div className="space-y-4">
                {metrics.byToken.map((tokenMetrics: TokenMetrics) => (
                  <div key={tokenMetrics.token} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tokenMetrics.token}</span>
                      <span className="text-sm text-muted-foreground">
                        {tokenMetrics.transferCount.toLocaleString()} transfers
                      </span>
                    </div>
                    <div className="relative h-8 bg-muted rounded overflow-hidden">
                      {/* P10 marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                        style={{ left: '10%' }}
                        title={`P10: $${tokenMetrics.p10AmountFormatted}`}
                      />
                      {/* Median marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-green-500 z-10"
                        style={{ left: '50%' }}
                        title={`Median: $${tokenMetrics.medianAmountFormatted}`}
                      />
                      {/* P90 marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10"
                        style={{ left: '90%' }}
                        title={`P90: $${tokenMetrics.p90AmountFormatted}`}
                      />
                      {/* Fill to median */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-blue-400/30"
                        style={{ width: '50%' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>P10: ${tokenMetrics.p10AmountFormatted}</span>
                      <span className="text-green-600">Median: ${tokenMetrics.medianAmountFormatted}</span>
                      <span className="text-orange-600">P90: ${tokenMetrics.p90AmountFormatted}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No transfer metrics available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
