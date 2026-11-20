import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { RegisterApplicationInput, ApplicationCategory } from '@quickswap/shared';

interface RegisterAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: RegisterApplicationInput) => Promise<void>;
}

export const RegisterAppModal: React.FC<RegisterAppModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [executablePath, setExecutablePath] = useState('');
  const [category, setCategory] = useState<ApplicationCategory>('games');
  const [adapterId, setAdapterId] = useState('generic');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Application name is required.');
      return;
    }
    if (!executablePath.trim()) {
      setError('Executable path is required.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name: name.trim(),
        executablePath: executablePath.trim(),
        category,
        adapterId,
        isFavorite,
      });
      onClose();
      // Reset
      setName('');
      setExecutablePath('');
      setIsFavorite(false);
    } catch (err: any) {
      setError(err.message || 'Failed to register application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register Application">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Application Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Riot Games, Steam, Discord"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Executable Path (.exe) *
          </label>
          <input
            type="text"
            value={executablePath}
            onChange={(e) => setExecutablePath(e.target.value)}
            placeholder="e.g. C:\Riot Games\Riot Client\RiotClientServices.exe"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
            required
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Path to the official client executable on your device.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ApplicationCategory)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="games">Games</option>
              <option value="productivity">Productivity</option>
              <option value="communication">Communication</option>
              <option value="utilities">Utilities</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Adapter Driver
            </label>
            <select
              value={adapterId}
              onChange={(e) => setAdapterId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="riot">Riot Games</option>
              <option value="steam">Steam</option>
              <option value="epic">Epic Games</option>
              <option value="discord">Discord</option>
              <option value="generic">Generic Launcher</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="favApp"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="favApp" className="text-xs text-slate-300 font-medium cursor-pointer">
            Pin as favorite application
          </label>
        </div>

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
            {loading ? 'Registering...' : 'Register Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
