# AccountHub --- Full Product & Technical Implementation Plan

**Version:** 1.0\
**Platform:** Windows 10/11 (x64), first release\
**Product type:** Local-first desktop application\
**Initial integration:** Riot Games

## 1. Product vision

AccountHub is a universal desktop account manager that lets users
register multiple accounts for the same application, securely manage
authentication information, switch between accounts where supported, and
launch applications using the selected account.

The first integration will be Riot Games, followed by Steam, Epic Games,
Discord, Ubisoft Connect, and other applications.

### Core objectives

1.  Register and manage multiple applications.
2.  Support multiple accounts per application.
3.  Support credential-based authentication.
4.  Support session-based authentication where technically and
    contractually supported.
5.  Launch applications with the selected account.
6.  Isolate account sessions wherever the application supports it.
7.  Protect credentials and session data.
8.  Provide an extensible integration-adapter architecture.
9.  Work offline without requiring an AccountHub cloud account or
    backend.

### Product principles

-   Local-first: account metadata and secrets remain on the user's
    device.
-   Security-first: never store plaintext passwords or tokens.
-   Adapter-driven: each application declares its actual capabilities.
-   Honest capability reporting: never claim that account switching
    works unless verified.
-   User-controlled: no silent logout, process termination, or risky
    switching.
-   Extensible: adding an integration must not require rewriting the
    core.

## 2. Functional requirements

### Module A --- Application library

Users can:

-   Automatically detect supported installed applications.
-   Manually register an application.
-   Specify or edit its executable path.
-   Retrieve its icon when possible.
-   Categorize and favorite applications.
-   Search and filter the library.
-   View installation and integration status.
-   See how many accounts are registered for each application.

### Module B --- Account management

Each application can contain multiple accounts.

Account metadata:

  Field                   Description
  ----------------------- -------------------------------------
  Account ID              Unique internal identifier
  Application ID          Parent application
  Display name            User-defined account name
  Username                Login username/email, if applicable
  External ID             Application-specific identifier
  Region                  Region/server, if applicable
  Avatar                  Profile image
  Authentication method   Credentials, session, or hybrid
  Favorite                Whether the account is pinned
  Last used               Last successful launch/use
  Created at              Registration date

Features:

-   Create, edit, and delete accounts.
-   Rename accounts and change avatars.
-   Set a preferred authentication method.
-   Mark favorites and set a default account.
-   View authentication status and last-used information.
-   Search and group accounts.

Passwords and session data must be handled separately from ordinary
account metadata. SQLite stores metadata and references to secrets,
never raw credentials or tokens.

### Module C --- Authentication manager

AccountHub supports three authentication modes:

1.  **Credential-based:** Store credentials securely and use the
    application's official login flow or supported authentication API.
2.  **Session-based:** Save and restore application session data only
    where the integration has a supported, safe mechanism.
3.  **Hybrid:** Prefer a valid supported session; fall back to the
    official credential login flow when the session is missing or
    expired.

Authentication workflow:

1.  User selects an account.
2.  AccountHub checks the integration's declared capabilities.
3.  It checks whether a supported session is available.
4.  If valid, it invokes the integration's session workflow.
5.  If unavailable or expired, it starts the supported credential or
    manual-login flow.
6.  MFA and CAPTCHA are completed through the official application.
7.  The integration verifies the resulting authentication state where
    possible.
8.  The session may be saved if supported.

Authentication states:

-   Not configured
-   Credentials saved
-   Login required
-   Authentication pending
-   Session available
-   Session expired
-   Authentication failed
-   Unknown

A successful process launch must never be treated as proof of successful
authentication.

### Module D --- Account switcher

Switching workflow:

1.  User selects an application and account.
2.  AccountHub checks whether the application is running.
3.  It checks switching restrictions and warns if the user must close
    the application.
4.  It checks the selected account's authentication state.
5.  It restores a supported session or starts the official login flow.
6.  It launches the application.
7.  It verifies that the expected process starts.
8.  It records the result and updates last-used information only after a
    successful outcome.

Requirements:

-   Detect running applications.
-   Warn before closing or switching away from a running session.
-   Never silently terminate an active game or unsaved application.
-   Support a normal "Launch without switching" action.
-   Report unsupported switching clearly.
-   Provide recoverable error states.

### Module E --- Application launcher

Responsibilities:

