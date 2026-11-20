import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import {
  Application,
  CreateAccountInput,
  AuthMethod,
  RIOT_REGIONS,
} from '@quickswap/shared';
import { AppIcon } from '../../components/AppIcon';
import {
  Shield,
  KeyRound,
  Lock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Info,
  Star,
  Crown,
} from 'lucide-react';

interface AccountWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  initialApplicationId?: string;
  onSubmit: (data: CreateAccountInput) => Promise<void>;
}

export const AccountWizardModal: React.FC<AccountWizardModalProps> = ({
  isOpen,
  onClose,
  applications,
  initialApplicationId,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAppId, setSelectedAppId] = useState<string>(
    initialApplicationId || applications[0]?.id || ''
  );
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('EUW');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('credentials');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [launchArguments, setLaunchArguments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedAppId(initialApplicationId || applications[0]?.id || '');
      setDisplayName('');
      setUsername('');
      setPassword('');
      setRegion('EUW');
      setAuthMethod('credentials');
      setIsFavorite(false);
      setIsDefault(false);
      setLaunchArguments('');
      setError(null);
    }
  }, [isOpen, initialApplicationId, applications]);

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const isRiot = selectedApp?.adapterId === 'riot';
  const isSteam = selectedApp?.adapterId === 'steam';

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!selectedAppId) {
        setError('Please select an application.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!displayName.trim()) {
        setError('Display name is required.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleFinish = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        applicationId: selectedAppId,
        displayName: displayName.trim(),
        username: username.trim() || undefined,
        password: password || undefined,
        region: isRiot ? region : undefined,
        authMethod: isRiot && authMethod === 'session' ? 'session' : 'credentials',
        isFavorite,
        isDefault,
        launchArguments: launchArguments.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create account profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Account Wizard"
      subtitle={`Step ${step} of 3: ${
        step === 1
          ? 'Select Application'
          : step === 2
          ? 'Configure Account Details'
          : 'Security & Storage Review'
      }`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s === step
                  ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                  : s < step
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* STEP 1: Select Application */}
        {step === 1 && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">
              Which application is this account for?
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {applications.map((app) => {
                const isSelected = app.id === selectedAppId;
                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <AppIcon app={app} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{app.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {app.category} • {app.accountCount || 0} accounts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Adaptive Account Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
              {selectedApp && <AppIcon app={selectedApp} size="sm" />}
              <div className="text-xs text-slate-300">
                Configuring profile for <strong className="text-white">{selectedApp?.name}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  Profile / Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Main Account, Smurf, Solo Q"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  {isSteam ? 'Steam Username (-login)' : 'Username / Login ID'}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Login username"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password input for credential storage */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Password (Saved to Windows Credential Vault)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional: Enter password for automated login"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Riot Region Selector if Riot Client */}
            {isRiot && (
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  Server Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {RIOT_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Extra Options */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Pin to Quick Access</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <Crown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Set as Default Account</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: Security & Storage Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-slate-900 border border-blue-500/30">
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Where Your Data Will Be Stored</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Account Metadata:</strong> Saved locally in SQLite (Display name: <em>{displayName}</em>, Username: <em>{username || 'None'}</em>).
                  </span>
                </li>
                {password && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Password Secret:</strong> Passed via secure stdin directly to <strong>Windows Credential Manager</strong> (`advapi32.dll`). Zero plaintext stored in SQLite.
                    </span>
                  </li>
                )}
                {isRiot && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Session Tokens:</strong> Encrypted using <strong>Windows DPAPI</strong> bound to your Windows user key.
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{submitting ? 'Encrypting & Saving...' : 'Create Account Profile'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
