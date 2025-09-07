// Encryption utilities for Supabase Edge Functions
// Provides client-side helpers for API key encryption/decryption

import { supabase } from '../supabaseClient';

/**
 * Client-side encryption service for API keys
 * Interfaces with Supabase Edge Functions for secure encryption/decryption
 */
export class EncryptionService {
  /**
   * Encrypt an API key using Supabase Edge Function
   * @param apiKey Plain text API key to encrypt
   * @returns Promise<string> Encrypted API key
   * @throws Error if encryption fails
   */
  static async encryptApiKey(apiKey: string): Promise<string> {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }

    try {
      const { data, error } = await supabase.functions.invoke('encrypt-api-key', {
        body: { api_key: apiKey }
      });

      if (error) {
        throw new Error(`Encryption service error: ${error.message}`);
      }

      if (!data?.encrypted_key) {
        throw new Error('Encryption failed: No encrypted key returned from service');
      }

      return data.encrypted_key;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to encrypt API key: ${error.message}`);
      }
      throw new Error('Failed to encrypt API key: Unknown error');
    }
  }

  /**
   * Decrypt an API key using Supabase Edge Function
   * @param encryptedKey Encrypted API key to decrypt
   * @returns Promise<string> Decrypted API key
   * @throws Error if decryption fails
   */
  static async decryptApiKey(encryptedKey: string): Promise<string> {
    if (!encryptedKey || typeof encryptedKey !== 'string') {
      throw new Error('Encrypted key must be a non-empty string');
    }

    try {
      const { data, error } = await supabase.functions.invoke('decrypt-api-key', {
        body: { encrypted_key: encryptedKey }
      });

      if (error) {
        throw new Error(`Decryption service error: ${error.message}`);
      }

      if (!data?.api_key) {
        throw new Error('Decryption failed: No API key returned from service');
      }

      return data.api_key;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to decrypt API key: ${error.message}`);
      }
      throw new Error('Failed to decrypt API key: Unknown error');
    }
  }

  /**
   * Test if encryption service is available
   * @returns Promise<boolean> True if service is available
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      await supabase.functions.invoke('encrypt-api-key', {
        body: { api_key: 'test' }
      });

      // If we get a response (even an error), the service is available
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate API key format before encryption
   * @param apiKey API key to validate
   * @returns boolean True if format is valid
   */
  static validateApiKeyFormat(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Basic validation for Google API key format
    // Google API keys are typically 39 characters long and start with 'AIza'
    const googleApiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
    
    return googleApiKeyPattern.test(apiKey);
  }

  /**
   * Sanitize API key input
   * @param apiKey Raw API key input
   * @returns string Sanitized API key
   */
  static sanitizeApiKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== 'string') {
      return '';
    }

    // Remove whitespace and common prefixes
    return apiKey
      .trim()
      .replace(/^(api[_-]?key[:\s]*)/i, '')
      .replace(/^(google[_-]?api[_-]?key[:\s]*)/i, '');
  }
}

/**
 * Development fallback encryption for testing
 * WARNING: This is NOT secure and should only be used in development
 */
export class DevEncryptionFallback {
  private static readonly SECRET_KEY = 'dev-secret-key-not-for-production';

  /**
   * Simple base64 encoding for development
   * @param apiKey Plain text API key
   * @returns string Base64 encoded key
   */
  static encryptApiKey(apiKey: string): string {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Simple XOR with secret key for development
    const encrypted = this.xorEncrypt(apiKey, this.SECRET_KEY);
    return Buffer.from(encrypted).toString('base64');
  }

  /**
   * Simple base64 decoding for development
   * @param encryptedKey Base64 encoded key
   * @returns string Decrypted API key
   */
  static decryptApiKey(encryptedKey: string): string {
    if (!encryptedKey) {
      throw new Error('Encrypted key is required');
    }

    try {
      const encrypted = Buffer.from(encryptedKey, 'base64').toString();
      return this.xorEncrypt(encrypted, this.SECRET_KEY);
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Simple XOR encryption for development
   * @param text Text to encrypt/decrypt
   * @param key Secret key
   * @returns string Encrypted/decrypted text
   * @private
   */
  private static xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  }
}

/**
 * Environment-aware encryption service
 * Uses Edge Functions in production, fallback in development
 */
export class AdaptiveEncryptionService {
  /**
   * Encrypt API key using appropriate method for environment
   * @param apiKey Plain text API key
   * @returns Promise<string> Encrypted API key
   */
  static async encryptApiKey(apiKey: string): Promise<string> {
    // In production, always use Edge Functions
    if (process.env.NODE_ENV === 'production') {
      return EncryptionService.encryptApiKey(apiKey);
    }

    // In development, try Edge Functions first, fallback to dev encryption
    try {
      const isAvailable = await EncryptionService.isServiceAvailable();
      if (isAvailable) {
        return EncryptionService.encryptApiKey(apiKey);
      }
    } catch (error) {
      console.warn('Edge Function encryption not available, using development fallback');
    }

    return DevEncryptionFallback.encryptApiKey(apiKey);
  }

  /**
   * Decrypt API key using appropriate method for environment
   * @param encryptedKey Encrypted API key
   * @returns Promise<string> Decrypted API key
   */
  static async decryptApiKey(encryptedKey: string): Promise<string> {
    // In production, always use Edge Functions
    if (process.env.NODE_ENV === 'production') {
      return EncryptionService.decryptApiKey(encryptedKey);
    }

    // In development, try Edge Functions first, fallback to dev decryption
    try {
      const isAvailable = await EncryptionService.isServiceAvailable();
      if (isAvailable) {
        return EncryptionService.decryptApiKey(encryptedKey);
      }
    } catch (error) {
      console.warn('Edge Function decryption not available, using development fallback');
    }

    return DevEncryptionFallback.decryptApiKey(encryptedKey);
  }
}