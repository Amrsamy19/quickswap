import React, { useState } from 'react';
import {
  Application,
  Account,
  SecurityStatus,
  ActivityLogEntry,
} from '@accounthub/shared';
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
} from 'lucide-react';

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
  const favoriteApps = applications.filter((a) => a.isFavorite);
  const favoriteAccounts = accounts.filter((a) => a.isFavorite || a.isDefault);

  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alreadyRunningWarning, setAlreadyRunningWarning] = useState<{
    accountId: string;
    appName: string;
    accountName: string;
    message: string;
  } | null>(null);

  const api = typeof window !== 'undefined' ? window.accountHubAPI : null;

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
        setToastMessage('Riot Client launched! Auto-filling credentials and logging in automatically...');
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

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Apps */}
        <div
          onClick={onNavigateToApplications}
          className="bg-[#161F30]/70 border border-slate-800 rounded-xl p-5 hover:border-blue-500/40 hover:bg-[#161F30] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Applications</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20">
              <Gamepad2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{applications.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{applications.filter((a) => a.isInstalled).length} installed</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-blue-400" />
          </div>
        </div>

        {/* Total Accounts */}
        <div
          onClick={() => onNavigateToAccounts()}
          className="bg-[#161F30]/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 hover:bg-[#161F30] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{accounts.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{favoriteAccounts.length} favorites / pinned</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-indigo-400" />
          </div>
        </div>

        {/* Protected Credentials */}
        <div
          onClick={onNavigateToSecurity}
          className="bg-[#161F30]/70 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/40 hover:bg-[#161F30] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Vault Secrets</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {securityStatus?.activeSecretReferences || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>WinCred + DPAPI protected</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-cyan-400" />
          </div>
        </div>

        {/* Security Health */}
        <div
          onClick={onNavigateToSecurity}
          className="bg-[#161F30]/70 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 hover:bg-[#161F30] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Security Health</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 capitalize">
            {securityStatus?.securityHealth || 'Healthy'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Zero plaintext secrets stored</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pinned / Favorite Accounts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Favorite Apps */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Featured Applications</span>
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
                No applications detected yet. Click "Scan Installed Apps" above!
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
                      <div className="font-semibold text-sm text-white truncate">{app.name}</div>
                      {app.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
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

          {/* Quick Accounts */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Quick Access Accounts</span>
              </h2>
              <button
                onClick={() => onNavigateToAccounts()}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Manage all ({accounts.length})
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No accounts registered yet. Click "Add Account" to create your first account!
              </div>
            ) : (
              <div className="space-y-2.5">
                {accounts.slice(0, 5).map((acc) => {
                  const parentApp = applications.find((a) => a.id === acc.applicationId);
                  return (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:bg-slate-800/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-sm text-blue-400">
                          {acc.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <span>{acc.displayName}</span>
                            {acc.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{parentApp?.name || 'App'}</span>
                            {acc.region && <span>• {acc.region}</span>}
                            {acc.username && <span>• {acc.username}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {acc.hasSession ? (
                          <span
                            title="1-Click Session Linked (DPAPI Protected)"
                            className="p-1 rounded-md bg-emerald-500/10 text-emerald-400"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                          </span>
                        ) : acc.hasCredentials ? (
                          <span
                            title="Protected in Windows Credential Manager"
                            className="p-1 rounded-md bg-blue-500/10 text-blue-400"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLaunch(acc.id);
                          }}
                          disabled={launchingId === acc.id}
                          title="Launch Application With This Account"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Play className={`w-3 h-3 fill-current ${launchingId === acc.id ? 'animate-spin' : ''}`} />
                          <span>{launchingId === acc.id ? 'Starting...' : 'Launch'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit History</span>
          </h2>

          {activities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No activity logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5 overflow-y-auto max-h-[420px] pr-1">
              {activities.slice(0, 10).map((act) => (
                <div key={act.id} className="text-xs border-l-2 border-blue-500/40 pl-3 py-0.5">
                  <div className="font-medium text-slate-200">{act.title}</div>
                  {act.details && (
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{act.details}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(act.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
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

      {/* Already Running Warning Dialog */}
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
