import React from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  ShieldCheck,
  History,
  Settings,
  Shield,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'applications'
  | 'accounts'
  | 'security'
  | 'activity'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  vaultHealthy: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  vaultHealthy,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications' as NavTab, label: 'Applications', icon: Gamepad2 },
    { id: 'accounts' as NavTab, label: 'Accounts', icon: Users },
    { id: 'security' as NavTab, label: 'Security Center', icon: ShieldCheck },
    { id: 'activity' as NavTab, label: 'Activity Log', icon: History },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#111827]/80 backdrop-blur border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              AccountHub
            </div>
            <div className="text-[11px] font-medium text-cyan-400 tracking-wider uppercase">
              Desktop Vault
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Vault Status Indicator */}
      <div className="bg-[#161F30] border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-300">Vault Security</span>
          <span
            className={`w-2 h-2 rounded-full ${
              vaultHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>WinCred + DPAPI Active</span>
        </div>
      </div>
    </aside>
  );
};
