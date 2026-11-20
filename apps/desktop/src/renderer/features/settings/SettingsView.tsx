import React, { useState, useEffect } from 'react';
import { AppSettings, UpdateSettingsInput, VaultLockStatus, UpdateStatusData } from '@quickswap/shared';
import {
  Settings,
  Shield,
  HardDrive,
  Lock,
  KeyRound,
  Clock,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Laptop,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings | null;
  onUpdate: (input: UpdateSettingsInput) => Promise<void>;
  vaultLockStatus?: VaultLockStatus | null;
  onConfigureMasterPassword?: () => void;
  onLockVault?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdate,
  vaultLockStatus,
  onConfigureMasterPassword,
  onLockVault,
}) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusData | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const api = typeof window !== 'undefined' ? (window.quickswapAPI || window.accountHubAPI) : null;

  useEffect(() => {
    if (!api?.updater) return;

    api.updater.getStatus().then(setUpdateStatus).catch(() => {});

    const unsubscribe = api.updater.onStatusChange((status) => {
      setUpdateStatus(status);
      if (status.status !== 'checking') setChecking(false);
      if (status.status !== 'downloading') setDownloading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api]);

  const handleCheckForUpdates = async () => {
    if (!api?.updater || checking) return;
    setChecking(true);
    setDownloadError(null);
    try {
      const res = await api.updater.checkForUpdates();
      setUpdateStatus(res);
    } catch (err: any) {
      setDownloadError(err?.message || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!api?.updater || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await api.updater.downloadUpdate();
      if (!res.success && res.message) {
        setDownloadError(res.message);
      }
    } catch (err: any) {
      setDownloadError(err?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleInstallUpdate = () => {
    api?.updater?.installUpdate().catch(() => {});
  };

  const handleOpenGitHubReleases = () => {
    api?.shell?.openExternal('https://github.com/Amrsamy19/quickswap/releases/latest').catch(() => {});
  };

  if (!settings) return null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* General Settings */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <span>Desktop & Startup Preferences</span>
        </h3>

        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-white">Start With Windows</div>
              <div className="text-[11px] text-slate-400">
                Launch Quickswap in the background when your PC boots.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.startWithWindows}
              onChange={(e) => onUpdate({ startWithWindows: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-white">Minimize to System Tray</div>
              <div className="text-[11px] text-slate-400">
                Keep Quickswap running in the taskbar notification area when closed.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.minimizeToTray}
              onChange={(e) => onUpdate({ minimizeToTray: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-white">Start Minimized</div>
              <div className="text-[11px] text-slate-400">
                Start without showing the main window on startup.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.startMinimized}
              onChange={(e) => onUpdate({ startMinimized: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-white">Check for Updates on Startup</div>
              <div className="text-[11px] text-slate-400">
                Automatically verify if a new signed release is available when starting Quickswap.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCheckUpdates !== false}
              onChange={(e) => onUpdate({ autoCheckUpdates: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Security & Audit Settings */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Security & Local Audit</span>
        </h3>

        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-white">Enable Audit Logging</div>
              <div className="text-[11px] text-slate-400">
                Maintain a local history of account and application management events.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableAuditLog}
              onChange={(e) => onUpdate({ enableAuditLog: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Vault Protection & Master Password */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Vault Protection & Master Password</span>
          </div>
          {vaultLockStatus?.hasMasterPassword && !vaultLockStatus.isLocked && onLockVault && (
            <button
              onClick={onLockVault}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
            >
              Lock Vault Now
            </button>
          )}
        </h3>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <div>
              <div className="text-xs font-semibold text-white">Master Password Gate</div>
              <div className="text-[11px] text-slate-400">
                {vaultLockStatus?.hasMasterPassword
                  ? 'Active — Vault credentials are gated with PBKDF2 key derivation and rate-limited protection.'
                  : 'Disabled — Set a master password to protect credentials against unauthorized same-user processes.'}
              </div>
            </div>
            {onConfigureMasterPassword && (
              <button
                onClick={onConfigureMasterPassword}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{vaultLockStatus?.hasMasterPassword ? 'Change Master Password' : 'Set Master Password'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Auto-Lock on Idle</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Automatically lock the vault after a period of inactivity.
              </div>
            </div>
            <select
              value={settings.autoLockMinutes || 0}
              onChange={(e) => onUpdate({ autoLockMinutes: Number(e.target.value) })}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value={0}>Disabled</option>
              <option value={5}>5 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Database & Storage */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Storage & Local-First Architecture</span>
        </h3>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Database Engine:</span>
            <span className="text-white font-semibold">SQLite (WAL Mode)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Database Location:</span>
            <span className="font-mono text-cyan-400 text-[11px] truncate max-w-sm">
              {settings.databasePath}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cloud Sync:</span>
            <span className="text-emerald-400 font-semibold">Disabled (Local-First Offline)</span>
          </div>
        </div>
      </div>

      {/* Software Updates & Release Channel */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Software Updates & Release Channel</span>
          </h3>

          <button
            onClick={handleCheckForUpdates}
            disabled={checking || downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check for Updates'}</span>
          </button>
        </div>

        {/* Version & Build info strip */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Application Version:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-white">v{updateStatus?.currentVersion || '1.0.1'}</span>
              {updateStatus?.isPortable ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-medium text-amber-300">
                  Portable Edition
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-medium text-cyan-300">
                  Installed (NSIS)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Release Channel:</span>
            <span className="text-slate-300 font-medium">GitHub Releases (Stable)</span>
          </div>

          {/* Dynamic Status Display */}
          <div className="pt-2 border-t border-slate-800/80">
            {updateStatus?.status === 'checking' && (
              <div className="flex items-center gap-2 text-xs text-blue-400 py-1">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking GitHub for newer releases...</span>
              </div>
            )}

            {updateStatus?.status === 'not-available' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 py-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Quickswap is up to date! You are running the latest release.</span>
              </div>
            )}

            {updateStatus?.status === 'available' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-cyan-300">
                    <DownloadCloud className="w-4 h-4 text-cyan-400 animate-bounce" />
                    <span>
                      Update Available: <strong className="font-mono">v{updateStatus.availableVersion}</strong>
                    </span>
                  </div>

                  {updateStatus.isPortable ? (
                    <button
                      onClick={handleOpenGitHubReleases}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Download Portable Binary</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDownloadUpdate}
                      disabled={downloading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-sm shadow-emerald-500/20 cursor-pointer"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>{downloading ? 'Starting Download...' : 'Download Update'}</span>
                    </button>
                  )}
                </div>

                {updateStatus.isPortable && (
                  <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                    Note: Portable executables cannot be auto-updated in place. Click the button above to download the new portable binary from GitHub.
                  </p>
                )}
              </div>
            )}

            {updateStatus?.status === 'downloading' && (
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 flex items-center gap-1.5">
                    <DownloadCloud className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Downloading update v{updateStatus.availableVersion}...</span>
                  </span>
                  <span className="font-mono text-white font-medium">
                    {updateStatus.progress?.percent || 0}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateStatus.progress?.percent || 0}%` }}
                  />
                </div>

                {updateStatus.progress && (
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      {(updateStatus.progress.transferred / 1024 / 1024).toFixed(1)} MB /{' '}
                      {(updateStatus.progress.total / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <span>{(updateStatus.progress.bytesPerSecond / 1024).toFixed(0)} KB/s</span>
                  </div>
                )}
              </div>
            )}

            {updateStatus?.status === 'downloaded' && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Update Ready: v{updateStatus.availableVersion}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      The verified installer has been downloaded. Restart to apply update immediately.
                    </div>
                  </div>

                  <button
                    onClick={handleInstallUpdate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restart & Install</span>
                  </button>
                </div>
              </div>
            )}

            {(updateStatus?.status === 'error' || downloadError) && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{downloadError || updateStatus?.error || 'Update check encountered an issue.'}</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleCheckForUpdates}
                    className="text-[11px] text-rose-200 underline hover:text-white transition-colors cursor-pointer"
                  >
                    Retry Check
                  </button>
                  <button
                    onClick={handleOpenGitHubReleases}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Download Manually on GitHub</span>
                  </button>
                </div>
              </div>
            )}

            {updateStatus?.status === 'dev-mode' && (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                <Laptop className="w-4 h-4 text-slate-500" />
                <span>Development environment: Production auto-updater is simulated.</span>
              </div>
            )}
          </div>
        </div>

        {/* Direct GitHub Link Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Official Releases & Verifications:</span>
          <button
            onClick={handleOpenGitHubReleases}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <span>GitHub Releases</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
