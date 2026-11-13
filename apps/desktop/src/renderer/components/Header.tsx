import React from 'react';
import { Plus, RefreshCw, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onAddAccount?: () => void;
  onScanApps?: () => void;
  scanning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onAddAccount,
  onScanApps,
  scanning,
}) => {
  return (
    <header className="h-18 px-8 border-b border-slate-800/80 bg-[#0B0F17]/70 backdrop-blur flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onScanApps && (
          <button
            onClick={onScanApps}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 text-xs font-medium text-slate-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-blue-400' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Scan Installed Apps'}</span>
          </button>
        )}

        {onAddAccount && (
          <button
            onClick={onAddAccount}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        )}
      </div>
    </header>
  );
};
