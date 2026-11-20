import React, { useState, useEffect, useCallback } from 'react';
import {
  Application,
  Account,
  SecurityStatus,
  VaultLockStatus,
  StoredCredentialMetadata,
  ActivityLogEntry,
  AppSettings,
  CreateAccountInput,
  UpdateAccountInput,
  RegisterApplicationInput,
  UpdateSettingsInput,
} from '@quickswap/shared';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './features/dashboard/DashboardView';
import { ApplicationsView } from './features/applications/ApplicationsView';
import { AccountsView } from './features/accounts/AccountsView';
import { SecurityCenterView } from './features/security/SecurityCenterView';
import { ActivityView } from './features/activity/ActivityView';
import { SettingsView } from './features/settings/SettingsView';
import { AccountWizardModal } from './features/accounts/AccountWizardModal';
import { TitleBar } from './components/TitleBar';
import { CommandPalette } from './components/CommandPalette';
import { UnlockVaultModal } from './components/UnlockVaultModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [applications, setApplications] = useState<Application[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [vaultLockStatus, setVaultLockStatus] = useState<VaultLockStatus | null>(null);
  const [credentials, setCredentials] = useState<StoredCredentialMetadata[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('quickswap_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('quickswap_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const api = typeof window !== 'undefined' ? (window.quickswapAPI || window.accountHubAPI) : null;

  const handleTogglePrivacyMode = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('quickswap_privacy_mode', String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('quickswap_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleLockVault = async () => {
    if (!api?.security?.lockVault) return;
    try {
      await api.security.lockVault();
      if (api.security.getLockStatus) {
        const lockStatus = await api.security.getLockStatus();
        setVaultLockStatus(lockStatus);
      }
    } catch (err) {
      console.error('Failed to lock vault:', err);
    }
  };

  const loadData = useCallback(async () => {
    if (!api) return;
    try {
      if (api.security?.getLockStatus) {
        api.security.getLockStatus().then(setVaultLockStatus).catch(() => {});
      }

      if (api.dashboard?.getSummary) {
        const summary = await api.dashboard.getSummary();
        setApplications(summary.applications);
        setAccounts(summary.accounts);
        setSecurityStatus(summary.securityStatus);
        setCredentials(summary.credentials);
        setActivities(summary.activities);
        setSettings(summary.settings);
      } else {
        const [apps, accs, secStatus, creds, acts, setts] = await Promise.all([
          api.applications.list(),
          api.accounts.list(),
          api.security.getStatus(),
          api.security.listStoredCredentials(),
          api.activity.list(50),
          api.settings.get(),
        ]);

        setApplications(apps);
        setAccounts(accs);
        setSecurityStatus(secStatus);
        setCredentials(creds);
        setActivities(acts);
        setSettings(setts);
      }
    } catch (err) {
      console.error('Failed to load Quickswap data:', err);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global hotkeys for Command Palette (Ctrl+K) and Streamer Privacy Mode (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleTogglePrivacyMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actions
  const handleScanInstalled = async () => {
    if (!api) return;
    try {
      setScanning(true);
      await api.applications.detect();
      await loadData();
    } catch (err) {
      console.error('Failed to scan installed applications:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleRegisterApplication = async (input: RegisterApplicationInput) => {
    if (!api) return;
    await api.applications.register(input);
    await loadData();
  };

  const handleRemoveApplication = async (id: string) => {
    if (!api) return;
    if (confirm('Are you sure you want to remove this application and all associated accounts?')) {
      await api.applications.remove(id);
      await loadData();
    }
  };

  const handleCreateAccount = async (data: CreateAccountInput) => {
    if (!api) return;
    await api.accounts.create(data);
    await loadData();
  };

  const handleUpdateAccount = async (id: string, data: UpdateAccountInput) => {
    if (!api) return;
    await api.accounts.update(id, data);
    await loadData();
  };

  const handleDeleteAccount = async (id: string) => {
    if (!api) return;
    await api.accounts.delete(id);
    await loadData();
  };

  const handleSetDefault = async (id: string) => {
    if (!api) return;
    await api.accounts.setDefault(id);
    await loadData();
  };

  const handleLaunchAccount = async (accountId: string, force: boolean = false) => {
    if (!api) return { success: false, message: 'API not available' };
    try {
      const res = await api.launcher.launch(accountId, force);
      await loadData();
      return res;
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('locked') || err?.message?.toLowerCase().includes('vault')) {
        setIsUnlockModalOpen(true);
      }
      throw err;
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (!api) return;
    await api.accounts.toggleFavorite(id);
    await loadData();
  };

  const handleVerifyIntegrity = async () => {
    if (!api) return { valid: false, issues: ['API not available'] };
    return api.security.verifyIntegrity();
  };

  const handleClearActivity = async () => {
    if (!api) return;
    await api.activity.clear();
    await loadData();
  };

  const handleUpdateSettings = async (input: UpdateSettingsInput) => {
    if (!api) return;
    const updated = await api.settings.update(input);
    setSettings(updated);
  };

  const getHeaderMeta = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Welcome to Quickswap - your universal desktop account vault',
        };
      case 'applications':
        return {
          title: 'Application Library',
          subtitle: 'Manage registered desktop games, clients, and software',
        };
      case 'accounts':
        return {
          title: 'Account Vault',
          subtitle: 'Switch between accounts and protect credentials securely',
        };
      case 'security':
        return {
          title: 'Security Center',
          subtitle: 'Hardware-backed Windows Credential Manager and DPAPI integrity',
        };
      case 'activity':
        return {
          title: 'Audit Trail',
          subtitle: 'Local audit log of security, launch, and management events',
        };
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Customize application behavior and local preferences',
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100 ${privacyMode ? 'privacy-mode' : ''}`}>
      {/* Custom Frameless Window TitleBar */}
      <TitleBar
        privacyMode={privacyMode}
        onTogglePrivacyMode={handleTogglePrivacyMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        vaultHealthy={securityStatus?.securityHealth === 'healthy'}
        vaultLockStatus={vaultLockStatus}
        onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
        onLockVault={handleLockVault}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'accounts') {
              setSelectedAppId(undefined);
            }
          }}
          vaultHealthy={securityStatus?.securityHealth === 'healthy'}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            stats={
              currentTab === 'dashboard'
                ? {
                    appsCount: applications.length,
                    accountsCount: accounts.length,
                    secretsCount: securityStatus?.activeSecretReferences || 0,
                  }
                : undefined
            }
            onAddAccount={applications.length > 0 ? () => setIsAddAccountModalOpen(true) : undefined}
            onScanApps={handleScanInstalled}
            scanning={scanning}
          />

          <main className="flex-1 overflow-y-auto p-8">
            <div key={currentTab} className="animate-tab-enter">
              {currentTab === 'dashboard' && (
                <DashboardView
                  applications={applications}
                  accounts={accounts}
                  securityStatus={securityStatus}
                  activities={activities}
                  onNavigateToAccounts={(appId) => {
                    setSelectedAppId(appId);
                    setCurrentTab('accounts');
                  }}
                  onNavigateToApplications={() => setCurrentTab('applications')}
                  onNavigateToSecurity={() => setCurrentTab('security')}
                  onLaunchAccount={handleLaunchAccount}
                />
              )}

              {currentTab === 'applications' && (
                <ApplicationsView
                  applications={applications}
                  onRegisterApplication={handleRegisterApplication}
                  onRemoveApplication={handleRemoveApplication}
                  onScanInstalled={handleScanInstalled}
                  onSelectApplication={(id) => {
                    setSelectedAppId(id);
                    setCurrentTab('accounts');
                  }}
                  scanning={scanning}
                />
              )}

              {currentTab === 'accounts' && (
                <AccountsView
                  applications={applications}
                  accounts={accounts}
                  selectedAppId={selectedAppId}
                  onCreateAccount={handleCreateAccount}
                  onUpdateAccount={handleUpdateAccount}
                  onDeleteAccount={handleDeleteAccount}
                  onSetDefault={handleSetDefault}
                  onToggleFavorite={handleToggleFavorite}
                  onLaunchAccount={handleLaunchAccount}
                  onRefreshData={loadData}
                />
              )}

              {currentTab === 'security' && (
                <SecurityCenterView
                  status={securityStatus}
                  credentials={credentials}
                  onRefresh={loadData}
                  onVerifyIntegrity={handleVerifyIntegrity}
                />
              )}

              {currentTab === 'activity' && (
                <ActivityView activities={activities} onClear={handleClearActivity} />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdate={handleUpdateSettings}
                  vaultLockStatus={vaultLockStatus}
                  onConfigureMasterPassword={() => setIsUnlockModalOpen(true)}
                  onLockVault={handleLockVault}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Unlock / Master Password Modal */}
      <UnlockVaultModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        status={vaultLockStatus}
        onUnlocked={loadData}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        applications={applications}
        accounts={accounts}
        onLaunchAccount={handleLaunchAccount}
        onNavigateTab={(tab, appId) => {
          if (appId) setSelectedAppId(appId);
          setCurrentTab(tab);
        }}
        onAddAccount={() => setIsAddAccountModalOpen(true)}
        onScanApps={handleScanInstalled}
        onTogglePrivacy={handleTogglePrivacyMode}
      />

      {/* Adaptive Add Account Wizard */}
      {applications.length > 0 && (
        <AccountWizardModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          applications={applications}
          initialApplicationId={selectedAppId}
          onSubmit={handleCreateAccount}
        />
      )}
    </div>
  );
};
