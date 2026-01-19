import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GitBranch,
  Wallet,
  Moon,
  Sun,
  RefreshCw,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bridge', label: 'Bridge', icon: GitBranch },
  { path: '/fx', label: 'FX', icon: RefreshCw },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 mr-2 rounded-md hover:bg-muted md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/" className="flex items-center md:mr-8">
              <img 
                src="/logo-light.png" 
                alt="Arc Analytics" 
                className="h-7 sm:h-8 dark:hidden"
              />
              <img 
                src="/logo-dark.png" 
                alt="Arc Analytics" 
                className="h-7 sm:h-8 hidden dark:block"
              />
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <WalletSearch />
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              {/* Mobile wallet search */}
              <div className="pt-2 px-3 sm:hidden">
                <WalletSearch fullWidth />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
          <p className="text-sm text-muted-foreground">
            Powered by{' '}
            <a
              href="https://moonlet.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Moonlet
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Arc Testnet Data |{' '}
            <a
              href="https://arc.network"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              arc.network
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function WalletSearch({ fullWidth = false }: { fullWidth?: boolean }) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      window.location.href = `/wallet/${address.trim()}`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <div className="relative">
        <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search wallet..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={cn(
            "h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            fullWidth ? "w-full" : "w-[200px]"
          )}
        />
      </div>
    </form>
  );
}