-   Detect executable paths.
-   Launch applications.
-   Support validated application-specific arguments.
-   Handle launch failures and timeouts.
-   Detect running processes and track process IDs.
-   Avoid duplicate instances where unsupported.
-   Support per-application launch configurations.
-   Provide shortcuts and favorite-account launch actions.

The generic launcher must not assume every application accepts the same
arguments or supports multiple instances.

### Module F --- Security manager

Requirements:

-   Windows Credential Manager for credentials.
-   DPAPI for protected local session data and encryption keys.
-   SQLite for non-secret metadata.
-   Strict IPC communication.
-   No secrets in React state longer than necessary.
-   No secrets in logs, crash reports, or telemetry.
-   Secure cleanup when accounts are deleted.
-   Optional master password for additional application-level
    protection.
-   Automatic lock after inactivity.
-   Encrypted export/import.

### Module G --- Account activity

Maintain local activity history for:

-   Account added, edited, or deleted.
-   Application launched.
-   Account switch requested/completed.
-   Authentication required.
-   Session expired.
-   Launch failed.

Never include passwords, access tokens, cookies, or session contents in
logs.

### Module H --- Settings

Settings include:

-   Start with Windows.
-   Minimize to system tray.
-   Start minimized.
-   Dark/light/system theme.
-   Language.
-   Default account behavior.
-   Session status checks.
-   Lock after inactivity.
-   Optional master password.
-   Encrypted backup location.
-   Application data location.
-   Privacy/security information.
-   Version and update settings.

## 3. Technology stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Desktop framework       Electron                Windows desktop
                                                  application

  UI                      React                   User interface

  Language                TypeScript              Application code

  Styling                 Tailwind CSS            Styling

  Components              shadcn/ui               UI primitives

  State                   Zustand                 Renderer state

  Routing                 React Router            Navigation

  Database                SQLite                  Local metadata

  ORM                     Drizzle ORM             Database
                                                  access/migrations

  Validation              Zod                     Runtime validation

  Credential storage      Windows Credential      Password storage
                          Manager                 

  Session protection      DPAPI                   Local secret protection

  Process management      Node.js child processes Launch/monitor
                                                  processes

  Testing                 Vitest + Playwright     Unit and UI/E2E tests

  Packaging               electron-builder        Windows installer

  Package manager         pnpm                    Workspace management
  -----------------------------------------------------------------------

The renderer must not access Windows APIs, files, processes, or secrets
directly. It communicates with the Electron main process through a
narrow, validated preload API.

## 4. System architecture

### Main components

  Component                Responsibility
  ------------------------ -------------------------------------
  Application Registry     Register and detect applications
  Account Manager          CRUD and account metadata
  Authentication Manager   Coordinate authentication workflows
  Session Manager          Store/restore supported sessions
  Credential Manager       Secure credential operations
  Application Launcher     Start and monitor processes
  Integration Registry     Register and manage adapters
  Security Manager         Encryption and security policies
  Activity Manager         Maintain audit history

### Architecture flow

``` mermaid
flowchart TB
    UI["React Renderer"]
    PRE["Preload Bridge"]
    IPC["Validated IPC Layer"]

    subgraph CORE["Electron Main Process"]
        APP["Application Registry"]
        ACC["Account Manager"]
        AUTH["Authentication Manager"]
        LAUNCH["Application Launcher"]
        SEC["Security Manager"]
        SESSION["Session Manager"]
    end

    subgraph STORAGE["Local Storage"]
        DB[("SQLite")]
        VAULT["Windows Credential Manager"]
        DPAPI["DPAPI Protected Data"]
    end

    subgraph ADAPTERS["Integration Adapters"]
        RIOT["Riot Adapter"]
        STEAM["Steam Adapter"]
        DISCORD["Discord Adapter"]
        GENERIC["Generic Launcher"]
    end

    UI <--> PRE
    PRE <--> IPC
    IPC <--> APP
    IPC <--> ACC
    IPC <--> AUTH
    IPC <--> LAUNCH

    ACC <--> DB
    APP <--> DB
    SEC <--> VAULT
    SEC <--> DPAPI
    AUTH <--> SEC
    AUTH <--> SESSION
    SESSION <--> RIOT

    LAUNCH <--> RIOT
    LAUNCH <--> STEAM
    LAUNCH <--> DISCORD
    LAUNCH <--> GENERIC
```

