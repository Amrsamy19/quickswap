import React from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  ShieldCheck,
  History,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  vaultHealthy,
  isCollapsed,
  onToggleCollapse,
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
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-[#0D121F]/90 backdrop-blur border-r border-slate-800/80 flex flex-col justify-between p-3 flex-shrink-0 transition-all duration-200 select-none z-20`}
    >
      <div>
        {/* Header / Collapse Toggle */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between px-2'
          } py-2 mb-4`}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="Quickswap" className="w-8 h-8 rounded-lg shadow-md shadow-blue-500/20 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-sm tracking-tight text-white truncate">
                  Quickswap
                </div>
                <div className="text-[10px] font-medium text-cyan-400 tracking-wider uppercase">
                  Vault
                </div>
              </div>
            </div>
          ) : (
            <img src="/icon.svg" alt="Quickswap" className="w-7 h-7 rounded-lg shadow-sm shadow-blue-500/20" />
          )}

          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Vault Status Indicator */}
      {isCollapsed ? (
        <div
          title={`Vault Security: ${vaultHealthy ? 'WinCred + DPAPI Active' : 'Degraded'}`}
          className="flex justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/80"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              vaultHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>
      ) : (
        <div className="bg-[#111827]/70 border border-slate-800/80 rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vault Secured</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                vaultHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>
        </div>
      )}
    </aside>
  );
};
