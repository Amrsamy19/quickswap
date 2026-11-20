import React, { useState, useEffect } from 'react';
import { ActivityLogEntry, AuditLogVerificationResult } from '@quickswap/shared';
import {
  History,
  Trash2,
  Shield,
  Users,
  Gamepad2,
  Info,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface ActivityViewProps {
  activities: ActivityLogEntry[];
  onClear: () => Promise<void>;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ activities, onClear }) => {
  const [filter, setFilter] = useState<string>('all');
  const [auditStatus, setAuditStatus] = useState<AuditLogVerificationResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? (window.quickswapAPI || window.accountHubAPI) : null;
    if (api?.security?.verifyAuditLog) {
      api.security.verifyAuditLog().then(setAuditStatus).catch(() => {});
    }
  }, [activities]);

  const filtered = activities.filter((act) => {
    if (filter === 'all') return true;
    return act.entityType === filter;
  });

  const groupActivitiesByDate = (items: ActivityLogEntry[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const weekAgo = today - 86400000 * 7;

    const groups: { label: string; items: ActivityLogEntry[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Earlier This Week', items: [] },
      { label: 'Older', items: [] },
    ];

    for (const item of items) {
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime >= today) {
        groups[0].items.push(item);
      } else if (itemTime >= yesterday) {
        groups[1].items.push(item);
      } else if (itemTime >= weekAgo) {
        groups[2].items.push(item);
      } else {
        groups[3].items.push(item);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  };

  const grouped = groupActivitiesByDate(filtered);

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
      {/* Cryptographic Chain Integrity Banner */}
      {auditStatus && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
            auditStatus.valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {auditStatus.valid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                {auditStatus.valid
                  ? 'Cryptographic Audit Trail Verified'
                  : 'Tampering Detected in Audit Chain'}
              </span>
              <span className="text-slate-400 ml-2 hidden sm:inline">
                ({auditStatus.totalChecked} events verified via SHA-256 hash chaining)
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400">
            SHA-256 Chain
          </span>
        </div>
      )}

      {/* Filter and Clear bar */}
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-[#111827] hover:bg-rose-500/10 hover:border-rose-500/30 text-xs font-semibold text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
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
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                {group.label} ({group.items.length})
              </div>

              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800/60">
                {group.items.map((act) => {
                  const isExpanded = expandedId === act.id;
                  return (
                    <div
                      key={act.id}
                      onClick={() => setExpandedId(isExpanded ? null : act.id)}
                      className="p-4 hover:bg-slate-800/20 transition-colors cursor-pointer flex flex-col"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getIcon(act.entityType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-semibold text-sm text-white">{act.title}</span>
                            <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                              {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          {act.details && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate">{act.details}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-blue-400 uppercase font-semibold tracking-wider">
                              {act.action}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {act.entityType}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>

                      {/* Expandable Technical Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 font-mono">
                          <div>
                            <span className="text-slate-500">Event ID:</span>{' '}
                            <span className="text-slate-300">{act.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Timestamp:</span>{' '}
                            <span className="text-slate-300">{new Date(act.createdAt).toISOString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Entity Ref:</span>{' '}
                            <span className="text-slate-300">{act.entityId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Entity Type:</span>{' '}
                            <span className="text-slate-300">{act.entityType}</span>
                          </div>
                          {act.entryHash && (
                            <div className="col-span-2 pt-1 border-t border-slate-800/60 truncate">
                              <span className="text-slate-500">Entry Hash:</span>{' '}
                              <span className="text-[10px] text-emerald-400 font-mono">{act.entryHash}</span>
                            </div>
                          )}
                          {act.prevHash && (
                            <div className="col-span-2 truncate">
                              <span className="text-slate-500">Prev Hash:</span>{' '}
                              <span className="text-[10px] text-slate-400 font-mono">{act.prevHash}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
