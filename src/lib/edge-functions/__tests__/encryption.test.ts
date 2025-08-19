// Unit tests for encryption services
// Tests encryption/decryption functionality and fallback mechanisms

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EncryptionService, 
  DevEncryptionFallback, 
  AdaptiveEncryptionService 
} from '../encryption';
import { supabase } from '../../supabase';

// Mock Supabase client
vi.mock('../../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('EncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('encryptApiKey', () => {
    it('should encrypt API key successfully', async () => {
      const apiKey = 'AIzaSyDummyApiKey123456789012345678901';
      const encryptedKey = 'encrypted_key_123';

      (supabase.functions.invoke as any).mockResolvedValue({
        data: { encrypted_key: encryptedKey },
        error: null,
      });

      const result = await EncryptionService.encryptApiKey(apiKey);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('encrypt-api-key', {
        body: { api_key: apiKey },
      });
      expect(result).toBe(encryptedKey);
    });

    it('should throw error for empty API key', async () => {
      await expect(EncryptionService.encryptApiKey('')).rejects.toThrow(
        'API key must be a non-empty string'
      );
    });

    it('should throw error for non-string API key', async () => {
      await expect(EncryptionService.encryptApiKey(null as any)).rejects.toThrow(
        'API key must be a non-empty string'
      );
    });

    it('should handle service errors', async () => {
      const apiKey = 'AIzaSyDummyApiKey123456789012345678901';

      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      });

      await expect(EncryptionService.encryptApiKey(apiKey)).rejects.toThrow(
        'Failed to encrypt API key: Encryption service error: Service unavailable'
      );
    });

    it('should handle missing encrypted key in response', async () => {
      const apiKey = 'AIzaSyDummyApiKey123456789012345678901';

      (supabase.functions.invoke as any).mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(EncryptionService.encryptApiKey(apiKey)).rejects.toThrow(
        'Failed to encrypt API key: Encryption failed: No encrypted key returned from service'
      );
    });
  });

  describe('decryptApiKey', () => {
    it('should decrypt API key successfully', async () => {
      const encryptedKey = 'encrypted_key_123';
      const apiKey = 'AIzaSyDummyApiKey123456789012345678901';

      (supabase.functions.invoke as any).mockResolvedValue({
        data: { api_key: apiKey },
        error: null,
      });

      const result = await EncryptionService.decryptApiKey(encryptedKey);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('decrypt-api-key', {
        body: { encrypted_key: encryptedKey },
      });
      expect(result).toBe(apiKey);
    });

    it('should throw error for empty encrypted key', async () => {
      await expect(EncryptionService.decryptApiKey('')).rejects.toThrow(
        'Encrypted key must be a non-empty string'
      );
    });

    it('should handle service errors', async () => {
      const encryptedKey = 'encrypted_key_123';

      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      });

      await expect(EncryptionService.decryptApiKey(encryptedKey)).rejects.toThrow(
        'Failed to decrypt API key: Decryption service error: Service unavailable'
      );
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when service is available', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { encrypted_key: 'test' },
        error: null,
      });

      const result = await EncryptionService.isServiceAvailable();

      expect(result).toBe(true);
    });

    it('should return false when service is unavailable', async () => {
      (supabase.functions.invoke as any).mockRejectedValue(new Error('Service unavailable'));

      const result = await EncryptionService.isServiceAvailable();

      expect(result).toBe(false);
    });
  });

  describe('validateApiKeyFormat', () => {
    it('should validate correct Google API key format', () => {
      const validKey = 'AIzaSyDummyApiKey123456789012345678901';
      expect(EncryptionService.validateApiKeyFormat(validKey)).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      expect(EncryptionService.validateApiKeyFormat('invalid-key')).toBe(false);
      expect(EncryptionService.validateApiKeyFormat('AIza')).toBe(false);
      expect(EncryptionService.validateApiKeyFormat('')).toBe(false);
      expect(EncryptionService.validateApiKeyFormat(null as any)).toBe(false);
    });
  });

  describe('sanitizeApiKey', () => {
    it('should remove whitespace and prefixes', () => {
      expect(EncryptionService.sanitizeApiKey('  AIzaSyTest  ')).toBe('AIzaSyTest');
      expect(EncryptionService.sanitizeApiKey('api_key: AIzaSyTest')).toBe('AIzaSyTest');
      expect(EncryptionService.sanitizeApiKey('google-api-key: AIzaSyTest')).toBe('AIzaSyTest');
    });

    it('should handle empty or invalid input', () => {
      expect(EncryptionService.sanitizeApiKey('')).toBe('');
      expect(EncryptionService.sanitizeApiKey(null as any)).toBe('');
    });
  });
});

