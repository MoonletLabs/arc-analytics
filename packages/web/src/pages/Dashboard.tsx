import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { VolumeActivitySection } from '@/components/dashboard/VolumeActivitySection';
import { NetFlowsSection } from '@/components/dashboard/NetFlowsSection';
import { VelocityRetentionSection } from '@/components/dashboard/VelocityRetentionSection';
import { ConcentrationRiskSection } from '@/components/dashboard/ConcentrationRiskSection';
import { formatNumber, cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Users,
  TrendingUp,
  RefreshCw,
  Layers,
  GitBranch,
  BarChart3,
  Activity,
  ArrowLeftRight,
  Zap,
  Shield,
} from 'lucide-react';

type AnalyticsTab = 'volume' | 'flows' | 'velocity' | 'concentration';

const analyticsTabs: { id: AnalyticsTab; label: string; icon: typeof Activity }[] = [
  { id: 'volume', label: 'Volume & Activity', icon: Activity },
  { id: 'flows', label: 'Net Flows', icon: ArrowLeftRight },
  { id: 'velocity', label: 'Velocity & Retention', icon: Zap },
  { id: 'concentration', label: 'Concentration & Risk', icon: Shield },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('volume');

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['stats', 'metrics'],
    queryFn: () => statsApi.getTransferMetrics(undefined, 7),
    refetchInterval: 60000,
  });

  const metrics = metricsData?.data;
  const totalVolume = metrics?.byToken?.reduce((sum, t) => sum + parseFloat(t.totalVolume), 0) || 0;
  const totalTransfers = metrics?.byToken?.reduce((sum, t) => sum + t.transferCount, 0) || 0;
  
  // Get primary token metrics for median display
  const primaryToken = metrics?.byToken?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Arc Analytics Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Real-time stablecoin analytics for Arc Network
        </p>
      </div>

      {/* Stablecoin Overview Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {metricsLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : metrics ? (
          <>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">7d Volume</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${formatNumber(totalVolume / 1e6)}M</div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  {metrics.byToken?.map(t => (
                    <span key={t.token} className={t.token === 'USDC' ? 'text-usdc' : 'text-eurc'}>
                      {t.token}: ${formatNumber(parseFloat(t.totalVolume) / 1e6)}M
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">7d Transfers</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTransfers.toLocaleString()}</div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  {metrics.byToken?.map(t => (
                    <span key={t.token}>
                      {t.token}: {t.transferCount.toLocaleString()}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Wallets</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.wallets?.totalUniqueWallets?.toLocaleString() || 0}</div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">{metrics.wallets?.uniqueSenders || 0} senders</span>
                  <span className="text-blue-600">{metrics.wallets?.uniqueReceivers || 0} receivers</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Median Transfer</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${primaryToken?.medianAmountFormatted || '0'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  P90: ${primaryToken?.p90AmountFormatted || '0'}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/bridge">
          <Card className="hover:border-blue-400 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <GitBranch className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Bridge</h3>
                  <p className="text-sm text-muted-foreground">CCTP cross-chain transfers & analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/fx">
          <Card className="hover:border-green-400 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                  <RefreshCw className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">StableFX</h3>
                  <p className="text-sm text-muted-foreground">USDC/EURC swaps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/bridge/chains">
          <Card className="hover:border-blue-400 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Layers className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Chains</h3>
                  <p className="text-sm text-muted-foreground">Connected networks & stats</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Tabs */}
      <div className="border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
          {analyticsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'volume' && <VolumeActivitySection />}
        {activeTab === 'flows' && <NetFlowsSection days={7} />}
        {activeTab === 'velocity' && <VelocityRetentionSection />}
        {activeTab === 'concentration' && <ConcentrationRiskSection />}
      </div>
    </div>
  );
}
