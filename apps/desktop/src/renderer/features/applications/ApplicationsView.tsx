import React, { useState } from 'react';
import { Application, ApplicationCategory } from '@accounthub/shared';
import {
  Gamepad2,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Users,
  CheckCircle2,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { RegisterAppModal } from './RegisterAppModal';
import { AppIcon } from '../../components/AppIcon';

interface ApplicationsViewProps {
  applications: Application[];
  onRegisterApplication: (input: any) => Promise<void>;
  onRemoveApplication: (id: string) => Promise<void>;
  onScanInstalled: () => Promise<void>;
  onSelectApplication: (id: string) => void;
  scanning: boolean;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onRegisterApplication,
  onRemoveApplication,
  onScanInstalled,
  onSelectApplication,
  scanning,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.adapterId.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111827] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer transition-colors shadow-sm"
            >
              <option value="all" className="bg-[#111827] text-white">All Categories</option>
              <option value="games" className="bg-[#111827] text-white">Games</option>
              <option value="communication" className="bg-[#111827] text-white">Communication</option>
              <option value="productivity" className="bg-[#111827] text-white">Productivity</option>
              <option value="utilities" className="bg-[#111827] text-white">Utilities</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onScanInstalled}
            disabled={scanning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-blue-400' : ''}`} />
            <span>Scan Installed</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register App</span>
          </button>
        </div>
      </div>

      {/* Applications Grid */}
      {filteredApps.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
          <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Applications Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Scan your system for installed game clients (Riot, Steam, Epic) or register your
            own custom executable.
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <button
              onClick={onScanInstalled}
              disabled={scanning}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
            >
              Scan for Installed Clients
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Register Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <AppIcon app={app} size="lg" />
                    <div>
                      <h4 className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                        {app.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 capitalize">{app.category}</span>
                        {app.isInstalled && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Installed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {app.isFavorite && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                  )}
                </div>

                {app.executablePath && (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 font-mono text-[10px] text-slate-400 truncate mt-2 flex items-center gap-1.5">
                    <FolderOpen className="w-3 h-3 flex-shrink-0 text-slate-500" />
                    <span className="truncate">{app.executablePath}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                <button
                  onClick={() => onSelectApplication(app.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{app.accountCount || 0} Accounts</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRemoveApplication(app.id)}
                    title="Remove application"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RegisterAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={onRegisterApplication}
      />
    </div>
  );
};
