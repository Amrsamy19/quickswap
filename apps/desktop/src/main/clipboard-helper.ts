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
export function copySecretWithAutoWipe(text: string, durationMs: number = 30000): void {
  if (wipeTimeout) {
    clearTimeout(wipeTimeout);
  }

  lastSecret = text;

  // Write text
  clipboard.write({
    text,
  });

  // Exclude from Windows Clipboard History and Cloud Sync (DWORD 0 = disabled)
  try {
    const zeroDword = Buffer.from([0, 0, 0, 0]);
    clipboard.writeBuffer('CanIncludeInClipboardHistory', zeroDword);
    clipboard.writeBuffer('CanUploadToCloudClipboard', zeroDword);
    clipboard.writeBuffer('Clipboard Viewer Ignore', zeroDword);
  } catch {
    // Non-Windows or unsupported buffer write
  }

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
