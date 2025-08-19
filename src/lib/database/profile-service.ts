// Profile management service for Signal-360
// Handles CRUD operations for user profiles with encrypted API key storage

import { supabase } from '../supabase';
import { Profile, CreateProfileInput, UpdateProfileInput, DatabaseError } from '../../types/database';
import { AdaptiveEncryptionService } from '../edge-functions/encryption';

/**
 * Service class for managing user profiles
 * Provides CRUD operations with proper error handling and validation
 */
export class ProfileService {
  /**
   * Create a new user profile
   * @param input Profile creation data
   * @returns Promise<Profile> The created profile
   * @throws DatabaseError if creation fails
   */
  static async createProfile(input: CreateProfileInput): Promise<Profile> {
    try {
      // Validate input
      if (!input.id) {
        throw new Error('User ID is required');
      }

      // Prepare profile data
      const profileData: any = {
        id: input.id,
        encrypted_google_api_key: null,
      };

      // Encrypt API key if provided
      if (input.google_api_key) {
        profileData.encrypted_google_api_key = await this.encryptApiKey(input.google_api_key);
      }

      // Insert profile into database
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        throw this.handleDatabaseError(error);
      }

      return data as Profile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create profile: ${error.message}`);
      }
      throw new Error('Failed to create profile: Unknown error');
    }
  }

  /**
   * Get a user profile by ID
   * @param userId User ID from auth.users
   * @returns Promise<Profile | null> The profile or null if not found
   */
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Return null if profile not found
        if (error.code === 'PGRST116') {
          return null;
        }
        throw this.handleDatabaseError(error);
      }

      return data as Profile;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a user profile
   * @param userId User ID from auth.users
   * @param input Profile update data
   * @returns Promise<Profile> The updated profile
   * @throws DatabaseError if update fails
   */
  static async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Prepare update data
      const updateData: any = {};

      // Encrypt API key if provided
      if (input.google_api_key !== undefined) {
        if (input.google_api_key === null || input.google_api_key === '') {
          updateData.encrypted_google_api_key = null;
        } else {
          updateData.encrypted_google_api_key = await this.encryptApiKey(input.google_api_key);
        }
      }

      // Update profile in database
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw this.handleDatabaseError(error);
      }

      return data as Profile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
      throw new Error('Failed to update profile: Unknown error');
    }
  }

  /**
   * Delete a user profile
   * @param userId User ID from auth.users
   * @returns Promise<void>
   * @throws DatabaseError if deletion fails
   */
  static async deleteProfile(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        throw this.handleDatabaseError(error);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete profile: ${error.message}`);
      }
      throw new Error('Failed to delete profile: Unknown error');
    }
  }

  /**
   * Get decrypted Google API key for a user
   * @param userId User ID from auth.users
   * @returns Promise<string | null> The decrypted API key or null if not set
   * @throws DatabaseError if retrieval fails
   */
  static async getDecryptedApiKey(userId: string): Promise<string | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await this.getProfile(userId);
      if (!profile || !profile.encrypted_google_api_key) {
        return null;
      }

      // Decrypt the API key
      return await this.decryptApiKey(profile.encrypted_google_api_key);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get API key: ${error.message}`);
      }
      throw new Error('Failed to get API key: Unknown error');
    }
  }

  /**
   * Check if a profile exists for a user
   * @param userId User ID from auth.users
   * @returns Promise<boolean> True if profile exists
   */
  static async profileExists(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId);
      return profile !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt an API key using adaptive encryption service
   * @param apiKey Plain text API key
   * @returns Promise<string> Encrypted API key
   * @private
   */
  private static async encryptApiKey(apiKey: string): Promise<string> {
    return AdaptiveEncryptionService.encryptApiKey(apiKey);
  }

  /**
   * Decrypt an API key using adaptive encryption service
   * @param encryptedKey Encrypted API key
   * @returns Promise<string> Decrypted API key
   * @private
   */
  private static async decryptApiKey(encryptedKey: string): Promise<string> {
    return AdaptiveEncryptionService.decryptApiKey(encryptedKey);
  }

  /**
   * Handle database errors and convert to standardized format
   * @param error Supabase error object
   * @returns DatabaseError Standardized error
   * @private
   */
  private static handleDatabaseError(error: any): DatabaseError {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || 'Database operation failed',
      details: error.details,
      hint: error.hint,
    };
  }
}