## 5. Integration adapter architecture

Every supported application gets its own adapter. Riot-specific logic
must not be embedded in the generic account manager.

Each adapter declares:

-   Application identification.
-   Installation detection.
-   Executable path.
-   Launch method.
-   Multiple-instance support.
-   Credential authentication support.
-   Session persistence support.
-   Session validation support.
-   Account identification support.
-   MFA requirements.
-   Account-switching restrictions.

### Standard adapter contract

``` typescript
export type AuthMethod =
  | "credentials"
  | "session"
  | "hybrid"
  | "manual";

export type SessionStatus =
  | "valid"
  | "expired"
  | "missing"
  | "unknown";

export interface IntegrationCapabilities {
  credentials: boolean;
  sessions: boolean;
  multipleInstances: boolean;
  accountIdentification: boolean;
  sessionValidation: boolean;
  manualLogin: boolean;
}

export interface LaunchContext {
  accountId: string;
  applicationId: string;
  executablePath: string;
  arguments?: string[];
}

export interface ApplicationAdapter {
  id: string;
  name: string;
  version: string;
  capabilities: IntegrationCapabilities;

  detectInstallation(): Promise<boolean>;
  getExecutablePath(): Promise<string | null>;
  getRunningStatus(): Promise<boolean>;
  launch(context: LaunchContext): Promise<void>;

  authenticate(
    accountId: string,
    method: AuthMethod
  ): Promise<void>;

  getSessionStatus(
    accountId: string
  ): Promise<SessionStatus>;

  saveSession(accountId: string): Promise<void>;
  restoreSession(accountId: string): Promise<void>;
  logout?(): Promise<void>;
}
```

The contract is an architectural starting point. Implementations must
explicitly reject unsupported operations rather than pretending they
succeeded. Optional capabilities should be represented in types and
validated at runtime.

### Initial integrations

#### Riot Games --- first integration

-   Detect Riot Client installation.
-   Launch the official client.
-   Store credentials securely.
-   Support user-assisted login and MFA.
-   Investigate supported session persistence.
-   Identify account and region where possible.
-   Test VALORANT and League of Legends.
-   Never modify Vanguard or bypass Riot authentication.

#### Steam --- second integration

-   Detect Steam installation.
-   Support multiple registered accounts.
-   Use supported Steam account-switching and launch mechanisms.
-   Respect Steam Guard.
-   Do not depend on private authentication endpoints.

#### Epic Games --- later integration

-   Detect Epic Games Launcher.
-   Launch the official client.
-   Store account metadata.
-   Support official authentication and user-assisted switching.

#### Discord --- later integration

-   Support multiple isolated browser sessions/profiles where practical.
-   Use normal Discord authentication.
-   Do not manipulate private application tokens.

#### Ubisoft Connect --- future integration

-   Detect and launch the official client.
-   Manage account metadata.
-   Support user-assisted authentication.

### Capability compatibility

  Integration    Credential storage   Session switching              Launch
  -------------- -------------------- ------------------------------ --------
  Riot           Yes                  Investigate supported method   Yes
  Steam          Yes                  Supported mechanisms only      Yes
  Epic           Yes                  Investigate supported method   Yes
  Discord Web    Yes                  Isolated browser profiles      Yes
  Ubisoft        Yes                  Investigate supported method   Yes
  Generic apps   Optional             Manual/profile-dependent       Yes

These are planned capabilities, not claims that every integration
already supports them. A generic application launcher should work
whenever its executable is accessible; authentication switching is an
additional, integration-specific capability.

## 6. Database design

Use SQLite with Drizzle ORM.

### Entity relationships

``` mermaid
erDiagram
    APPLICATIONS ||--o{ ACCOUNTS : contains
    ACCOUNTS ||--o{ ACCOUNT_SECRETS : references
    ACCOUNTS ||--o| ACCOUNT_SETTINGS : has
    APPLICATIONS ||--o{ LAUNCH_HISTORY : records
    ACCOUNTS ||--o{ LAUNCH_HISTORY : used_by
    APPLICATIONS ||--o{ INTEGRATIONS : supports

    APPLICATIONS {
        text id PK
        text name
        text adapter_id
        text executable_path
        text install_path
        text icon_path
        datetime created_at
    }

    ACCOUNTS {
        text id PK
        text application_id FK
        text display_name
        text username
        text external_id
        text region
        text auth_method
        datetime last_used_at
    }

    ACCOUNT_SECRETS {
        text id PK
        text account_id FK
        text secret_type
        text credential_ref
        datetime created_at
    }

    ACCOUNT_SETTINGS {
        text account_id PK
        integer is_favorite
        integer is_default
        text launch_arguments
    }

    LAUNCH_HISTORY {
        text id PK
        text account_id FK
        text application_id FK
        text status
        datetime launched_at
    }

    INTEGRATIONS {
        text id PK
        text application_id FK
        text adapter_id
        text version
        text capabilities_json
    }
```

