import React, { useState } from 'react';
import {
  Application,
  Account,
  SecurityStatus,
  ActivityLogEntry,
} from '@quickswap/shared';
import {
  Gamepad2,
  Users,
  KeyRound,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowRight,
  Shield,
  Play,
  Zap,
  AlertTriangle,
  CheckCircle,
  Plus,
  Clock,
} from 'lucide-react';
import { AppIcon } from '../../components/AppIcon';

interface DashboardViewProps {
  applications: Application[];
  accounts: Account[];
  securityStatus: SecurityStatus | null;
  activities: ActivityLogEntry[];
  onNavigateToAccounts: (appId?: string) => void;
  onNavigateToApplications: () => void;
  onNavigateToSecurity: () => void;
  onLaunchAccount: (accountId: string, force?: boolean) => Promise<any>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  applications,
  accounts,
  securityStatus,
  activities,
  onNavigateToAccounts,
  onNavigateToApplications,
  onNavigateToSecurity,
  onLaunchAccount,
}) => {
  const favoriteAccounts = accounts.filter((a) => a.isFavorite || a.isDefault);
  const displayAccounts = favoriteAccounts.length > 0 ? favoriteAccounts : accounts.slice(0, 6);

  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alreadyRunningWarning, setAlreadyRunningWarning] = useState<{
    accountId: string;
    appName: string;
    accountName: string;
    message: string;
  } | null>(null);

  const api = typeof window !== 'undefined' ? (window.quickswapAPI || window.accountHubAPI) : null;

  const handleLaunch = async (accId: string, force: boolean = false) => {
    try {
      setLaunchingId(accId);
      const res = await onLaunchAccount(accId, force);
      if (res?.alreadyRunning) {
        const acc = accounts.find((a) => a.id === accId);
        const app = applications.find((a) => a.id === acc?.applicationId);
        setAlreadyRunningWarning({
          accountId: accId,
          appName: app?.name || 'Application',
          accountName: acc?.displayName || 'Account',
          message: res.message || 'The application is already running.',
        });
      } else if (res?.autoLoginTriggered) {
        setToastMessage('Target client launched! Auto-filling credentials automatically...');
        setTimeout(() => setToastMessage(null), 5000);
      } else if (res?.success) {
        setToastMessage(res.message || 'Application launched successfully!');
        setTimeout(() => setToastMessage(null), 4000);
      } else if (res?.message) {
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
    } finally {
      setLaunchingId(null);
    }
  };

  const handleAutoLogin = async (accId: string) => {
    if (!api) return;
    try {
      setToastMessage('Waiting for client window to auto-fill credentials...');
      const res = await api.launcher.autoLogin(accId);
      if (res.success) {
        setToastMessage(res.message || 'Credentials auto-filled and login submitted!');
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(res.message || 'Auto-login failed');
      }
    } catch (err: any) {
      alert(`Auto-login error: ${err.message}`);
    }
  };

  // Group activity logs into Today and Yesterday
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const todayActivities = activities.filter(
    (a) => new Date(a.createdAt).toDateString() === todayStr
  );
  const olderActivities = activities.filter(
    (a) => new Date(a.createdAt).toDateString() !== todayStr
  );

  return (
    <div className="space-y-6">
      {/* Hero Quick Access Accounts (Top Billing) */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Quick Access Accounts
            </h2>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              — 1-click launch your pinned profiles
            </span>
          </div>
          <button
            onClick={() => onNavigateToAccounts()}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            <span>View all ({accounts.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 p-6">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-300">No accounts registered yet</div>
            <div className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Scan installed applications or click "Add Account" to configure your first profile.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayAccounts.map((acc) => {
              const parentApp = applications.find((a) => a.id === acc.applicationId);
              const isLaunching = launchingId === acc.id;

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {parentApp ? (
                          <AppIcon app={parentApp} size="md" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                            {acc.displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{acc.displayName}</span>
                          {acc.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <span>{parentApp?.name || 'App'}</span>
                          {acc.username && (
                            <span className="sensitive-text font-mono truncate">
                              • {acc.username}
                            </span>
                          )}
                          {acc.region && <span>[{acc.region}]</span>}
                        </div>
                      </div>
                    </div>

                    {acc.hasSession ? (
                      <span
                        title="DPAPI Session Hot-Swap Supported"
                        className="p-1 rounded bg-emerald-500/10 text-emerald-400 flex-shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      </span>
                    ) : acc.hasCredentials ? (
                      <span
                        title="Hardware Stored in Windows Credential Manager"
                        className="p-1 rounded bg-blue-500/10 text-blue-400 flex-shrink-0"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {acc.lastUsedAt
                        ? `Used ${new Date(acc.lastUsedAt).toLocaleDateString()}`
                        : 'Ready to launch'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunch(acc.id);
                      }}
                      disabled={isLaunching}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Play className={`w-3 h-3 fill-current ${isLaunching ? 'animate-spin' : ''}`} />
                      <span>{isLaunching ? 'Launching...' : 'Launch'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Featured Applications & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Application Library Preview */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Application Library</span>
            </h2>
            <button
              onClick={onNavigateToApplications}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View all ({applications.length})
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No applications registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {applications.slice(0, 6).map((app) => (
                <div
                  key={app.id}
                  onClick={() => onNavigateToAccounts(app.id)}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <AppIcon app={app} size="sm" />
                      <span className="font-semibold text-xs text-white truncate">{app.name}</span>
                    </div>
                    {app.isFavorite && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400">
                    <span className="capitalize">{app.category}</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium">
                      {app.accountCount || 0} accounts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Humanized Audit Trail */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Audit Trail</span>
            </h2>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No activity logs recorded.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              {todayActivities.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Today
                  </div>
                  <div className="space-y-2">
                    {todayActivities.slice(0, 5).map((act) => (
                      <div key={act.id} className="text-xs border-l-2 border-blue-500/40 pl-3 py-0.5">
                        <div className="font-medium text-slate-200">{act.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {olderActivities.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Earlier
                  </div>
                  <div className="space-y-2">
                    {olderActivities.slice(0, 5).map((act) => (
                      <div key={act.id} className="text-xs border-l-2 border-slate-700 pl-3 py-0.5">
                        <div className="font-medium text-slate-300">{act.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(act.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Already Running Conflict Dialog */}
      {alreadyRunningWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Application Already Running</h3>
                <p className="text-xs text-slate-400 mt-0.5">{alreadyRunningWarning.appName} is active</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {alreadyRunningWarning.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAlreadyRunningWarning(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const accId = alreadyRunningWarning.accountId;
                  setAlreadyRunningWarning(null);
                  await handleAutoLogin(accId);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill Window</span>
              </button>

              <button
                onClick={async () => {
                  const accId = alreadyRunningWarning.accountId;
                  setAlreadyRunningWarning(null);
                  await handleLaunch(accId, true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Force Restart & Switch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
