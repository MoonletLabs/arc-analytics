import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  className?: string;
}

const variantStyles = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-green-500/15 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  destructive: 'bg-destructive/15 text-destructive',
  outline: 'border border-input bg-transparent',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'completed'
      ? 'success'
      : status === 'pending'
      ? 'warning'
      : status === 'failed'
      ? 'destructive'
      : 'secondary';

  return <Badge variant={variant}>{status}</Badge>;
}

export function TokenBadge({ token }: { token: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        token === 'USDC' ? 'border-usdc text-usdc' : 'border-eurc text-eurc'
      )}
    >
      {token}
    </Badge>
  );
}