describe('DevEncryptionFallback', () => {
  const testApiKey = 'AIzaSyDummyApiKey123456789012345678901';

  describe('encryptApiKey', () => {
    it('should encrypt API key using base64', () => {
      const result = DevEncryptionFallback.encryptApiKey(testApiKey);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should throw error for empty API key', () => {
      expect(() => DevEncryptionFallback.encryptApiKey('')).toThrow(
        'API key is required'
      );
    });
  });

  describe('decryptApiKey', () => {
    it('should decrypt API key from base64', () => {
      const encrypted = DevEncryptionFallback.encryptApiKey(testApiKey);
      const decrypted = DevEncryptionFallback.decryptApiKey(encrypted);
      expect(decrypted).toBe(testApiKey);
    });

    it('should throw error for empty encrypted key', () => {
      expect(() => DevEncryptionFallback.decryptApiKey('')).toThrow(
        'Encrypted key is required'
      );
    });

    it('should throw error for invalid encrypted key', () => {
      expect(() => DevEncryptionFallback.decryptApiKey('invalid-base64')).toThrow(
        'Failed to decrypt API key'
      );
    });
  });

  describe('round-trip encryption', () => {
    it('should encrypt and decrypt correctly', () => {
      const original = testApiKey;
      const encrypted = DevEncryptionFallback.encryptApiKey(original);
      const decrypted = DevEncryptionFallback.decryptApiKey(encrypted);
      
      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });
  });
});

describe('AdaptiveEncryptionService', () => {
  const testApiKey = 'AIzaSyDummyApiKey123456789012345678901';
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  describe('encryptApiKey', () => {
    it('should use Edge Functions in production', async () => {
      process.env.NODE_ENV = 'production';
      
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { encrypted_key: 'encrypted_key_123' },
        error: null,
      });

      const result = await AdaptiveEncryptionService.encryptApiKey(testApiKey);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('encrypt-api-key', {
        body: { api_key: testApiKey },
      });
      expect(result).toBe('encrypted_key_123');
    });

    it('should use fallback in development when Edge Functions unavailable', async () => {
      process.env.NODE_ENV = 'development';
      
      (supabase.functions.invoke as any).mockRejectedValue(new Error('Service unavailable'));

      const result = await AdaptiveEncryptionService.encryptApiKey(testApiKey);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should use Edge Functions in development when available', async () => {
      process.env.NODE_ENV = 'development';
      
      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({
          data: { encrypted_key: 'test' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { encrypted_key: 'encrypted_key_123' },
          error: null,
        });

      const result = await AdaptiveEncryptionService.encryptApiKey(testApiKey);

      expect(result).toBe('encrypted_key_123');
    });
  });

  describe('decryptApiKey', () => {
    it('should use Edge Functions in production', async () => {
      process.env.NODE_ENV = 'production';
      
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { api_key: testApiKey },
        error: null,
      });

      const result = await AdaptiveEncryptionService.decryptApiKey('encrypted_key_123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('decrypt-api-key', {
        body: { encrypted_key: 'encrypted_key_123' },
      });
      expect(result).toBe(testApiKey);
    });

    it('should use fallback in development when Edge Functions unavailable', async () => {
      process.env.NODE_ENV = 'development';
      
      // First call for availability check, second for actual decryption
      (supabase.functions.invoke as any).mockRejectedValue(new Error('Service unavailable'));

      // Create encrypted key using fallback method
      const encrypted = DevEncryptionFallback.encryptApiKey(testApiKey);
      const result = await AdaptiveEncryptionService.decryptApiKey(encrypted);

      expect(result).toBe(testApiKey);
    });
  });
});