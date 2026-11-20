import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import {
  Application,
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AuthMethod,
  RIOT_REGIONS,
} from '@quickswap/shared';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  initialApplicationId?: string;
  accountToEdit?: Account | null;
  onSubmit: (data: CreateAccountInput | UpdateAccountInput) => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  applications,
  initialApplicationId,
  accountToEdit,
  onSubmit,
}) => {
  const isEditing = Boolean(accountToEdit);

  const [applicationId, setApplicationId] = useState(
    initialApplicationId || applications[0]?.id || ''
  );
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [region, setRegion] = useState('EUW');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('credentials');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [launchArguments, setLaunchArguments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountToEdit) {
      setApplicationId(accountToEdit.applicationId);
      setDisplayName(accountToEdit.displayName);
      setUsername(accountToEdit.username || '');
      setPassword('');
      setRegion(accountToEdit.region || 'EUW');
      setAuthMethod(accountToEdit.authMethod);
      setIsFavorite(accountToEdit.isFavorite);
      setIsDefault(accountToEdit.isDefault);
      setLaunchArguments(accountToEdit.launchArguments || '');
    } else {
      setApplicationId(initialApplicationId || applications[0]?.id || '');
      setDisplayName('');
      setUsername('');
      setPassword('');
      setRegion('EUW');
      setAuthMethod('credentials');
      setIsFavorite(false);
      setIsDefault(false);
      setLaunchArguments('');
    }
  }, [accountToEdit, initialApplicationId, isOpen, applications]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!applicationId) {
      setError('Please select an application.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await onSubmit({
          displayName: displayName.trim(),
          username: username.trim() || null,
          password: password ? password : null, // Only send if user typed a new password
          region: region || null,
          authMethod,
          isFavorite,
          isDefault,
          launchArguments: launchArguments.trim() || null,
        } as UpdateAccountInput);
      } else {
        await onSubmit({
          applicationId,
          displayName: displayName.trim(),
          username: username.trim() || null,
          password: password ? password : null,
          region: region || null,
          authMethod,
          isFavorite,
          isDefault,
          launchArguments: launchArguments.trim() || null,
        } as CreateAccountInput);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Account - ${accountToEdit?.displayName}` : 'Add New Account'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Application Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Application *
          </label>
          <select
            value={applicationId}
            disabled={isEditing}
            onChange={(e) => setApplicationId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.category})
              </option>
            ))}
          </select>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Account Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Main Account, Smurf, Tournament"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Username / Login ID */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username / Login ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. summoner123"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {RIOT_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Password (Vault Protected) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Password (Protected in Windows Credential Manager)</span>
            </label>
            {isEditing && (
              <span className="text-[11px] text-slate-400">Leave blank to keep existing</span>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? '••••••••••••••••' : 'Enter account password'}
              className="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
            <Shield className="w-3 h-3 flex-shrink-0" />
            <span>Never written in plaintext. Isolated inside Windows Credential Vault.</span>
          </div>
        </div>

        {/* Auth Method */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Authentication Method
          </label>
          <select
            value={authMethod}
            onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="credentials">Credential-based (Official Login Flow)</option>
            <option value="session">Session-based (Saved Token)</option>
            <option value="hybrid">Hybrid (Session first, Credential fallback)</option>
            <option value="manual">Manual Login</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span>Set as Default Account</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span>Star as Favorite</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Account' : 'Save Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
