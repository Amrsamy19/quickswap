import React, { useState, useEffect, useRef } from 'react';
import { Application, Account } from '@quickswap/shared';
import {
  Search,
  Play,
  ShieldCheck,
  History,
  Settings,
  Plus,
  RefreshCw,
  Eye,
  Command,
} from 'lucide-react';
import { AppIcon } from './AppIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  accounts: Account[];
  onLaunchAccount: (id: string) => Promise<any>;
  onNavigateTab: (tab: any, appId?: string) => void;
  onAddAccount: () => void;
  onScanApps: () => void;
  onTogglePrivacy: () => void;
}

interface PaletteItem {
  id: string;
  type: 'account' | 'app' | 'action';
  title: string;
  subtitle: string;
  icon?: any;
  app?: Application;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  applications,
  accounts,
  onLaunchAccount,
  onNavigateTab,
  onAddAccount,
  onScanApps,
  onTogglePrivacy,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build items list
  const accountItems: PaletteItem[] = accounts.map((acc) => {
    const app = applications.find((a) => a.id === acc.applicationId);
    return {
      id: `acc-${acc.id}`,
      type: 'account',
      title: acc.displayName,
      subtitle: `${app?.name || 'App'} • ${acc.username || 'No username'} ${acc.region ? `[${acc.region}]` : ''}`,
      app,
      onSelect: () => {
        onLaunchAccount(acc.id);
        onClose();
      },
    };
  });

  const appItems: PaletteItem[] = applications.map((app) => ({
    id: `app-${app.id}`,
    type: 'app',
    title: app.name,
    subtitle: `${app.category} • ${app.accountCount || 0} accounts`,
    app,
    onSelect: () => {
      onNavigateTab('accounts', app.id);
      onClose();
    },
  }));

  const actionItems: PaletteItem[] = [
    {
      id: 'act-add',
      type: 'action',
      title: 'Add New Account',
      subtitle: 'Create a new account profile and save credentials',
      icon: Plus,
      onSelect: () => {
        onAddAccount();
        onClose();
      },
    },
    {
      id: 'act-scan',
      type: 'action',
      title: 'Scan Installed Applications',
      subtitle: 'Detect Riot Games, Steam, Epic Games, Discord',
      icon: RefreshCw,
      onSelect: () => {
        onScanApps();
        onClose();
      },
    },
    {
      id: 'act-privacy',
      type: 'action',
      title: 'Toggle Streamer Privacy Mode',
      subtitle: 'Blur or reveal sensitive usernames and emails',
      icon: Eye,
      onSelect: () => {
        onTogglePrivacy();
        onClose();
      },
    },
    {
      id: 'act-security',
      type: 'action',
      title: 'Open Security Center',
      subtitle: 'Inspect hardware-backed vault and audit integrity',
      icon: ShieldCheck,
      onSelect: () => {
        onNavigateTab('security');
        onClose();
      },
    },
    {
      id: 'act-activity',
      type: 'action',
      title: 'View Audit Trail',
      subtitle: 'Inspect local security and launch history',
      icon: History,
      onSelect: () => {
        onNavigateTab('activity');
        onClose();
      },
    },
    {
      id: 'act-settings',
      type: 'action',
      title: 'Preferences & Settings',
      subtitle: 'Startup, tray, and storage configurations',
      icon: Settings,
      onSelect: () => {
        onNavigateTab('settings');
        onClose();
      },
    },
  ];

  const allItems = [...accountItems, ...appItems, ...actionItems];
  const q = query.toLowerCase().trim();
  const filtered = q
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      )
    : allItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-backdrop-enter"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[500px] animate-modal-enter"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-[#111C33]/50">
          <Search className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search accounts or apps..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching accounts, apps, or commands found.
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              const ActionIcon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.app ? (
                      <AppIcon app={item.app} size="sm" />
                    ) : ActionIcon ? (
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <ActionIcon className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <Command className="w-4 h-4 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-white">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.type === 'account' && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                        <Play className="w-2.5 h-2.5" /> Launch
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        ↵ Enter
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