### Database rules

1.  Use UUIDs for internal identifiers.
2.  Add indexes on application IDs and account IDs.
3.  Enforce foreign keys and cascading deletion for dependent metadata.
4.  Never store plaintext credentials.
5.  Store credential references, not secret values.
6.  Keep authentication status separate from account metadata.
7.  Never store raw session tokens in activity history.
8.  Use migrations for every schema change.
9.  Version the schema for future upgrades.
10. Back up metadata and secret references consistently.

Example account metadata:

``` json
{
  "id": "account-uuid",
  "applicationId": "riot-games",
  "displayName": "Main Account",
  "username": "example@email.com",
  "externalId": null,
  "region": "EUW",
  "authMethod": "hybrid",
  "isFavorite": true,
  "isDefault": true
}
```

Secret references should be managed in the separate secrets table and
must not expose secret values to the UI.

## 7. Electron IPC architecture

The renderer must never have unrestricted access to the computer. It
requests operations through an explicit API exposed by the preload
script.

### Example API

``` typescript
interface AccountHubAPI {
  applications: {
    list(): Promise<Application[]>;
    detect(): Promise<Application[]>;
    register(input: RegisterApplicationInput): Promise<void>;
    remove(id: string): Promise<void>;
  };

  accounts: {
    list(applicationId: string): Promise<Account[]>;
    create(input: CreateAccountInput): Promise<Account>;
    update(id: string, input: UpdateAccountInput): Promise<void>;
    delete(id: string): Promise<void>;
  };

  authentication: {
    authenticate(
      accountId: string,
      method: AuthMethod
    ): Promise<AuthResult>;

    getStatus(accountId: string): Promise<AuthStatus>;
    saveSession(accountId: string): Promise<void>;
  };

  launcher: {
    launch(accountId: string): Promise<LaunchResult>;
    stop(applicationId: string): Promise<void>;
    getStatus(applicationId: string): Promise<ProcessStatus>;
  };

  settings: {
    get(): Promise<AppSettings>;
    update(input: UpdateSettingsInput): Promise<void>;
  };
}
```

### IPC security requirements

-   Validate every request with Zod.
-   Use explicit channel allowlists.
-   Never expose `ipcRenderer` directly.
-   Never expose arbitrary shell commands.
-   Validate executable paths and launch arguments.
-   Do not allow integrations to execute arbitrary scripts.
-   Restrict access to the intended renderer window.
-   Keep secrets inside the main process.
-   Require confirmation for destructive actions.

## 8. UI/UX implementation plan

Use a dark-first interface with a professional gaming aesthetic. Avoid
making AccountHub look like a generic password manager.

### Screen 1 --- Dashboard

Components:

-   Sidebar navigation.
-   Search bar.
-   Favorite applications.
-   Recently used accounts.
-   Installed applications.
-   Account counts.
-   Quick launch.
-   Recent activity.

Sidebar navigation:

-   Dashboard
-   Applications
-   Accounts
-   Activity
-   Integrations
-   Security
-   Settings

### Screen 2 --- Application details

Display:

-   Application logo and name.
-   Installation status.
-   Integration compatibility.
-   Number of accounts.
-   Add account button.
-   Account list.
-   Default account.
-   Launch application button.

### Screen 3 --- Add account

Steps:

1.  Select application.
2.  Choose authentication method.
3.  Enter account details if applicable.
4.  Authenticate through the official flow.
5.  Complete MFA if necessary.
6.  Save account metadata and protected secret references.
7.  Verify and display authentication status.

For session-only authentication, the user first signs in through the
official application, then uses a supported session-save flow if
available.

### Screen 4 --- Account details

Display:

-   Account name.
-   Username.
-   Region.
-   Authentication method.
-   Authentication status.
-   Last-used date.
-   Default/favorite controls.
-   Edit account.
-   Remove account.
-   Launch account.

