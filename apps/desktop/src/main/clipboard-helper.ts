import { clipboard } from 'electron';

let wipeTimeout: NodeJS.Timeout | null = null;
let lastSecret: string | null = null;

/**
 * Copies a sensitive secret to the system clipboard and schedules an automatic wipe
 * after durationMs (default: 30,000 ms / 30 seconds) to prevent credential leaks.
 */
export function copySecretWithAutoWipe(text: string, durationMs: number = 30000): void {
  if (wipeTimeout) {
    clearTimeout(wipeTimeout);
  }

  lastSecret = text;
  clipboard.writeText(text);

  wipeTimeout = setTimeout(() => {
    try {
      if (clipboard.readText() === lastSecret) {
        clipboard.clear();
      }
    } catch {
      // Ignore
    } finally {
      lastSecret = null;
      wipeTimeout = null;
    }
  }, durationMs);
}
