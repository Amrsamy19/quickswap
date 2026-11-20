import { NativeBridge } from '../native/native-bridge';
import { AppError } from '@quickswap/shared';

export class DpapiVault {
  /**
   * Protects a plaintext string using Windows DPAPI (CurrentUser scope).
   * Returns a Base64-encoded encrypted blob.
   */
  public static async protect(plainText: string): Promise<string> {
    if (plainText === '') return '';
    if (!plainText) {
      throw new AppError('INVALID_INPUT', 'Cannot protect null or undefined text');
    }

    const res = await NativeBridge.execute('dpapi-protect', [], plainText);
    if (!res.success || !res.data) {
      throw new AppError('DPAPI_ENCRYPTION_FAILED', 'Failed to protect data with DPAPI');
    }
    return res.data;
  }

  /**
   * Unprotects a Base64-encoded DPAPI blob back to its original plaintext string.
   */
  public static async unprotect(base64CipherText: string): Promise<string> {
    if (base64CipherText === '') return '';
    if (!base64CipherText) {
      throw new AppError('INVALID_INPUT', 'Cannot unprotect empty ciphertext');
    }

    const res = await NativeBridge.execute('dpapi-unprotect', [], base64CipherText);
    if (!res.success) {
      throw new AppError('DPAPI_ENCRYPTION_FAILED', 'Failed to unprotect DPAPI data');
    }
    return res.data;
  }
}