### Screen 5 --- Security center

Display:

-   Windows secure-storage status.
-   Application lock status.
-   Inactivity timeout.
-   Encrypted backup status.
-   Credential management.
-   Session management.
-   Security activity.

### Screen 6 --- Integrations

Display:

-   Available integrations.
-   Installed integrations.
-   Supported capabilities.
-   Integration versions.
-   Installation detection.
-   Update availability.
-   Enable/disable controls.

## 9. Account switching state machine

``` mermaid
flowchart TD
    A["User selects account"] --> B["Validate account"]
    B --> C{"Application running?"}
    C -->|Yes| D["Check switching restrictions"]
    C -->|No| E["Check authentication"]
    D --> F{"Safe to switch?"}
    F -->|No| G["Ask user to close application"]
    G --> E
    F -->|Yes| E
    E --> H{"Valid supported session?"}
    H -->|Yes| I["Restore session"]
    H -->|No| J{"Credentials available?"}
    J -->|Yes| K["Start official login flow"]
    J -->|No| L["Request manual login"]
    K --> M["Handle MFA / CAPTCHA"]
    L --> M
    M --> N["Verify authentication"]
    I --> N
    N --> O{"Authenticated?"}
    O -->|No| P["Show failure and recovery"]
    O -->|Yes| Q["Launch application"]
    Q --> R["Verify process started"]
    R --> S["Record launch result"]
```

### Error handling

Return structured errors for:

-   Application not installed.
-   Executable not found.
-   Application already running.
-   Session unavailable.
-   Session expired.
-   Credentials missing.
-   Login requires MFA.
-   Authentication failed.
-   Launch permission denied.
-   Launch timeout.
-   Integration unsupported.

Never retry authentication indefinitely.

## 10. Security and privacy specification

### Credential security

-   Store passwords through Windows Credential Manager using a native
    secure-storage adapter.
-   Never persist passwords in plaintext.
-   Never put credentials in persistent React state.
-   Retrieve secrets only when required.
-   Keep secrets out of logs, crash reports, and telemetry.

### Session security

-   Persist sessions only when the integration supports a safe
    mechanism.
-   Encrypt session data with a per-installation protection key.
-   Protect the key using DPAPI.
-   Bind session records to their application and account.
-   Avoid sharing raw session data between integrations.
-   Validate and expire sessions appropriately.
-   Never extract credentials or authentication data from protected
    application processes.

### Electron security

-   `contextIsolation: true`
-   `nodeIntegration: false`
-   `sandbox: true` where compatible
-   Strict Content Security Policy
-   No remote code execution
-   No arbitrary remote plugin loading
-   Signed application updates
-   Secure IPC validation

### Master password

Make this optional for V1.1 rather than a blocker for the first MVP. A
master password should unlock AccountHub's own protected data, not
replace Windows-level secret protection.

## 11. Implementation roadmap

Suggested estimates for one developer working full-time:

  -------------------------------------------------------------------------
  Milestone             Scope                                      Estimate
  --------------------- ---------------------- ----------------------------
  M1 --- Foundation     Electron, React, pnpm,                    3--4 days
                        IPC, database, app     
                        shell                  

  M2 --- Account        Application                               4--5 days
  management            registration,          
                        detection, account     
                        CRUD, favorites        

  M3 --- Security       Credential Manager,                       4--6 days
                        DPAPI, secret          
                        references, IPC        
                        hardening              

  M4 --- Launcher       Executable detection,                     3--4 days
                        launch, process        
                        monitoring, error      
                        handling               

  M5 --- Authentication Auth contracts,                           5--7 days
  engine                credentials, session   
                        abstraction, MFA       
                        handoff                

  M6 --- Riot           Riot adapter, official                   5--10 days
  integration           launch/login,          
                        feasibility testing    

  M7 --- Product polish Dashboard, security                       4--5 days
                        center, activity,      
                        settings, backups      

  M8 --- QA and release Unit/integration/E2E                      4--6 days
                        tests, installer,      
                        upgrade testing        
  -------------------------------------------------------------------------

**Estimated total: 32--47 working days.**

This is an engineering estimate, not a guaranteed deadline. Riot session
support and authentication restrictions may change the timeline.

### Milestone details

#### M1 --- Project foundation

