# AccountHub

Universal desktop account manager for Windows (x64) built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, and **SQLite**.

## Architecture & Security Model

AccountHub is designed around strict **local-first** and **security-first** principles:
- **Zero Plaintext Secrets:** Passwords and session tokens are never stored in SQLite or application configuration files.
- **Windows Credential Manager:** Passwords are stored natively in the Windows Credential Vault (`advapi32.dll`).
- **Windows DPAPI:** Sensitive session tokens and encryption keys are protected using Windows Data Protection API bound to the `CurrentUser` scope.
- **Opaque Secret References:** SQLite only stores pointer identifiers (e.g. `AccountHub/acc-uuid/password`).
- **Cascading Purge:** Deleting an account immediately wipes its physical credentials from Windows Credential Manager and DPAPI.
- **Context Isolation & Hardened IPC:** Electron renderer has zero direct access to Node.js, file system, or Windows APIs; it communicates through a typed and validated preload bridge (`window.accountHubAPI`).

## Monorepo Packages

```text
├── apps/
│   └── desktop/          # Electron shell & React Tailwind desktop UI
├── packages/
│   ├── shared/           # Zod schemas, TypeScript types, IPC contracts, errors
│   ├── database/         # SQLite schema, migrations, repositories
│   ├── security/         # Windows Credential Manager & DPAPI native bridge, sanitizers
│   └── core/             # Application detector, Account & Activity services
└── tests/                # Automated Vitest test suite
```

## Available Scripts

- `pnpm install`: Install workspace dependencies
- `pnpm build`: Build all packages and desktop application
- `pnpm test`: Run automated test suite (Vitest)
- `pnpm dev`: Start Vite renderer in development mode
- `pnpm start`: Launch Electron desktop application
