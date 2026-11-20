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
      } sidebar-smooth-transition bg-[#0D121F]/90 backdrop-blur border-r border-slate-800/80 flex flex-col justify-between p-3 flex-shrink-0 select-none z-20 overflow-hidden`}
    >
      <div>
        {/* Header / Collapse Toggle */}
        {isCollapsed ? (
          <div className="flex items-center justify-center py-1 mb-4">
            <button
              onClick={(e) => {
                onToggleCollapse();
                e.currentTarget.blur();
              }}
              onMouseDown={(e) => e.preventDefault()}
              title="Expand Sidebar"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700/80 transition-all cursor-pointer group"
            >
              <PanelLeftOpen className="w-4 h-4 text-slate-300 group-hover:text-cyan-400 group-hover:scale-105 transition-all" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/icon.svg"
                alt="Quickswap"
                className="w-8 h-8 rounded-lg shadow-md shadow-blue-500/20 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-sm tracking-tight text-white truncate">
                  Quickswap
                </div>
                <div className="text-[10px] font-medium text-cyan-400 tracking-wider uppercase">
                  Vault
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                onToggleCollapse();
                e.currentTarget.blur();
              }}
              onMouseDown={(e) => e.preventDefault()}
              title="Collapse Sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex-shrink-0 cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={(e) => {
                  onSelectTab(item.id);
                  e.currentTarget.blur();
                }}
                onMouseDown={(e) => e.preventDefault()}
                title={isCollapsed ? item.label : undefined}
                className={`relative w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] group cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-400 shadow-sm shadow-cyan-400/60" />
                )}
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span
                  className={`truncate whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isCollapsed
                      ? 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                      : 'opacity-100 max-w-[150px] translate-x-0'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Vault Status Indicator */}
      <div
        title={`Vault Security: ${vaultHealthy ? 'WinCred + DPAPI Active' : 'Degraded'}`}
        className="rounded-xl bg-[#111827]/70 border border-slate-800/80 p-2.5 transition-all duration-300"
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div
            className={`flex items-center gap-1.5 text-[11px] text-slate-300 font-medium whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed
                ? 'opacity-0 max-w-0 pointer-events-none -translate-x-2'
                : 'opacity-100 max-w-[140px] translate-x-0'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Vault Secured</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              vaultHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>
      </div>
    </aside>
  );
};
