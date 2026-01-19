import { useQuery } from '@tanstack/react-query';
import { statsApi, type HolderEntry } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatNumber, formatAddress } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertTriangle, PieChart as PieIcon, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';

interface ConcentrationRiskSectionProps {
  token?: string;
}

const COLORS = ['#2775CA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

export function ConcentrationRiskSection({ token }: ConcentrationRiskSectionProps) {
  const [whaleThreshold, setWhaleThreshold] = useState('100000000000'); // 100k default

  const { data: topHoldersData, isLoading: holdersLoading } = useQuery({
    queryKey: ['stats', 'top-holders', token],
    queryFn: () => statsApi.getTopHolders(token, 20, 30),
    refetchInterval: 60000,
  });

  const { data: hhiData, isLoading: hhiLoading } = useQuery({
    queryKey: ['stats', 'hhi', token],
    queryFn: () => statsApi.getHHI(token, 30),
    refetchInterval: 60000,
  });

  const { data: whaleData, isLoading: whaleLoading } = useQuery({
    queryKey: ['stats', 'whale-alerts', token, whaleThreshold],
    queryFn: () => statsApi.getWhaleAlerts(token, 7, whaleThreshold, 20),
    refetchInterval: 60000,
  });

  // Get concentration color
  const getConcentrationColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Moderate': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Prepare pie chart data for top holders
  const pieChartData = topHoldersData?.data?.[0]?.holders?.slice(0, 10).map((h: HolderEntry, i: number) => ({
    name: formatAddress(h.address),
    value: parseFloat(h.sharePct),
    color: COLORS[i % COLORS.length],
  })) || [];

  // Add "Others" slice
  if (topHoldersData?.data?.[0]) {
    const top10Share = pieChartData.reduce((sum: number, d: any) => sum + d.value, 0);
    if (top10Share < 100) {
      pieChartData.push({
        name: 'Others',
        value: 100 - top10Share,
        color: '#9CA3AF',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Concentration & Risk</h2>
        <p className="text-muted-foreground">
          Top holders share, concentration indices, and whale transfer alerts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {hhiData?.data?.map((hhi) => (
          <Card key={hhi.token}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{hhi.token} HHI</CardTitle>
              <PieIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {hhiLoading ? (
                <div className="h-12 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{formatNumber(parseFloat(hhi.hhi))}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getConcentrationColor(hhi.concentration)}`}>
                      {hhi.concentration}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hhi.holderCount} holders
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}

        {topHoldersData?.data?.map((tokenData) => (
          <Card key={`share-${tokenData.token}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tokenData.token} Top 10 Share</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {holdersLoading ? (
                <div className="h-12 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{tokenData.top10Share}%</div>
                  <p className="text-xs text-muted-foreground">
                    Top 50: {tokenData.top50Share}%
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Whale Alerts (7d)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {whaleLoading ? (
              <div className="h-12 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {whaleData?.data?.summary?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {whaleData?.data?.summary?.totalVolumeFormatted || '$0'} total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Holders Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Top 10 Holders Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holdersLoading ? (
              <div className="h-[300px] bg-muted animate-pulse rounded" />
            ) : pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  >
                    {pieChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Share: {data.value.toFixed(2)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No holder data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Holders Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Holders by Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {holdersLoading ? (
              <div className="h-[300px] bg-muted animate-pulse rounded" />
            ) : topHoldersData?.data?.[0]?.holders ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topHoldersData.data[0].holders.slice(0, 10)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="address"
                    tickFormatter={formatAddress}
                    className="text-xs"
                    width={100}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-mono text-sm">{formatAddress(data.address)}</p>
                            <p className="text-sm text-muted-foreground">
                              Balance: {data.balanceFormatted}
                            </p>
                            <p className="text-sm text-usdc">
                              Share: {data.sharePct}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sharePct" fill="#2775CA" name="Share %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No holder data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Whale Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Whale Transfers
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Threshold:</label>
              <select
                value={whaleThreshold}
                onChange={(e) => setWhaleThreshold(e.target.value)}
                className="px-2 py-1 text-sm border rounded bg-background"
              >
                <option value="10000000000">$10,000+</option>
                <option value="50000000000">$50,000+</option>
                <option value="100000000000">$100,000+</option>
                <option value="500000000000">$500,000+</option>
                <option value="1000000000000">$1,000,000+</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {whaleLoading ? (
            <div className="h-[200px] bg-muted animate-pulse rounded" />
          ) : whaleData?.data?.transfers && whaleData.data.transfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Token</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">From</th>
                    <th className="pb-2 font-medium">To</th>
                    <th className="pb-2 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {whaleData.data.transfers.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-2 text-sm">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2">
                        <span className={`text-sm font-medium ${tx.token === 'USDC' ? 'text-usdc' : 'text-eurc'}`}>
                          {tx.token}
                        </span>
                      </td>
                      <td className="py-2 text-sm font-medium">
                        {tx.amountFormatted}
                      </td>
                      <td className="py-2 font-mono text-sm">
                        {formatAddress(tx.fromAddress)}
                      </td>
                      <td className="py-2 font-mono text-sm">
                        {formatAddress(tx.toAddress)}
                      </td>
                      <td className="py-2 font-mono text-sm text-blue-600">
                        <a
                          href={`https://explorer.arc.network/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {formatAddress(tx.txHash)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No whale transfers above threshold in the last 7 days
            </div>
          )}
        </CardContent>
      </Card>

      {/* HHI Interpretation */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Concentration Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="font-medium text-green-700 dark:text-green-400">Low Concentration</h4>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                HHI &lt; 1,500
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Indicates a competitive, well-distributed market with many participants. Lower risk of manipulation.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <h4 className="font-medium text-yellow-700 dark:text-yellow-400">Moderate Concentration</h4>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                HHI 1,500 - 2,500
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Some consolidation among holders. Monitor for increasing concentration trends.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <h4 className="font-medium text-red-700 dark:text-red-400">High Concentration</h4>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                HHI &gt; 2,500
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Highly concentrated among few holders. Higher risk of price impact from large transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
