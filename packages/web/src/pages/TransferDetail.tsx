import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { transfersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge, TokenBadge } from '@/components/ui/Badge';
import { formatNumber, formatAddress, formatDateTime, getExplorerUrl, formatDuration } from '@/lib/utils';
import { ArrowRight, ExternalLink, ArrowLeft, Clock, CheckCircle, Loader2 } from 'lucide-react';

export function TransferDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => transfersApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!transfer?.data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Transfer not found</h2>
        <Link to="/transfers" className="text-primary hover:underline mt-4 inline-block">
          Back to transfers
        </Link>
      </div>
    );
  }

  const { data: t } = transfer;

  const bridgeTime =
    t.burnTimestamp && t.mintTimestamp
      ? Math.floor(
          (new Date(t.mintTimestamp).getTime() - new Date(t.burnTimestamp).getTime()) / 1000
        )
      : null;

  const steps = [
    { key: 'initiated', label: 'Initiated', done: true },
    { key: 'burned', label: 'Burned', done: true },
    { key: 'attested', label: 'Attested', done: t.status !== 'pending' },
    { key: 'completed', label: 'Minted', done: t.status === 'completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/transfers" className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Transfer Details</h1>
          <p className="text-sm text-muted-foreground font-mono">{t.id}</p>
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.done
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : t.status === 'pending' && i === steps.findIndex((s) => !s.done) ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-16 md:w-24 h-1 mx-2 ${
                      steps[i + 1].done ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transfer Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token</span>
              <TokenBadge token={t.token} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">${formatNumber(t.amountFormatted)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={t.status} />
            </div>
            {bridgeTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bridge Time</span>
                <span className="font-medium">{formatDuration(bridgeTime)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nonce</span>
              <span className="font-mono text-sm">{t.nonce}</span>
            </div>
          </CardContent>
        </Card>

        {/* Route */}
        <Card>
          <CardHeader>
            <CardTitle>Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <Link
                  to={`/chains/${t.sourceChain}`}
                  className="font-medium hover:text-primary"
                >
                  {t.sourceChain.replace('_', ' ')}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">Source</p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <Link
                  to={`/chains/${t.destChain}`}
                  className="font-medium hover:text-primary"
                >
                  {t.destChain.replace('_', ' ')}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">Destination</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Addresses & Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Addresses & Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Source */}
            <div className="space-y-4">
              <h4 className="font-medium">Source ({t.sourceChain.replace('_', ' ')})</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Sender</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/wallet/${t.sourceAddress}`}
                      className="font-mono text-sm hover:text-primary"
                    >
                      {formatAddress(t.sourceAddress, 8)}
                    </Link>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Burn Transaction</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={getExplorerUrl(t.sourceChain, t.sourceTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {formatAddress(t.sourceTxHash, 8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Time</span>
                  <p className="text-sm">{formatDateTime(t.burnTimestamp)}</p>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-4">
              <h4 className="font-medium">Destination ({t.destChain.replace('_', ' ')})</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Recipient</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/wallet/${t.destAddress}`}
                      className="font-mono text-sm hover:text-primary"
                    >
                      {formatAddress(t.destAddress, 8)}
                    </Link>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Mint Transaction</span>
                  <div className="flex items-center gap-2">
                    {t.destTxHash ? (
                      <a
                        href={getExplorerUrl(t.destChain, t.destTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {formatAddress(t.destTxHash, 8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending...</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Time</span>
                  <p className="text-sm">
                    {t.mintTimestamp ? formatDateTime(t.mintTimestamp) : 'Pending...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
