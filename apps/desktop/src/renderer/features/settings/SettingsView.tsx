import React from 'react';
import { AppSettings, UpdateSettingsInput, VaultLockStatus } from '@quickswap/shared';
import { Settings, Shield, HardDrive, Lock, KeyRound, Clock } from 'lucide-react';

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
    </div>
  );
};
