// Profile repository implementation
// Extends base repository with profile-specific operations

import { BaseRepository } from './base-repository';
import { AdaptiveEncryptionService } from '../../edge-functions/encryption';
import { DatabaseOperation } from '../error-handler';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
} from '../../../types/database';

/**
 * Profile repository implementing repository pattern
 * Provides optimized queries and profile-specific operations
 */
export class ProfileRepository extends BaseRepository<Profile, CreateProfileInput, UpdateProfileInput> {
  constructor() {
    super('profiles');
  }

  /**
   * Create profile with encrypted API key
   * @param data Profile creation data
   * @returns Promise<Profile> Created profile
   */
  async create(data: CreateProfileInput): Promise<Profile> {
    return DatabaseOperation.execute(
      async () => {
        // Prepare profile data
        const profileData: any = {
          id: data.id,
          encrypted_google_api_key: null,
        };

        // Encrypt API key if provided
        if (data.google_api_key) {
          profileData.encrypted_google_api_key = await AdaptiveEncryptionService.encryptApiKey(
            data.google_api_key
          );
        }

        return super.create(profileData);
      },
      'Create profile with encryption'
    );
  }

  /**
   * Update profile with API key encryption
   * @param id Profile ID
   * @param data Update data
   * @returns Promise<Profile> Updated profile
   */
  async update(id: string, data: Partial<UpdateProfileInput>): Promise<Profile> {
    return DatabaseOperation.execute(
      async () => {
        const updateData: any = {};

        // Handle API key encryption
        if (data.google_api_key !== undefined) {
          if (data.google_api_key === null || data.google_api_key === '') {
            updateData.encrypted_google_api_key = null;
          } else {
            updateData.encrypted_google_api_key = await AdaptiveEncryptionService.encryptApiKey(
              data.google_api_key
            );
          }
        }

        return super.update(id, updateData);
      },
      'Update profile with encryption'
    );
  }

  /**
   * Get decrypted API key for profile
   * @param profileId Profile ID
   * @returns Promise<string | null> Decrypted API key or null
   */
  async getDecryptedApiKey(profileId: string): Promise<string | null> {
    return DatabaseOperation.execute(
      async () => {
        const profile = await this.findById(profileId);
        if (!profile || !profile.encrypted_google_api_key) {
          return null;
        }

        return AdaptiveEncryptionService.decryptApiKey(profile.encrypted_google_api_key);
      },
      'Get decrypted API key'
    );
  }

  /**
   * Check if profile has API key configured
   * @param profileId Profile ID
   * @returns Promise<boolean> True if API key is configured
   */
  async hasApiKey(profileId: string): Promise<boolean> {
    return DatabaseOperation.execute(
      async () => {
        const profile = await this.findById(profileId);
        return !!(profile?.encrypted_google_api_key);
      },
      'Check API key status'
    );
  }

  /**
   * Get profiles created within date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Promise<Profile[]> Profiles created in range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Profile[]> {
    return this.findWithComplexFilters(
      (query) => query
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      { order_by: 'created_at', ascending: false }
    );
  }

  /**
   * Get profiles with API keys configured
   * @param options Query options
   * @returns Promise<Profile[]> Profiles with API keys
   */
  async findWithApiKeys(options: { limit?: number; offset?: number } = {}): Promise<Profile[]> {
    return this.findWithComplexFilters(
      (query) => query.not('encrypted_google_api_key', 'is', null),
      options
    );
  }

  /**
   * Get profiles without API keys configured
   * @param options Query options
   * @returns Promise<Profile[]> Profiles without API keys
   */
  async findWithoutApiKeys(options: { limit?: number; offset?: number } = {}): Promise<Profile[]> {
    return this.findWithComplexFilters(
      (query) => query.is('encrypted_google_api_key', null),
      options
    );
  }

  /**
   * Get profile statistics
   * @returns Promise<ProfileStats> Profile statistics
   */
  async getStats(): Promise<ProfileStats> {
    return DatabaseOperation.execute(
      async () => {
        const [totalProfiles, profilesWithApiKeys, profilesWithoutApiKeys] = await Promise.all([
          this.count(),
          this.count({ encrypted_google_api_key: { not: null } }),
          this.count({ encrypted_google_api_key: null }),
        ]);

        return {
          totalProfiles,
          profilesWithApiKeys,
          profilesWithoutApiKeys,
          apiKeyConfigurationRate: totalProfiles > 0 
            ? Math.round((profilesWithApiKeys / totalProfiles) * 100) 
            : 0,
        };
      },
      'Get profile statistics'
    );
  }

  /**
   * Bulk update API key status
   * @param profileIds Array of profile IDs
   * @param hasApiKey Whether profiles should have API key
   * @returns Promise<Profile[]> Updated profiles
   */
  async bulkUpdateApiKeyStatus(profileIds: string[], hasApiKey: boolean): Promise<Profile[]> {
    return DatabaseOperation.execute(
      async () => {
        const updates = profileIds.map(id => ({
          id,
          data: { 
            encrypted_google_api_key: hasApiKey ? 'placeholder' : null 
          } as Partial<UpdateProfileInput>,
        }));

        return this.batchUpdate(updates);
      },
      'Bulk update API key status'
    );
  }

  /**
   * Search profiles by partial ID match
   * @param partialId Partial profile ID
   * @param limit Maximum results to return
   * @returns Promise<Profile[]> Matching profiles
   */
  async searchByPartialId(partialId: string, limit: number = 10): Promise<Profile[]> {
    return this.findWithComplexFilters(
      (query) => query.ilike('id', `%${partialId}%`),
      { limit, order_by: 'created_at', ascending: false }
    );
  }

  /**
   * Get recently updated profiles
   * @param hours Number of hours to look back
   * @param limit Maximum results to return
   * @returns Promise<Profile[]> Recently updated profiles
   */
  async getRecentlyUpdated(hours: number = 24, limit: number = 50): Promise<Profile[]> {
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    return this.findWithComplexFilters(
      (query) => query.gte('updated_at', cutoffDate),
      { limit, order_by: 'updated_at', ascending: false }
    );
  }

  /**
   * Cleanup old profiles (soft delete simulation)
   * @param daysOld Number of days old to consider for cleanup
   * @returns Promise<number> Number of profiles marked for cleanup
   */
  async markOldProfilesForCleanup(daysOld: number = 365): Promise<number> {
    return DatabaseOperation.execute(
      async () => {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
        
        // In a real implementation, you might add a 'marked_for_deletion' field
        // For now, we'll just count how many would be affected
        return this.count({
          created_at: { lt: cutoffDate },
          updated_at: { lt: cutoffDate },
        });
      },
      'Mark old profiles for cleanup'
    );
  }
}

/**
 * Profile statistics interface
 */
export interface ProfileStats {
  totalProfiles: number;
  profilesWithApiKeys: number;
  profilesWithoutApiKeys: number;
  apiKeyConfigurationRate: number; // Percentage
}