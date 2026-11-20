import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Search, Minus, Square, X, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { VaultLockStatus } from '@quickswap/shared';

interface TitleBarProps {
  privacyMode: boolean;
  onTogglePrivacyMode: () => void;
  onOpenCommandPalette: () => void;
  vaultHealthy: boolean;
  vaultLockStatus?: VaultLockStatus | null;
  onOpenUnlockModal?: () => void;
  onLockVault?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  privacyMode,
  onTogglePrivacyMode,
  onOpenCommandPalette,
  vaultHealthy,
  vaultLockStatus,
  onOpenUnlockModal,
  onLockVault,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const api = typeof window !== 'undefined' ? (window.quickswapAPI || window.accountHubAPI) : null;

  useEffect(() => {
    if (api?.window?.isMaximized) {
      api.window.isMaximized().then(setIsMaximized).catch(() => {});
    }
  }, [api]);

  const handleMinimize = () => api?.window?.minimize().catch(() => {});
  const handleMaximize = async () => {
    if (!api?.window) return;
    try {
      const max = await api.window.maximize();
      setIsMaximized(max);
    } catch {}
  };
  const handleClose = () => api?.window?.close().catch(() => {});

  return (
    <div className="h-10 bg-[#080B11] border-b border-slate-800/80 flex items-center justify-between px-3 select-none app-drag z-50">
      {/* Brand & Status */}
      <div className="flex items-center gap-3 no-drag">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="Quickswap" className="w-5 h-5 rounded-md shadow-sm shadow-blue-500/20" />
          <span className="font-bold text-xs tracking-tight text-white">Quickswap</span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">v2.0</span>
        </div>

        {/* Interactive Vault Status Indicator */}
        {vaultLockStatus?.hasMasterPassword ? (
          vaultLockStatus.isLocked ? (
            <button
              onClick={onOpenUnlockModal}
              title="Vault is locked. Click to unlock"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-[10px] text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm shadow-amber-500/10"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="font-medium">Vault: Locked</span>
            </button>
          ) : (
            <button
              onClick={onLockVault}
              title="Vault is unlocked. Click to lock"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Vault: Unlocked</span>
            </button>
          )
        ) : (
          <button
            onClick={onOpenUnlockModal}
            title="Click to set a Master Password"
            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:border-slate-700 transition-all cursor-pointer"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${vaultHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{vaultHealthy ? 'Vault Hardware-Secured' : 'Degraded'}</span>
          </button>
        )}
      </div>

      {/* Center Search Pill (Ctrl+K trigger) */}
      <div className="flex-1 max-w-sm mx-4 no-drag">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px]">Search accounts, apps, commands...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions & Window Controls */}
      <div className="flex items-center gap-2 no-drag">
        {/* Streamer Privacy Mode Button */}
        <button
          onClick={onTogglePrivacyMode}
          title={privacyMode ? 'Disable Streamer Privacy Mode (Ctrl+Shift+P)' : 'Enable Streamer Privacy Mode (Ctrl+Shift+P)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            privacyMode
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          {privacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-[11px] hidden lg:inline">
            {privacyMode ? 'Privacy: Active' : 'Privacy Mode'}
          </span>
        </button>

        {/* Window Controls */}
        <div className="flex items-center ml-2 border-l border-slate-800/80 pl-2">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
