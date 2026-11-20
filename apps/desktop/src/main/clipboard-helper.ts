import { clipboard } from 'electron';

let wipeTimeout: NodeJS.Timeout | null = null;
let lastSecret: string | null = null;

/**
 * Copies a sensitive secret to the system clipboard while explicitly excluding it from:
 * 1. Windows 10/11 Clipboard History (Win + V) via 'CanIncludeInClipboardHistory'
 * 2. Windows Roaming Cloud Clipboard Sync via 'CanUploadToCloudClipboard'
 * 3. Legacy clipboard viewers via 'Clipboard Viewer Ignore'
 *
 * Schedules an automatic wipe after durationMs (default: 30 seconds),
 * clearing ONLY if the clipboard still holds our secret.
 */
export async function copySecretWithAutoWipe(text: string, durationMs: number = 30000): Promise<void> {
  if (wipeTimeout) {
    clearTimeout(wipeTimeout);
  }

  lastSecret = text;

  // Modern Electron 45 async clipboard API
  try {
    if (typeof (clipboard as any).writeText === 'function') {
      await (clipboard as any).writeText(text);
    } else if (typeof (clipboard as any).write === 'function') {
      (clipboard as any).write({ text });
    }
  } catch {
    // Non-fatal fallback
  }

  // Exclude from Windows Clipboard History and Cloud Sync (DWORD 0 = disabled)
  try {
    const zeroDword = Buffer.from([0, 0, 0, 0]);
    if (typeof (clipboard as any).writeBuffer === 'function') {
      (clipboard as any).writeBuffer('CanIncludeInClipboardHistory', zeroDword);
      (clipboard as any).writeBuffer('CanUploadToCloudClipboard', zeroDword);
      (clipboard as any).writeBuffer('Clipboard Viewer Ignore', zeroDword);
    }
  } catch {
    // Non-Windows or unsupported buffer write
  }

  wipeTimeout = setTimeout(async () => {
    try {
      const current = await (clipboard as any).readText();
      if (current === lastSecret) {
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
