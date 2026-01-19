import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart3, ArrowLeftRight, Layers, GitBranch } from 'lucide-react';

interface BridgeLayoutProps {
  children: ReactNode;
}

const subNavItems = [
  { path: '/bridge', label: 'Overview', icon: BarChart3, exact: true },
  { path: '/bridge/transfers', label: 'Bridge Transfers', icon: ArrowLeftRight },
  { path: '/bridge/chains', label: 'Chains', icon: Layers },
  { path: '/bridge/routes', label: 'Routes', icon: GitBranch },
];

export function BridgeLayout({ children }: BridgeLayoutProps) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
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
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
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
