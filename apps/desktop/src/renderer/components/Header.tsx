import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  stats?: {
    appsCount: number;
    accountsCount: number;
    secretsCount: number;
  };
  onAddAccount?: () => void;
  onScanApps?: () => void;
  scanning?: boolean;
  onNavigateTab?: (tab: 'applications' | 'accounts' | 'security') => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  stats,
  onAddAccount,
  onScanApps,
  scanning,
  onNavigateTab,
}) => {
  return (
    <header className="h-12 px-6 border-b border-slate-800/80 bg-[#0B0F17]/60 backdrop-blur flex items-center justify-between flex-shrink-0 z-10">
      {/* Title & Compact Meta */}
      <div key={title} className="flex items-center gap-3 min-w-0 animate-header-fade">
        <h1 className="text-sm font-bold text-white tracking-tight truncate">{title}</h1>
        {stats && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 border-l border-slate-800 pl-3">
            <button
              onClick={() => onNavigateTab?.('applications')}
              className="hover:text-blue-400 hover:underline cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded px-1 -mx-0.5"
              title="View Application Library"
            >
              {stats.appsCount} Apps
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigateTab?.('accounts')}
              className="hover:text-blue-400 hover:underline cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded px-1 -mx-0.5"
              title="View Account Vault"
            >
              {stats.accountsCount} Accounts
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigateTab?.('security')}
              className="hover:text-emerald-400 hover:underline cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 -mx-0.5"
              title="View Security Center"
            >
              {stats.secretsCount} Secrets
            </button>
          </div>
        )}
        {!stats && subtitle && (
          <span className="hidden md:inline text-[11px] text-slate-400 border-l border-slate-800 pl-3 truncate">
            {subtitle}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onScanApps && (
          <button
            onClick={onScanApps}
            onMouseDown={(e) => e.preventDefault()}
            disabled={scanning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-800/50 hover:bg-slate-700/70 text-xs font-medium text-slate-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin text-blue-400' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Scan Apps'}</span>
          </button>
        )}

        {onAddAccount && (
          <button
            onClick={onAddAccount}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        )}
      </div>
    </header>
  );
};
