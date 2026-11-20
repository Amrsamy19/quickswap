import React, { useState } from 'react';
import { ActivityLogEntry } from '@quickswap/shared';
import { History, Trash2, Shield, Users, Gamepad2, Info, ChevronDown } from 'lucide-react';

interface ActivityViewProps {
  activities: ActivityLogEntry[];
  onClear: () => Promise<void>;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ activities, onClear }) => {
  const [filter, setFilter] = useState<string>('all');

  const filtered = activities.filter((act) => {
    if (filter === 'all') return true;
    return act.entityType === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'security':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'account':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'application':
        return <Gamepad2 className="w-4 h-4 text-indigo-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer transition-colors shadow-sm"
            >
              <option value="all" className="bg-[#111827] text-white">All Audit Logs</option>
              <option value="account" className="bg-[#111827] text-white">Account Actions</option>
              <option value="application" className="bg-[#111827] text-white">Application Events</option>
              <option value="security" className="bg-[#111827] text-white">Security & Vault Events</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} entries recorded</span>
        </div>

        {activities.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-[#111827] hover:bg-rose-500/10 hover:border-rose-500/30 text-xs font-semibold text-slate-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Audit Log</span>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Activity Logs</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Audit entries will be recorded whenever applications are scanned, accounts are
            registered, or credentials are saved.
          </p>
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800/60">
            {filtered.map((act) => (
              <div
                key={act.id}
                className="p-4 hover:bg-slate-800/20 transition-colors flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(act.entityType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-sm text-white">{act.title}</span>
                    <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {act.details && (
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{act.details}</div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                    {act.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
