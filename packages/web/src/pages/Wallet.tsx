import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { walletsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge, TokenBadge } from '@/components/ui/Badge';
import { formatNumber, formatAddress, formatDateTime, getExplorerUrl } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { useState } from 'react';

export function Wallet() {
  const { address } = useParams<{ address: string }>();
  const [copied, setCopied] = useState(false);

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet', address],
    queryFn: () => walletsApi.getByAddress(address!),
    enabled: !!address,
  });

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-96 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!wallet?.data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Wallet not found</h2>
        <p className="text-muted-foreground mt-2">
          No transfer history found for this address
        </p>
      </div>
    );
  }

  const { data: walletData } = wallet;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
            {walletData.address}
          </code>
          <button
            onClick={copyAddress}
            className="p-1.5 hover:bg-muted rounded"
            title="Copy address"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-blue-600" />
              Outbound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfers</span>
                <span className="font-medium">
                  {walletData.summary.totalOutboundTransfers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium">
                  {walletData.summary.outboundVolumeFormatted}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-green-600" />
              Inbound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfers</span>
                <span className="font-medium">
                  {walletData.summary.totalInboundTransfers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium">
                  {walletData.summary.inboundVolumeFormatted}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chain Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outbound by Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {walletData.breakdown.outboundByChain.length > 0 ? (
              <div className="space-y-2">
                {walletData.breakdown.outboundByChain.map((item) => (
                  <div
                    key={item.chain}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <Link
                      to={`/chains/${item.chain}`}
                      className="font-medium hover:text-primary"
                    >
                      {item.chain.replace('_', ' ')}
                    </Link>
                    <div className="text-right text-sm">
                      <div>{item.count} transfers</div>
                      <div className="text-muted-foreground">
                        ${formatNumber(parseFloat(item.volume) / 1e6)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No outbound transfers
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inbound by Chain</CardTitle>
          </CardHeader>
          <CardContent>
            {walletData.breakdown.inboundByChain.length > 0 ? (
              <div className="space-y-2">
                {walletData.breakdown.inboundByChain.map((item) => (
                  <div
                    key={item.chain}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <Link
                      to={`/chains/${item.chain}`}
                      className="font-medium hover:text-primary"
                    >
                      {item.chain.replace('_', ' ')}
                    </Link>
                    <div className="text-right text-sm">
                      <div>{item.count} transfers</div>
                      <div className="text-muted-foreground">
                        ${formatNumber(parseFloat(item.volume) / 1e6)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No inbound transfers
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {walletData.recentTransfers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-left py-3 px-2">Token</th>
                    <th className="text-left py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Route</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {walletData.recentTransfers.map((transfer) => {
                    const isOutbound =
                      transfer.sourceAddress.toLowerCase() ===
                      walletData.address.toLowerCase();
                    return (
                      <tr
                        key={transfer.id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-3 px-2">
                          {isOutbound ? (
                            <span className="inline-flex items-center text-blue-600">
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                              Out
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-green-600">
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                              In
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <TokenBadge token={transfer.token} />
                        </td>
                        <td className="py-3 px-2 font-medium">
                          ${formatNumber(transfer.amountFormatted)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          <span className="text-muted-foreground">
                            {transfer.sourceChain.replace('_', ' ')}
                          </span>
                          <span className="mx-1">→</span>
                          <span>{transfer.destChain.replace('_', ' ')}</span>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
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
