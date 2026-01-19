import { useQuery } from '@tanstack/react-query';
import { statsApi, type NetFlowEntry } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatAddress } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NetFlowsSectionProps {
  token?: string;
  days?: number;
}

export function NetFlowsSection({ token, days = 7 }: NetFlowsSectionProps) {
  const { data: topSinks, isLoading: sinksLoading } = useQuery({
    queryKey: ['stats', 'flows', 'sinks', token, days],
    queryFn: () => statsApi.getTopSinks(token, days, 10),
    refetchInterval: 60000,
  });

  const { data: topSources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['stats', 'flows', 'sources', token, days],
    queryFn: () => statsApi.getTopSources(token, days, 10),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Net Flows</h2>
        <p className="text-muted-foreground">
          Top receivers and senders of stablecoins (inflow - outflow over {days} days)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Sinks (Net Receivers) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-green-500" />
              Top Sinks (Net Receivers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sinksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : topSinks?.data && topSinks.data.length > 0 ? (
              <div className="space-y-2">
                {topSinks.data.map((entry: NetFlowEntry, index: number) => (
                  <FlowRow key={entry.address} entry={entry} rank={index + 1} type="sink" />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No sink data available. Run the indexer to collect transfer data.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sources (Net Senders) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-blue-500" />
              Top Sources (Net Senders)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : topSources?.data && topSources.data.length > 0 ? (
              <div className="space-y-2">
                {topSources.data.map((entry: NetFlowEntry, index: number) => (
                  <FlowRow key={entry.address} entry={entry} rank={index + 1} type="source" />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No source data available. Run the indexer to collect transfer data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FlowRowProps {
  entry: NetFlowEntry;
  rank: number;
  type: 'sink' | 'source';
}

function FlowRow({ entry, rank, type }: FlowRowProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-6">
          #{rank}
        </span>
        <div>
          <Link
            to={`/wallets/${entry.address}`}
            className="font-mono text-sm hover:text-primary flex items-center gap-1"
          >
            {formatAddress(entry.address, 6)}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="text-green-600">+{entry.inflowCount} in</span>
            <span className="text-blue-600">-{entry.outflowCount} out</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-medium ${type === 'sink' ? 'text-green-600' : 'text-blue-600'}`}>
          {type === 'sink' ? '+' : '-'}${entry.netFlowFormatted}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry.token}
        </div>
      </div>
    </div>
  );
}
