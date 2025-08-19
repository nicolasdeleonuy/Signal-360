// Edge Function for decrypting Google API keys
// Provides secure AES-256 decryption for encrypted API keys from database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  validateDecryptionRequest,
  authenticateUser,
  createAuthErrorResponse,
  AppError,
  ERROR_CODES,
  getConfig
} from '../_shared/index.ts';

/**
 * Decryption service using Web Crypto API
 */
class DecryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Generate decryption key from string
   * @param keyString String to derive key from
   * @returns Promise<CryptoKey> Decryption key
   */
  private static async generateKey(keyString: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString);
    
    // Hash the key string to get consistent 256-bit key
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    
    return await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );
  }

  /**
   * Decrypt API key using AES-256-GCM
   * @param encryptedData Base64 encoded encrypted data
   * @param encryptionKey Encryption key string
   * @returns Promise<string> Decrypted API key
   */
  static async decrypt(encryptedData: string, encryptionKey: string): Promise<string> {
    try {
      // Decode base64 data
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encryptedBuffer = combined.slice(this.IV_LENGTH);
      
      // Generate decryption key
      const key = await this.generateKey(encryptionKey);
      
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encryptedBuffer
      );
      
      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
      
    } catch (error) {
      throw new AppError(
        ERROR_CODES.DECRYPTION_ERROR,
        'Failed to decrypt API key',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate encrypted data format
   * @param encryptedData Base64 encoded data to validate
   * @returns boolean True if format appears valid
   */
  static validateEncryptedDataFormat(encryptedData: string): boolean {
    try {
      // Check if it's valid base64
      const decoded = atob(encryptedData);
      
      // Check minimum length (IV + some encrypted data)
      return decoded.length > this.IV_LENGTH;
    } catch {
      return false;
    }
  }
}

/**
 * Main request handler for API key decryption
 */
const handleDecryptRequest = async (request: Request, requestId: string): Promise<Response> => {
  try {
    // Authenticate user first (decryption requires authentication)
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult, requestId);
    }

    // Parse and validate request body
    const body = await parseJsonBody(request);
    const validation = validateDecryptionRequest(body);
    
    if (!validation.isValid) {
      throw new AppError(
        ERROR_CODES.INVALID_REQUEST,
        `Validation failed: ${validation.error}`
      );
    }

    const { encrypted_key } = validation.sanitizedData;

    // Validate encrypted data format
    if (!DecryptionService.validateEncryptedDataFormat(encrypted_key)) {
      throw new AppError(
        ERROR_CODES.INVALID_PARAMETER,
        'Invalid encrypted key format'
      );
    }

    // Get encryption key from configuration
    const config = getConfig();
    const encryptionKey = config.security.encryptionKey;

    // Decrypt the API key
    const decryptedKey = await DecryptionService.decrypt(encrypted_key, encryptionKey);

    // Validate decrypted key format (should be Google API key)
    if (!/^AIza[0-9A-Za-z-_]{35}$/.test(decryptedKey)) {
      throw new AppError(
        ERROR_CODES.DECRYPTION_ERROR,
        'Decrypted key does not match expected format'
      );
    }

    // Log successful decryption (without sensitive data)
    console.log(`API key decrypted successfully for user ${authResult.user!.user_id} (request ${requestId})`);

    return createSuccessHttpResponse(
      {
        api_key: decryptedKey,
        algorithm: 'AES-256-GCM',
        user_id: authResult.user!.user_id
      },
      requestId
    );

  } catch (error) {
    console.error(`Decryption failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleDecryptRequest, ['POST']);

serve(handler);