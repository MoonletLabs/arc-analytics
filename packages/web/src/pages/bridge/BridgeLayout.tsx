import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart3, ArrowLeftRight, Layers, GitBranch } from 'lucide-react';

interface BridgeLayoutProps {
  children: ReactNode;
}

const subNavItems = [
  { path: '/bridge', label: 'Overview', shortLabel: 'Overview', icon: BarChart3, exact: true },
  { path: '/bridge/transfers', label: 'Bridge Transfers', shortLabel: 'Transfers', icon: ArrowLeftRight },
  { path: '/bridge/chains', label: 'Chains', shortLabel: 'Chains', icon: Layers },
  { path: '/bridge/routes', label: 'Routes', shortLabel: 'Routes', icon: GitBranch },
];

export function BridgeLayout({ children }: BridgeLayoutProps) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="border-b">
        <nav className="flex -mb-px">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden min-[400px]:inline truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
