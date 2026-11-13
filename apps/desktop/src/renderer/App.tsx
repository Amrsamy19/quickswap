import React, { useState, useEffect, useCallback } from 'react';
import {
  Application,
  Account,
  SecurityStatus,
  StoredCredentialMetadata,
  ActivityLogEntry,
  AppSettings,
  CreateAccountInput,
  UpdateAccountInput,
  RegisterApplicationInput,
  UpdateSettingsInput,
} from '@accounthub/shared';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './features/dashboard/DashboardView';
import { ApplicationsView } from './features/applications/ApplicationsView';
import { AccountsView } from './features/accounts/AccountsView';
import { SecurityCenterView } from './features/security/SecurityCenterView';
import { ActivityView } from './features/activity/ActivityView';
import { SettingsView } from './features/settings/SettingsView';
import { AccountModal } from './features/accounts/AccountModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [applications, setApplications] = useState<Application[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [credentials, setCredentials] = useState<StoredCredentialMetadata[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  const api = typeof window !== 'undefined' ? window.accountHubAPI : null;

  const loadData = useCallback(async () => {
    if (!api) return;
    try {
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
    } catch (err) {
      console.error('Failed to load AccountHub data:', err);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const res = await api.launcher.launch(accountId, force);
    await loadData();
    return res;
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
          subtitle: 'Welcome to your universal desktop account hub',
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100">
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
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onAddAccount={applications.length > 0 ? () => setIsAddAccountModalOpen(true) : undefined}
          onScanApps={handleScanInstalled}
          scanning={scanning}
        />

        <main className="flex-1 overflow-y-auto p-8">
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
            <SettingsView settings={settings} onUpdate={handleUpdateSettings} />
          )}
        </main>
      </div>

      {/* Quick Add Account Modal */}
      {applications.length > 0 && (
        <AccountModal
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
