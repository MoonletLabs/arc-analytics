import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
  Legend,
} from 'recharts';
import { Gauge, Clock, Users, UserPlus } from 'lucide-react';

interface VelocityRetentionSectionProps {
  token?: string;
}

export function VelocityRetentionSection({ token }: VelocityRetentionSectionProps) {
  const { data: velocityData, isLoading: velocityLoading } = useQuery({
    queryKey: ['stats', 'velocity', token],
    queryFn: () => statsApi.getVelocity(token, 7),
    refetchInterval: 60000,
  });

  const { data: dormancyData, isLoading: dormancyLoading } = useQuery({
    queryKey: ['stats', 'dormancy', token],
    queryFn: () => statsApi.getDormancy(token),
    refetchInterval: 60000,
  });

  const { data: retentionData, isLoading: retentionLoading } = useQuery({
    queryKey: ['stats', 'retention', token],
    queryFn: () => statsApi.getWalletRetention(token, 14),
    refetchInterval: 60000,
  });

  // Process retention data for chart
  const retentionChartData = retentionData?.data
    ? [...retentionData.data]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .reduce((acc: any[], item) => {
          const dateKey = item.date;
          const existing = acc.find((d) => d.date === dateKey);
          
          if (existing) {
            existing.newWallets += item.newWallets;
            existing.returningWallets += item.returningWallets;
            existing.totalActive += item.totalActive;
          } else {
            acc.push({
              date: dateKey,
              newWallets: item.newWallets,
              returningWallets: item.returningWallets,
              totalActive: item.totalActive,
              retentionRate: parseFloat(item.retentionRate),
            });
          }
          return acc;
        }, [])
    : [];

  // Get velocity description color
  const getVelocityColor = (description: string) => {
    switch (description) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  // Get dormancy health color
  const getDormancyColor = (rate: number) => {
    if (rate < 30) return 'text-green-600';
    if (rate < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate average retention rate
  const avgRetention = retentionChartData.length > 0
    ? (retentionChartData.reduce((sum, d) => sum + d.retentionRate, 0) / retentionChartData.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Velocity & Retention</h2>
        <p className="text-muted-foreground">
          How actively stablecoins are being used and wallet engagement patterns
        </p>
      </div>

      {/* Velocity Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {velocityLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          velocityData?.data?.map((v) => (
            <Card key={v.token}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{v.token} Velocity</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{v.velocity}x</span>
                  <span className={`text-sm font-medium ${getVelocityColor(v.velocityDescription)}`}>
                    {v.velocityDescription}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Volume: {v.totalVolumeFormatted}</p>
                  <p>Active Supply: {v.activeSupplyFormatted}</p>
                  <p>{v.activeWallets.toLocaleString()} active wallets</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Retention</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {retentionLoading ? (
              <div className="h-20 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{avgRetention}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Returning wallets vs total active (14d avg)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dormancy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Wallet Dormancy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dormancyLoading ? (
            <div className="h-[200px] bg-muted animate-pulse rounded" />
          ) : dormancyData?.data && dormancyData.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-4">
              {dormancyData.data.map((threshold) => (
                <div key={threshold.threshold} className="space-y-3">
                  <h4 className="font-medium text-center">
                    {threshold.threshold}+ days inactive
                  </h4>
                  {threshold.data.map((d) => (
                    <div key={d.token} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{d.token}</span>
                        <span className={`text-sm font-medium ${getDormancyColor(parseFloat(d.dormancyRate))}`}>
                          {d.dormancyRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div 
                          className={`h-full ${parseFloat(d.dormancyRate) < 30 ? 'bg-green-500' : parseFloat(d.dormancyRate) < 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${d.dormancyRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.dormantWallets.toLocaleString()} of {d.totalWallets.toLocaleString()} wallets
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No dormancy data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* New vs Returning Wallets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New vs Returning Wallets (14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {retentionLoading ? (
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          ) : retentionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={retentionChartData}>
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
                          <p className="text-sm text-purple-600">
                            New Wallets: {data.newWallets}
                          </p>
                          <p className="text-sm text-blue-600">
                            Returning: {data.returningWallets}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Active: {data.totalActive}
                          </p>
                          <p className="text-sm text-green-600">
                            Retention: {data.retentionRate.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="newWallets" fill="#9333EA" name="New Wallets" stackId="a" />
                <Bar dataKey="returningWallets" fill="#2775CA" name="Returning Wallets" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No retention data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retention Rate Trend */}
      {retentionChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Retention Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={retentionChartData}>
                <defs>
                  <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  className="text-xs" 
                />
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
                            Retention: {data.retentionRate.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="retentionRate"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#retentionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
