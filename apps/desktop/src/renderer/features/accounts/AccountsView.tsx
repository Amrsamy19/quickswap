import React, { useState, useEffect, useRef } from 'react';
import { Application, Account } from '@quickswap/shared';
import {
  Users,
  Search,
  Star,
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Crown,
  Play,
  AlertTriangle,
  Zap,
  Copy,
  Check,
  KeyRound,
  Sparkles,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { AccountModal } from './AccountModal';
import { AppIcon } from '../../components/AppIcon';

interface AccountsViewProps {
  applications: Application[];
  accounts: Account[];
  selectedAppId?: string;
  onCreateAccount: (data: any) => Promise<void>;
  onUpdateAccount: (id: string, data: any) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onLaunchAccount: (id: string, force?: boolean) => Promise<{
    success: boolean;
    alreadyRunning?: boolean;
    message?: string;
    sessionRestored?: boolean;
    copiedPassword?: boolean;
  }>;
  onRefreshData?: () => Promise<void>;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  applications,
  accounts,
  selectedAppId,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSetDefault,
  onToggleFavorite,
  onLaunchAccount,
  onRefreshData,
}) => {
  const [appFilter, setAppFilter] = useState<string>(selectedAppId || 'all');
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [alreadyRunningWarning, setAlreadyRunningWarning] = useState<{
    accountId: string;
    appName: string;
    accountName: string;
    message: string;
  } | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [capturingSessionId, setCapturingSessionId] = useState<string | null>(null);
  const [sessionHelperDialog, setSessionHelperDialog] = useState<{
    accountId: string;
    appName: string;
    accountName: string;
    message: string;
  } | null>(null);
  const [sessionInfoModal, setSessionInfoModal] = useState<{
    title: string;
    message: string;
    isError?: boolean;
  } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  const api = typeof window !== 'undefined' ? window.accountHubAPI : null;

  const handleLaunch = async (accId: string, force: boolean = false) => {
    try {
      setLaunchingId(accId);
      const res = await onLaunchAccount(accId, force);
      if (res.alreadyRunning) {
        const acc = accounts.find((a) => a.id === accId);
        const app = applications.find((a) => a.id === acc?.applicationId);
        setAlreadyRunningWarning({
          accountId: accId,
          appName: app?.name || 'Application',
          accountName: acc?.displayName || 'Account',
          message: res.message || 'The application is already running.',
        });
      } else if (res.autoLoginTriggered) {
        setToastMessage('Riot Client launched! Auto-filling credentials and logging in automatically...');
        setTimeout(() => setToastMessage(null), 5000);
      } else if (res.copiedPassword) {
        const acc = accounts.find((a) => a.id === accId);
        const app = applications.find((a) => a.id === acc?.applicationId);
        setSessionHelperDialog({
          accountId: accId,
          appName: app?.name || 'Application',
          accountName: acc?.displayName || 'Account',
          message: res.message || 'Password auto-copied to clipboard.',
        });
        setCopiedAccountId(accId);
        setTimeout(() => setCopiedAccountId(null), 30000);
      } else if (res.success) {
        setToastMessage(res.message || 'Application launched successfully!');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
    } finally {
      setLaunchingId(null);
    }
  };

  const handleCopyPassword = async (accId: string) => {
    if (!api) return;
    try {
      const res = await api.accounts.copyPassword(accId);
      if (res.success) {
        setCopiedAccountId(accId);
        setToastMessage(`Password copied! Auto-wiping in ${res.durationSeconds}s.`);
        setTimeout(() => {
          setCopiedAccountId(null);
          setToastMessage(null);
        }, res.durationSeconds * 1000);
      } else {
        alert(res.message || 'Failed to copy password.');
      }
    } catch (err: any) {
      alert(`Failed to copy password: ${err.message}`);
    }
  };

  const handleCaptureSession = async (accId: string) => {
    if (!api) return;
    try {
      setCapturingSessionId(accId);
      const res = await api.launcher.captureSession(accId);
      if (res.success) {
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(null), 5000);
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        setSessionInfoModal({
          title: 'Link Riot Session',
          message: res.message,
          isError: true,
        });
      }
    } catch (err: any) {
      setSessionInfoModal({
        title: 'Session Capture Error',
        message: err.message,
        isError: true,
      });
    } finally {
      setCapturingSessionId(null);
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

  const filteredAccounts = accounts.filter((acc) => {
    const matchesApp = appFilter === 'all' || acc.applicationId === appFilter;
    const matchesSearch =
      acc.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (acc.username && acc.username.toLowerCase().includes(search.toLowerCase()));
    const matchesFav = !favoritesOnly || acc.isFavorite;
    return matchesApp && matchesSearch && matchesFav;
  });

  const handleEdit = (acc: Account) => {
    setEditingAccount(acc);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      await onDeleteAccount(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[320px]">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by display name or username..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111827] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Application Filter */}
          <div className="relative">
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer transition-colors shadow-sm"
            >
              <option value="all" className="bg-[#111827] text-white">All Applications</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id} className="bg-[#111827] text-white">
                  {app.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Favorites Filter */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all ${
              favoritesOnly
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-[#111827] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Account Table / Cards */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Accounts Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {accounts.length === 0
              ? 'No accounts registered yet. Click "Add Account" to store credentials and configure your first account.'
              : 'No accounts matched your search or filters.'}
          </p>
          <div className="mt-5">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
            >
              Add Your First Account
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Account</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Application</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[80px]">Region</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[100px]">Auth Mode</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[130px]">Vault Status</th>
                <th className="px-6 py-3.5 text-right whitespace-nowrap min-w-[210px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAccounts.map((acc) => {
                const parentApp = applications.find((a) => a.id === acc.applicationId);
                return (
                  <tr
                    key={acc.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Display name & username */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-400 flex-shrink-0">
                          {acc.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                            <span>{acc.displayName}</span>
                            {acc.isDefault && (
                              <span
                                title="Default Launch Account"
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                              >
                                <Crown className="w-3 h-3 fill-amber-400" /> Default
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {acc.username || 'No login ID'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Application */}
                    <td className="px-4 py-4 text-slate-300 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] whitespace-nowrap">
                        <AppIcon app={parentApp} size="sm" />
                        <span>{parentApp?.name || 'Unknown App'}</span>
                      </span>
                    </td>

                    {/* Region */}
                    <td className="px-4 py-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {acc.region || '—'}
                    </td>

                    {/* Auth Mode */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] font-medium whitespace-nowrap">
                        {acc.authMethod}
                      </span>
                    </td>

                    {/* Vault & Session Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {acc.hasSession ? (
                        <span
                          title="1-Click Ready: DPAPI session paired and verified. Instant launch without login prompts."
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium whitespace-nowrap shadow-sm shadow-emerald-500/5"
                        >
                          <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>1-Click Ready</span>
                        </span>
                      ) : acc.hasCredentials ? (
                        <span
                          title="Credentials secured in Windows Credential Manager. Auto-fills credentials on launch."
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[11px] font-medium whitespace-nowrap shadow-sm shadow-blue-500/5"
                        >
                          <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          <span>Credentials</span>
                        </span>
                      ) : (
                        <span
                          title="No stored session or credentials."
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/40 text-slate-400 text-[11px] font-medium whitespace-nowrap"
                        >
                          <span>Manual</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {/* Launch Account */}
                        <button
                          onClick={() => handleLaunch(acc.id)}
                          disabled={launchingId === acc.id}
                          title="Launch Application With This Account"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Play className={`w-3 h-3 fill-current ${launchingId === acc.id ? 'animate-spin' : ''}`} />
                          <span>{launchingId === acc.id ? 'Starting...' : 'Launch'}</span>
                        </button>

                        {/* Copy Password with 30s auto-wipe */}
                        {acc.hasCredentials && (
                          <button
                            onClick={() => handleCopyPassword(acc.id)}
                            title={
                              copiedAccountId === acc.id
                                ? 'Password copied! (auto-wipes in 30s)'
                                : 'Copy Password (auto-wipes in 30s)'
                            }
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              copiedAccountId === acc.id
                                ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent'
                            }`}
                          >
                            {copiedAccountId === acc.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Toggle Favorite */}
                        <button
                          onClick={() => onToggleFavorite(acc.id)}
                          title={acc.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            acc.isFavorite
                              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/80'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${acc.isFavorite ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* Edit Account */}
                        <button
                          onClick={() => handleEdit(acc)}
                          title="Edit Account Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* More Actions Menu */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === acc.id ? null : acc.id);
                            }}
                            title="More Actions"
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              activeMenuId === acc.id
                                ? 'text-white bg-slate-700'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                            }`}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuId === acc.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-[#161F30] border border-slate-700 shadow-2xl z-40 py-1 text-left divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="py-1">
                                {parentApp?.adapterId === 'riot' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      handleCaptureSession(acc.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Zap className={`w-3.5 h-3.5 ${acc.hasSession ? 'text-emerald-400 fill-emerald-400' : 'text-amber-400'}`} />
                                    <span>{acc.hasSession ? 'Re-sync Riot Session' : 'Link Active Riot Session'}</span>
                                  </button>
                                )}

                                {acc.hasCredentials && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      handleAutoLogin(acc.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Auto-Fill Active Window</span>
                                  </button>
                                )}

                                {!acc.isDefault && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                      onSetDefault(acc.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Set as Default Launch</span>
                                  </button>
                                )}
                              </div>

                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setDeleteConfirmId(acc.id);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Delete Account...</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Account Add/Edit Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        applications={applications}
        initialApplicationId={appFilter !== 'all' ? appFilter : undefined}
        accountToEdit={editingAccount}
        onSubmit={async (data) => {
          if (editingAccount) {
            await onUpdateAccount(editingAccount.id, data);
          } else {
            await onCreateAccount(data);
          }
        }}
      />

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
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Application Already Running</h3>
                <p className="text-xs text-amber-400 font-medium">Safe Switching Warning</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>{alreadyRunningWarning.appName}</strong> is already open on this computer.
              To switch accounts safely without losing progress or causing client conflicts, we
              recommend closing the active client first.
            </p>
            <div className="flex justify-end gap-2.5 pt-2 flex-wrap">
              <button
                onClick={() => setAlreadyRunningWarning(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = alreadyRunningWarning.accountId;
                  setAlreadyRunningWarning(null);
                  handleAutoLogin(id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill Active Window</span>
              </button>
              <button
                onClick={() => {
                  const id = alreadyRunningWarning.accountId;
                  setAlreadyRunningWarning(null);
                  handleLaunch(id, true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20"
              >
                Restart Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Delete Account?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete this account metadata and{' '}
              <strong className="text-rose-400">securely purge all credentials</strong> stored in
              Windows Credential Manager and DPAPI.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20"
              >
                Confirm & Wipe Secrets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Helper Dialog (Launched without saved session) */}
      {sessionHelperDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-blue-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Riot Client Launched</h3>
                <p className="text-xs text-blue-400 font-medium">Quick Login & Session Setup</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-200">
                <strong>Password copied to clipboard!</strong> It will automatically wipe in 30 seconds for security.
              </div>
              <p>
                Riot Games does not support command-line credentials. To enable seamless <strong>1-Click Launch</strong> in the future:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                <li>Paste your password into the Riot Client window.</li>
                <li>
                  Check <strong className="text-white">"Stay signed in"</strong> and log into your account.
                </li>
                <li>
                  Once you are logged into Riot Client, click <strong className="text-amber-400">"Link Riot Session Now"</strong> below.
                </li>
              </ol>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSessionHelperDialog(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                I'll Link Later
              </button>
              <button
                onClick={async () => {
                  const id = sessionHelperDialog.accountId;
                  await handleCaptureSession(id);
                  setSessionHelperDialog(null);
                }}
                disabled={capturingSessionId !== null}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Link Riot Session Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Info / Error Modal */}
      {sessionInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  sessionInfoModal.isError
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {sessionInfoModal.isError ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-base font-bold text-white">{sessionInfoModal.title}</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{sessionInfoModal.message}</p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSessionInfoModal(null)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
