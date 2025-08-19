// Unit tests for ProfileService
// Tests CRUD operations, error handling, and encryption integration

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileService } from '../profile-service';
import { supabase } from '../../supabase';
import { Profile, CreateProfileInput, UpdateProfileInput } from '../../../types/database';

// Mock Supabase client
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('ProfileService', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProfile: Profile = {
    id: mockUserId,
    encrypted_google_api_key: 'encrypted_key_123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProfile', () => {
    it('should create a profile without API key', async () => {
      const input: CreateProfileInput = {
        id: mockUserId,
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockProfile, encrypted_google_api_key: null },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.createProfile(input);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        id: mockUserId,
        encrypted_google_api_key: null,
      });
      expect(result.id).toBe(mockUserId);
      expect(result.encrypted_google_api_key).toBeNull();
    });

    it('should create a profile with encrypted API key', async () => {
      const input: CreateProfileInput = {
        id: mockUserId,
        google_api_key: 'AIzaSyDummyApiKey123456789012345678901',
      };

      // Mock encryption function
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { encrypted_key: 'encrypted_key_123' },
        error: null,
      });

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.createProfile(input);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('encrypt-api-key', {
        body: { api_key: input.google_api_key },
      });
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        id: mockUserId,
        encrypted_google_api_key: 'encrypted_key_123',
      });
      expect(result.encrypted_google_api_key).toBe('encrypted_key_123');
    });

    it('should throw error if user ID is missing', async () => {
      const input: CreateProfileInput = {
        id: '',
      };

      await expect(ProfileService.createProfile(input)).rejects.toThrow(
        'Failed to create profile: User ID is required'
      );
    });

    it('should handle database errors', async () => {
      const input: CreateProfileInput = {
        id: mockUserId,
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      await expect(ProfileService.createProfile(input)).rejects.toThrow(
        'Failed to create profile'
      );
    });
  });

  describe('getProfile', () => {
    it('should retrieve a profile by user ID', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.getProfile(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', mockUserId);
      expect(result).toEqual(mockProfile);
    });

    it('should return null if profile not found', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.getProfile(mockUserId);

      expect(result).toBeNull();
    });

    it('should throw error if user ID is missing', async () => {
      await expect(ProfileService.getProfile('')).rejects.toThrow(
        'User ID is required'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile with new API key', async () => {
      const input: UpdateProfileInput = {
        google_api_key: 'AIzaSyNewApiKey123456789012345678901',
      };

      // Mock encryption function
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { encrypted_key: 'new_encrypted_key_123' },
        error: null,
      });

      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockProfile, encrypted_google_api_key: 'new_encrypted_key_123' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.updateProfile(mockUserId, input);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('encrypt-api-key', {
        body: { api_key: input.google_api_key },
      });
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        encrypted_google_api_key: 'new_encrypted_key_123',
      });
      expect(result.encrypted_google_api_key).toBe('new_encrypted_key_123');
    });

    it('should clear API key when set to null', async () => {
      const input: UpdateProfileInput = {
        google_api_key: null,
      };

      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockProfile, encrypted_google_api_key: null },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.updateProfile(mockUserId, input);

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        encrypted_google_api_key: null,
      });
      expect(result.encrypted_google_api_key).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      await ProfileService.deleteProfile(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseChain.delete).toHaveBeenCalled();
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should throw error if user ID is missing', async () => {
      await expect(ProfileService.deleteProfile('')).rejects.toThrow(
        'Failed to delete profile: User ID is required'
      );
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should return decrypted API key', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      // Mock decryption function
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { api_key: 'AIzaSyDecryptedApiKey123456789012345678901' },
        error: null,
      });

      const result = await ProfileService.getDecryptedApiKey(mockUserId);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('decrypt-api-key', {
        body: { encrypted_key: mockProfile.encrypted_google_api_key },
      });
      expect(result).toBe('AIzaSyDecryptedApiKey123456789012345678901');
    });

    it('should return null if no API key is set', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockProfile, encrypted_google_api_key: null },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.getDecryptedApiKey(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('profileExists', () => {
    it('should return true if profile exists', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.profileExists(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false if profile does not exist', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await ProfileService.profileExists(mockUserId);

      expect(result).toBe(false);
    });
  });
});