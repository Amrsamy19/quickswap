# Quickswap

Universal desktop account manager for Windows (x64) built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, and **SQLite**.

## Architecture & Security Model

Quickswap is designed around strict **local-first** and **security-first** principles:
- **Zero Plaintext Secrets:** Passwords and session tokens are never stored in SQLite or application configuration files.
- **Windows Credential Manager:** Passwords are stored natively in the Windows Credential Vault (`advapi32.dll`).
- **Windows DPAPI:** Sensitive session tokens and encryption keys are protected using Windows Data Protection API bound to the `CurrentUser` scope.
- **Opaque Secret References:** SQLite only stores pointer identifiers (e.g. `Quickswap/acc-uuid/password`).
- **Cascading Purge:** Deleting an account immediately wipes its physical credentials from Windows Credential Manager and DPAPI.
- **Context Isolation & Hardened IPC:** Electron renderer has zero direct access to Node.js, file system, or Windows APIs; it communicates through a typed and validated preload bridge (`window.quickswapAPI`).

### Threat Model & Trust Boundaries

| Threat Actor / Scenario | Impact | Mitigation Status |
| :--- | :--- | :--- |
| **Offline Disk Theft** | Attacker accesses hard drive without user Windows login | **Mitigated:** DPAPI and Windows Credential Manager are cryptographically tied to the user's Windows master key. SQLite contains zero plaintext passwords or tokens. |
| **Network Eavesdropping** | Attacker snoops local/Wi-Fi network traffic | **Mitigated:** Quickswap is 100% offline with zero cloud telemetry or external backend connections. |
| **Accidental Clipboard Theft** | Malicious background process inspects clipboard | **Mitigated:** Passwords copied to the clipboard are automatically purged after 30 seconds, checking that the clipboard content still matches before clearing. |
| **Same-User Process Inspection** | Malicious app running under the same Windows account | **Hardened in v2.0:** All secret payloads are transmitted via pipe (`stdin`), eliminating exposure to process listing arguments (`tasklist` / Process Explorer). |
| **Kernel / OS Compromise** | Attacker with Ring 0 or kernel driver access | **Out of Scope:** Fundamental OS kernel compromise cannot be mitigated by user-space desktop applications. |

## Monorepo Packages

```text
├── apps/
│   └── desktop/          # Electron shell & React Tailwind desktop UI
├── packages/
│   ├── shared/           # Zod schemas, TypeScript types, IPC contracts, errors (@quickswap/shared)
│   ├── database/         # SQLite schema, migrations, repositories (@quickswap/database)
│   ├── security/         # Windows Credential Manager & DPAPI native bridge, sanitizers (@quickswap/security)
│   └── core/             # Application detector, Account & Activity services (@quickswap/core)
└── tests/                # Automated Vitest test suite
```

## Available Scripts

- `pnpm install`: Install workspace dependencies
- `pnpm build`: Build all packages and desktop application
- `pnpm test`: Run automated test suite (Vitest)
- `pnpm dev`: Start Vite renderer in development mode
- `pnpm start`: Launch Electron desktop application