-   Set up Electron, React, and TypeScript.
-   Configure pnpm workspace.
-   Configure ESLint and Prettier.
-   Build application shell and navigation.
-   Configure secure preload and IPC.
-   Create SQLite database and migrations.

**Deliverable:** Running desktop application with navigation and
persistence.

#### M2 --- Application and account management

-   Application registration.
-   Installed application detection.
-   Account CRUD.
-   Account categories and favorites.
-   Search and filtering.
-   Account details pages.

**Deliverable:** Manage multiple accounts without authentication
integrations.

#### M3 --- Security infrastructure

-   Windows Credential Manager.
-   DPAPI.
-   Secret references.
-   Secure deletion.
-   IPC hardening.
-   Security testing.

**Deliverable:** Secure local credential management.

#### M4 --- Universal launcher

-   Executable detection.
-   Application launch.
-   Process monitoring.
-   Launch arguments.
-   Error handling.
-   Generic application adapter.

**Deliverable:** Launch installed applications from AccountHub.

#### M5 --- Authentication engine

-   Authentication contracts.
-   Credential-based login workflows.
-   Session storage abstraction.
-   Session status handling.
-   MFA/CAPTCHA handoff.
-   Switching state machine.

**Deliverable:** Reusable authentication engine.

#### M6 --- Riot integration

-   Detect Riot Client installation.
-   Implement Riot adapter.
-   Launch official client.
-   Register Riot accounts.
-   Support credential-based and user-assisted login.
-   Investigate supported session switching.
-   Test VALORANT and League of Legends.

**Deliverable:** Working Riot integration with clearly documented
session capabilities.

#### M7 --- Product polish

-   Dashboard.
-   Security center.
-   Activity history.
-   System tray.
-   Settings.
-   Backup and restore.
-   Loading, empty, and error states.

**Deliverable:** Complete desktop experience.

#### M8 --- QA and release

-   Unit and integration tests.
-   End-to-end testing.
-   Windows installer.
-   Application signing.
-   Upgrade testing.
-   Release documentation.

**Deliverable:** Installable Windows release.

## 12. Testing strategy

Testing must happen continuously, not only at the end.

### Unit tests

Test:

-   Account creation and editing.
-   Application registration.
-   Credential storage and retrieval.
-   Encryption and decryption.
-   Authentication state transitions.
-   Adapter registration.
-   Launch argument validation.
-   Account deletion and secret cleanup.

### Integration tests

Test:

-   SQLite persistence.
-   Windows Credential Manager integration.
-   DPAPI encryption.
-   Application detection.
-   Process launch and monitoring.
-   IPC validation.
-   Session lifecycle.
-   Adapter error handling.

### End-to-end tests

  Scenario                 Expected result
  ------------------------ -----------------------------------
  Add Riot application     Riot detected
  Add first account        Account saved
  Add second account       Both accounts displayed
  Save credentials         Protected storage used
  Launch application       Official client opens
  Select another account   Correct switching flow initiated
  Session expires          User prompted to authenticate
  Application missing      Helpful error displayed
  Delete account           Associated secrets removed
  Restart AccountHub       Accounts remain available
  Corrupt database         Recovery procedure shown
  Cancel MFA               Authentication remains incomplete

### Security tests

-   Inspect database for accidental secrets.
-   Inspect logs for passwords and tokens.
-   Attempt unauthorized IPC calls.
-   Attempt path traversal through launch operations.
-   Test malformed adapter responses.
-   Test encrypted backup recovery.
-   Test behavior after forced application termination.

### Release acceptance criteria

AccountHub V1 is not complete until:

-   All account CRUD operations work.
-   Multiple accounts can be registered per application.
-   Sensitive information is never stored in plaintext.
-   Application launching works reliably.
-   Authentication state is accurately represented.
-   Unsupported switching capabilities are clearly communicated.
-   Riot's supported login workflow has been tested.
-   Session switching is only advertised if it has passed testing.
-   Database migration and backup recovery work.
-   Windows installer and uninstall process work.

## 13. Future features --- V2 and beyond

  Feature                   Description
  ------------------------- ------------------------------------------------
  Cloud sync                Sync encrypted account metadata across devices
  Cross-device backup       Secure encrypted backups
  macOS support             Expand beyond Windows
  Linux support             Expand beyond Windows
  Integration marketplace   Discover and install integrations
  Browser profiles          Manage multiple web identities
  Quick switch shortcut     Global keyboard shortcut
  Gaming statistics         Display supported game account information
  Multiple profiles         Separate personal and work environments
  Import/export             Transfer account metadata securely
  Auto-lock                 Lock AccountHub when idle
  Portable mode             Optional portable installation

