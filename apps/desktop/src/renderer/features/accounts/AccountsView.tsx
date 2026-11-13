import React, { useState } from 'react';
import { Application, Account } from '@accounthub/shared';
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
} from 'lucide-react';
import { AccountModal } from './AccountModal';

interface AccountsViewProps {
  applications: Application[];
  accounts: Account[];
  selectedAppId?: string;
  onCreateAccount: (data: any) => Promise<void>;
  onUpdateAccount: (id: string, data: any) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
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
}) => {
  const [appFilter, setAppFilter] = useState<string>(selectedAppId || 'all');
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
          <select
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#111827] border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>

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

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Account</span>
        </button>
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
                <th className="px-4 py-3.5">Application</th>
                <th className="px-4 py-3.5">Region</th>
                <th className="px-4 py-3.5">Auth Mode</th>
                <th className="px-4 py-3.5">Vault Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
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
                    <td className="px-4 py-4 text-slate-300 font-medium">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                        {parentApp?.name || 'Unknown App'}
                      </span>
                    </td>

                    {/* Region */}
                    <td className="px-4 py-4 text-slate-300 font-mono text-[11px]">
                      {acc.region || '—'}
                    </td>

                    {/* Auth Mode */}
                    <td className="px-4 py-4">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] font-medium">
                        {acc.authMethod}
                      </span>
                    </td>

                    {/* Vault Status */}
                    <td className="px-4 py-4">
                      {acc.hasCredentials ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                          <Shield className="w-3.5 h-3.5" />
                          <span>WinCred Secured</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Manual / Unset</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Favorite */}
                        <button
                          onClick={() => onToggleFavorite(acc.id)}
                          title={acc.isFavorite ? 'Unfavorite' : 'Mark Favorite'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            acc.isFavorite
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${acc.isFavorite ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* Set Default */}
                        {!acc.isDefault && (
                          <button
                            onClick={() => onSetDefault(acc.id)}
                            title="Set as Default Account"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(acc)}
                          title="Edit Account"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirmId(acc.id)}
                          title="Delete Account & Wipe Secrets"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
    </div>
  );
};
