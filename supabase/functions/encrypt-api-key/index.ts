// Edge Function for encrypting Google API keys
// Provides secure AES-256 encryption for user API keys before database storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  validateEncryptionRequest,
  AppError,
  ERROR_CODES,
  getConfig
} from '../_shared/index.ts';

/**
 * Encryption service using Web Crypto API
 */
class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Generate encryption key from string
   * @param keyString String to derive key from
   * @returns Promise<CryptoKey> Encryption key
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
      ['encrypt']
    );
  }

  /**
   * Encrypt API key using AES-256-GCM
   * @param apiKey Plain text API key
   * @param encryptionKey Encryption key string
   * @returns Promise<string> Base64 encoded encrypted data
   */
  static async encrypt(apiKey: string, encryptionKey: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Generate encryption key
      const key = await this.generateKey(encryptionKey);
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
      
    } catch (error) {
      throw new AppError(
        ERROR_CODES.ENCRYPTION_ERROR,
        'Failed to encrypt API key',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate encryption key strength
   * @param encryptionKey Key to validate
   * @returns boolean True if key is strong enough
   */
  static validateKeyStrength(encryptionKey: string): boolean {
    return encryptionKey.length >= 32; // Minimum 32 characters
  }
}

/**
 * Main request handler for API key encryption
 */
const handleEncryptRequest = async (request: Request, requestId: string): Promise<Response> => {
  try {
    // Parse and validate request body
    const body = await parseJsonBody(request);
    const validation = validateEncryptionRequest(body);
    
    if (!validation.isValid) {
      throw new AppError(
        ERROR_CODES.INVALID_REQUEST,
        `Validation failed: ${validation.error}`
      );
    }

    const { api_key } = validation.sanitizedData;

    // Get encryption key from configuration
    const config = getConfig();
    const encryptionKey = config.security.encryptionKey;

    // Validate encryption key strength
    if (!EncryptionService.validateKeyStrength(encryptionKey)) {
      throw new AppError(
        ERROR_CODES.ENCRYPTION_ERROR,
        'Encryption key is not strong enough'
      );
    }

    // Encrypt the API key
    const encryptedKey = await EncryptionService.encrypt(api_key, encryptionKey);

    // Log successful encryption (without sensitive data)
    console.log(`API key encrypted successfully for request ${requestId}`);

    return createSuccessHttpResponse(
      {
        encrypted_key: encryptedKey,
        algorithm: 'AES-256-GCM',
        key_length: 256
      },
      requestId
    );

  } catch (error) {
    console.error(`Encryption failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleEncryptRequest, ['POST']);

serve(handler);