Prioritize global account search and a quick-switch keyboard shortcut
after V1.

## 14. Explicit non-goals and safety boundaries

AccountHub will not:

-   Bypass MFA.
-   Bypass CAPTCHA.
-   Steal or extract authentication tokens.
-   Modify Riot Vanguard.
-   Inject into game processes.
-   Depend on private authentication endpoints.
-   Store plaintext passwords.
-   Claim unsupported integrations work.
-   Switch accounts in a way that risks terminating a running game.
-   Transmit credentials to a cloud service.

These are product requirements, not optional suggestions.

## 15. Proposed repository structure

``` text
accounthub/
│
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts
│       │   │   ├── ipc/
│       │   │   ├── services/
│       │   │   ├── security/
│       │   │   └── lifecycle/
│       │   ├── preload/
│       │   │   ├── index.ts
│       │   │   └── api.ts
│       │   └── renderer/
│       │       ├── components/
│       │       ├── features/
│       │       │   ├── dashboard/
│       │       │   ├── applications/
│       │       │   ├── accounts/
│       │       │   ├── authentication/
│       │       │   ├── activity/
│       │       │   ├── integrations/
│       │       │   └── settings/
│       │       ├── hooks/
│       │       ├── stores/
│       │       ├── layouts/
│       │       └── App.tsx
│       └── package.json
│
├── packages/
│   ├── core/
│   │   ├── accounts/
│   │   ├── applications/
│   │   ├── authentication/
│   │   ├── launcher/
│   │   └── integration-registry/
│   ├── integrations/
│   │   ├── riot/
│   │   ├── steam/
│   │   ├── epic/
│   │   ├── discord/
│   │   └── generic/
│   ├── database/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── repositories/
│   ├── security/
│   │   ├── credential-vault/
│   │   ├── encryption/
│   │   └── validation/
│   └── shared/
│       ├── types/
│       ├── schemas/
│       ├── constants/
│       └── errors/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── e2e/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── integrations.md
│   ├── database.md
│   └── development-roadmap.md
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 16. Final implementation decisions

  Decision              Choice
  --------------------- ---------------------------------
  Product name          AccountHub
  Initial platform      Windows 10/11 x64
  Framework             Electron
  Frontend              React + TypeScript
  UI styling            Tailwind CSS + shadcn/ui
  State management      Zustand
  Database              SQLite + Drizzle
  Credential security   Windows Credential Manager
  Session security      DPAPI
  Architecture          Modular monorepo
  Integration system    Adapter-based
  Initial integration   Riot Games
  Authentication        Credentials + sessions + hybrid
  Cloud dependency      None for V1
  Distribution          Windows installer

## 17. Recommended coding order

Implement one milestone at a time. Do not ask an AI coding agent to
build the entire application in one prompt.

1.  Initialize pnpm monorepo and Electron application.
2.  Build the desktop layout and navigation.
3.  Implement SQLite schema and migrations.
4.  Implement application registration and detection.
5.  Implement account CRUD and account selection.
6.  Implement Windows Credential Manager integration.
7.  Implement DPAPI-based session protection.
8.  Implement secure IPC contracts.
9.  Implement generic application launcher.
10. Implement authentication state machine.
11. Build the Riot Games adapter.
12. Test Riot login, MFA, and supported session behavior.
13. Implement activity history and settings.
14. Implement backup and recovery.
15. Complete security and end-to-end testing.
16. Build Windows installer and release.

## 18. Final recommendation

Build AccountHub as a universal application with integration-specific
authentication capabilities, not as a Riot account switcher that you
later try to turn into something universal.

The separation is fundamental:

-   The core manages applications and accounts.
-   The security layer protects credentials and sessions.
-   The authentication engine coordinates login and switching.
-   Each integration determines how authentication actually works.
-   The launcher handles opening and monitoring applications.

**First milestone:** Build a working desktop application where users can
add Riot Games, register multiple accounts, securely save credentials,
and launch the official Riot Client. Then implement and verify session
switching as a separate capability.

This creates a useful product even if Riot's session mechanism proves
more restrictive than expected.
