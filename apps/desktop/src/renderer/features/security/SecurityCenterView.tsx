import React, { useState } from 'react';
import { SecurityStatus, StoredCredentialMetadata } from '@quickswap/shared';
import {
  ShieldCheck,
  Shield,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  FileKey,
} from 'lucide-react';

interface SecurityCenterViewProps {
  status: SecurityStatus | null;
  credentials: StoredCredentialMetadata[];
  onRefresh: () => Promise<void>;
  onVerifyIntegrity: () => Promise<{ valid: boolean; issues: string[] }>;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({
  status,
  credentials,
  onRefresh,
  onVerifyIntegrity,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verifyingLog, setVerifyingLog] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    issues: string[];
  } | null>(null);
  const [logAuditResult, setLogAuditResult] = useState<{
    valid: boolean;
    totalChecked: number;
    message: string;
  } | null>(null);

  const handleRunAudit = async () => {
    try {
      setVerifying(true);
      const res = await onVerifyIntegrity();
      setIntegrityResult(res);
      await onRefresh();
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyAuditLog = async () => {
    try {
      setVerifyingLog(true);
      if (!window.quickswapAPI) {
        throw new Error('API not available');
      }
      const res = await window.quickswapAPI.security.verifyAuditLog();
      setLogAuditResult(res);
    } catch (err: any) {
      setLogAuditResult({
        valid: false,
        totalChecked: 0,
        message: err.message || 'Verification failed',
      });
    } finally {
      setVerifyingLog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900/40 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Native Windows Security Shield Active</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Local Hardware-Backed Vault
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Quickswap stores all passwords and session tokens inside Windows Credential Manager
              and protects encryption keys with Windows DPAPI (Data Protection API). Zero plaintext
              passwords ever touch the database or leave this PC.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerifyAuditLog}
              disabled={verifyingLog}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <Shield className={`w-3.5 h-3.5 ${verifyingLog ? 'animate-spin' : 'text-emerald-400'}`} />
              <span>{verifyingLog ? 'Verifying Chain...' : 'Verify Audit Log'}</span>
            </button>

            <button
              onClick={handleRunAudit}
              disabled={verifying}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Auditing Vault...' : 'Run Vault Integrity Audit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Integrity Audit Result Notice if Run */}
      {integrityResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-200 ${
            integrityResult.valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {integrityResult.valid ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-sm">
              {integrityResult.valid
                ? 'Vault Integrity Verified 100%'
                : 'Integrity Warning Detected'}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {integrityResult.valid
                ? 'All SQLite secret references match physical entries in Windows Credential Manager.'
                : integrityResult.issues.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Hash Chain Audit Result */}
      {logAuditResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-200 ${
            logAuditResult.valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {logAuditResult.valid ? (
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-sm">
              {logAuditResult.valid
                ? `Audit Log Hash Chain Intact (${logAuditResult.totalChecked} verified)`
                : 'Audit Log Tampering Detected'}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">{logAuditResult.message}</div>
          </div>
        </div>
      )}

      {/* Three Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Windows Credential Manager */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Primary Credential Storage</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-white">Windows Credential Manager</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Uses native Win32 <code className="text-blue-400 font-mono">advapi32.dll</code>{' '}
              credential vault. Passwords are never placed in SQLite tables.
            </p>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Operational & Enforced</span>
          </div>
        </div>

        {/* DPAPI */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Session Protection</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <FileKey className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-white">Windows DPAPI</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hardware/User-bound encryption. Data encrypted with DPAPI cannot be decrypted on
              another machine or user account.
            </p>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>CurrentUser Scope Active</span>
          </div>
        </div>

        {/* SQLite Reference Model */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Database Safety</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-white">Opaque Secret References</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              SQLite only holds pointer IDs (e.g.{' '}
              <code className="text-cyan-400 font-mono">Quickswap/acc-1/password</code>). No raw
              passwords ever leak into backups.
            </p>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{status?.activeSecretReferences || 0} References Bound</span>
          </div>
        </div>
      </div>

      {/* Credential Manager Stored Targets Audit Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Windows Credential Manager Audit Targets</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical credential slots managed under target prefix{' '}
              <code className="text-blue-400 font-mono">Quickswap/*</code>
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Refresh List
          </button>
        </div>

        {credentials.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            No credentials saved in Windows Credential Manager yet.
          </div>
        ) : (
          <div className="border border-slate-800/80 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Credential Vault Target Name</th>
                  <th className="px-4 py-3">Associated Username</th>
                  <th className="px-4 py-3">Security Level</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {credentials.map((cred) => (
                  <tr key={cred.targetName} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-blue-400">
                      {cred.targetName}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                      {cred.username || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      Windows Local Machine Vault
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Protected</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
