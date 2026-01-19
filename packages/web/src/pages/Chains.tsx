import { useQuery } from '@tanstack/react-query';
import { chainsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';

export function Chains() {
  const { data: chains, isLoading } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainsApi.list(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chains</h1>
        <p className="text-muted-foreground">
          Supported chains and their transfer activity
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : chains?.data && chains.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chains.data.map((chain) => (
            <Link key={chain.id} to={`/chains/${chain.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{chain.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Chain ID: {chain.chainId}
                      </p>
                    </div>
                    <Badge variant={chain.isTestnet ? 'secondary' : 'default'}>
                      {chain.isTestnet ? 'Testnet' : 'Mainnet'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Transfers</span>
                      <span className="font-medium">
                        {chain.stats.totalTransfers.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <ArrowDownRight className="h-4 w-4" />
                          <span className="text-xs">Inbound</span>
                        </div>
                        <div className="text-lg font-semibold mt-1">
                          {chain.stats.inboundTransfers.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10">
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="text-xs">Outbound</span>
                        </div>
                        <div className="text-lg font-semibold mt-1">
                          {chain.stats.outboundTransfers.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <a
                      href={chain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No chains found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
