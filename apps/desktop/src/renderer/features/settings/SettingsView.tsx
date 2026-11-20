import React from 'react';
import { AppSettings, UpdateSettingsInput } from '@quickswap/shared';
import { Settings, Shield, HardDrive, Bell, Moon } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings | null;
  onUpdate: (input: UpdateSettingsInput) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate }) => {
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
