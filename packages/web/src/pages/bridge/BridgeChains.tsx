import { useQuery } from '@tanstack/react-query';
import { chainsApi, statsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Layers, ExternalLink } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function BridgeChains() {
  const { data: chains, isLoading } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainsApi.list(),
  });

  const { data: volumeByChain } = useQuery({
    queryKey: ['stats', 'volume', 'by-chain'],
    queryFn: () => statsApi.getVolumeByChain(),
  });

  // Process chain volume data for chart
  const chainChartData = volumeByChain?.data
    ? volumeByChain.data.map((chain) => ({
        name: formatChainName(chain.chain),
        outbound: parseFloat(chain.outboundVolume) / 1e6,
        inbound: parseFloat(chain.inboundVolume) / 1e6,
        total:
          (parseFloat(chain.outboundVolume) + parseFloat(chain.inboundVolume)) / 1e6,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connected Chains</h1>
        <p className="text-muted-foreground">
          Networks connected via CCTP bridge
        </p>
      </div>

      {/* Volume by Chain Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume by Chain</CardTitle>
        </CardHeader>
        <CardContent>
          {chainChartData.length > 0 ? (
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

      {/* Chains List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            All Chains
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : chains?.data && chains.data.length > 0 ? (
            <div className="space-y-4">
              {chains.data.map((chain) => {
                const chainVolume = volumeByChain?.data?.find(
                  (v) => v.chain === chain.id
                );
                return (
                  <Link
                    key={chain.id}
                    to={`/bridge/chains/${chain.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          chain.id === 'arc_testnet' ? 'bg-blue-500' : 'bg-muted-foreground'
                        }`}
                      />
                      <div>
                        <div
                          className={`font-medium text-lg ${
                            chain.id === 'arc_testnet' ? 'text-blue-600' : ''
                          }`}
                        >
                          {chain.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Chain ID: {chain.chainId} | Domain: {chain.domain}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowDownRight className="h-4 w-4" />
                          <span className="font-medium">
                            {chain.stats.inboundTransfers}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${formatNumber(parseFloat(chainVolume?.inboundVolume || '0') / 1e6)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-blue-600">
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="font-medium">
                            {chain.stats.outboundTransfers}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${formatNumber(parseFloat(chainVolume?.outboundVolume || '0') / 1e6)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{chain.stats.totalTransfers}</div>
                        <div className="text-xs text-muted-foreground">total</div>
                      </div>
                      {chain.explorerUrl && (
                        <a
                          href={chain.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No chains found</p>
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
