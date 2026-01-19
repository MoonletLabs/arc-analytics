import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatAddress } from '@/lib/utils';
import { RefreshCw, TrendingUp, Users, DollarSign, ArrowRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchFXStats() {
  const res = await fetch(`${API_URL}/api/fx/stats?days=30`);
  if (!res.ok) throw new Error('Failed to fetch FX stats');
  return res.json();
}

async function fetchFXVolume() {
  const res = await fetch(`${API_URL}/api/fx/volume?days=30`);
  if (!res.ok) throw new Error('Failed to fetch FX volume');
  return res.json();
}

async function fetchFXRate() {
  const res = await fetch(`${API_URL}/api/fx/rate`);
  if (!res.ok) throw new Error('Failed to fetch FX rate');
  return res.json();
}

async function fetchFXSwaps() {
  const res = await fetch(`${API_URL}/api/fx/swaps?limit=10`);
  if (!res.ok) throw new Error('Failed to fetch FX swaps');
  return res.json();
}

async function fetchFXTraders() {
  const res = await fetch(`${API_URL}/api/fx/traders?limit=10`);
  if (!res.ok) throw new Error('Failed to fetch FX traders');
  return res.json();
}

export function FX() {
  const { data: stats } = useQuery({
    queryKey: ['fx', 'stats'],
    queryFn: fetchFXStats,
    refetchInterval: 30000,
  });

  const { data: volume } = useQuery({
    queryKey: ['fx', 'volume'],
    queryFn: fetchFXVolume,
  });

  const { data: rate } = useQuery({
    queryKey: ['fx', 'rate'],
    queryFn: fetchFXRate,
    refetchInterval: 10000,
  });

  const { data: swaps, isLoading: swapsLoading } = useQuery({
    queryKey: ['fx', 'swaps'],
    queryFn: fetchFXSwaps,
    refetchInterval: 15000,
  });

  const { data: traders } = useQuery({
    queryKey: ['fx', 'traders'],
    queryFn: fetchFXTraders,
  });

  const currentRate = rate?.current?.rate || '1.08';
  const rateChange = rate?.daily?.length > 1 
    ? ((parseFloat(rate.daily[rate.daily.length - 1]?.avg_rate) - parseFloat(rate.daily[0]?.avg_rate)) / parseFloat(rate.daily[0]?.avg_rate) * 100).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">StableFX</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          USDC/EURC foreign exchange on Arc
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USDC/EURC Rate</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseFloat(currentRate).toFixed(4)}</div>
            <p className={`text-xs ${parseFloat(rateChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {parseFloat(rateChange) >= 0 ? '+' : ''}{rateChange}% (30d)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30d Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalVolume || '0'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.swapCount || 0} swaps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Traders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueTraders || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgRate || '-'}</div>
            <p className="text-xs text-muted-foreground">30d average</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume & Rate Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {volume?.data?.length > 0 ? (
              <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volume.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => ['$' + (Number(value) / 1e6).toFixed(2) + 'M', 'Volume']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Bar dataKey="totalVolume" fill="#2775CA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>USDC/EURC Rate History</CardTitle>
          </CardHeader>
          <CardContent>
            {rate?.daily?.length > 0 ? (
              <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rate.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.toFixed(4)}
                  />
                  <Tooltip 
                    formatter={(value: any) => [parseFloat(value).toFixed(6), 'Rate']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_rate" 
                    stroke="#2775CA" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Swaps & Top Traders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Swaps</CardTitle>
          </CardHeader>
          <CardContent>
            {swapsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : swaps?.data?.length > 0 ? (
              <div className="space-y-3">
                {swaps.data.map((swap: any) => (
                  <div
                    key={swap.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Badge variant={swap.baseToken === 'USDC' ? 'default' : 'secondary'}>
                          {swap.baseToken}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant={swap.quoteToken === 'USDC' ? 'default' : 'secondary'}>
                          {swap.quoteToken}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {swap.baseAmountFormatted} → {swap.quoteAmountFormatted}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rate: {parseFloat(swap.effectiveRate).toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No swaps found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Traders</CardTitle>
          </CardHeader>
          <CardContent>
            {traders?.data?.length > 0 ? (
              <div className="space-y-3">
                {traders.data.map((trader: any, i: number) => (
                  <div
                    key={trader.address}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium font-mono">
                          {formatAddress(trader.address)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {trader.swapCount} swaps
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${trader.totalVolumeFormatted}
                      </div>
                      <div className="text-xs text-muted-foreground">volume</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No traders found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
