import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { transfersApi, chainsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge, TokenBadge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatNumber, formatAddress, formatDateTime, getExplorerUrl } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ExternalLink, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export function BridgeTransfers() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    token: '',
    sourceChain: '',
    destChain: '',
    status: '',
  });

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainsApi.list(),
  });

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers', page, filters],
    queryFn: () =>
      transfersApi.list({
        page: page.toString(),
        limit: '20',
        ...(filters.token && { token: filters.token }),
        ...(filters.sourceChain && { sourceChain: filters.sourceChain }),
        ...(filters.destChain && { destChain: filters.destChain }),
        ...(filters.status && { status: filters.status }),
        sortBy: 'burnTimestamp',
        sortOrder: 'desc',
      }),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ token: '', sourceChain: '', destChain: '', status: '' });
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bridge Transfers</h1>
        <p className="text-muted-foreground">
          Browse all USDC/EURC cross-chain CCTP transfers
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Token</label>
              <select
                value={filters.token}
                onChange={(e) => handleFilterChange('token', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">All tokens</option>
                <option value="USDC">USDC</option>
                <option value="EURC">EURC</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Source Chain</label>
              <select
                value={filters.sourceChain}
                onChange={(e) => handleFilterChange('sourceChain', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">All chains</option>
                {chains?.data?.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Dest Chain</label>
              <select
                value={filters.destChain}
                onChange={(e) => handleFilterChange('destChain', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">All chains</option>
                {chains?.data?.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="attested">Attested</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : transfers?.data && transfers.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-3 px-2">Token</th>
                      <th className="text-left py-3 px-2">Amount</th>
                      <th className="text-left py-3 px-2">From</th>
                      <th className="text-left py-3 px-2">To</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-left py-3 px-2">Time</th>
                      <th className="text-left py-3 px-2">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.data.map((transfer) => (
                      <tr
                        key={transfer.id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-3 px-2">
                          <TokenBadge token={transfer.token} />
                        </td>
                        <td className="py-3 px-2 font-medium">
                          ${formatNumber(transfer.amountFormatted)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm">
                            {formatChainName(transfer.sourceChain)}
                          </div>
                          <Link
                            to={`/wallet/${transfer.sourceAddress}`}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            {formatAddress(transfer.sourceAddress)}
                          </Link>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm">
                            {formatChainName(transfer.destChain)}
                          </div>
                          <Link
                            to={`/wallet/${transfer.destAddress}`}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            {formatAddress(transfer.destAddress)}
                          </Link>
                        </td>
                        <td className="py-3 px-2">
                          <StatusBadge status={transfer.status} />
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {formatDateTime(transfer.burnTimestamp)}
                        </td>
                        <td className="py-3 px-2">
                          <a
                            href={getExplorerUrl(
                              transfer.sourceChain,
                              transfer.sourceTxHash
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {formatAddress(transfer.sourceTxHash, 4)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} to{' '}
                  {Math.min(page * 20, transfers.pagination.total)} of{' '}
                  {transfers.pagination.total.toLocaleString()} transfers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm">
                    Page {page} of {transfers.pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(transfers.pagination.totalPages, p + 1))
                    }
                    disabled={page === transfers.pagination.totalPages}
                    className="p-2 rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No transfers found
            </p>
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
