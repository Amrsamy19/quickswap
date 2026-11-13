import { NativeBridge } from '../native/native-bridge';
import { CredentialVault } from '../credential-vault';

export interface AutoLoginResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class AutoLoginService {
  /**
   * Executes an automated login by waiting for the target window to appear,
   * bringing it to the foreground, auto-filling the username and password from Windows Credential Manager,
   * and submitting with Enter.
   */
  public static async executeAutoLogin(
    windowPattern: string,
    username: string,
    accountId: string,
    timeoutSeconds: number = 25
  ): Promise<AutoLoginResult> {
    const credTarget = CredentialVault.formatTarget(accountId, 'password');
    const res = await NativeBridge.execute('autologin-window', [
      windowPattern,
      username,
      credTarget,
      timeoutSeconds.toString(),
    ]);

    return {
      success: Boolean(res.success),
      message: res.message,
      error: res.error,
    };
  }

  /**
   * Triggers the automated login routine in the background without blocking launcher spawn.
   */
  public static triggerBackgroundAutoLogin(
    windowPattern: string,
    username: string,
    accountId: string,
    timeoutSeconds: number = 25
  ): void {
    this.executeAutoLogin(windowPattern, username, accountId, timeoutSeconds).catch((err) => {
      console.warn(`[AutoLogin] Background auto-login error: ${err.message}`);
    });
  }
}
