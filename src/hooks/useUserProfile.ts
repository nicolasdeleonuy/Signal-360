import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/auth-context';

export interface UserProfile {
  id: string;
  credits: number;
  encrypted_google_api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  decrementCredits: () => Promise<boolean>;
}

/**
 * Custom hook for managing user profile data including credits
 */
export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the user profile from Supabase
   */
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // If profile doesn't exist, create it
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                credits: 3
              }
            ])
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          setProfile(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Refreshes the profile data
   */
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  /**
   * Decrements user credits by 1
   * Returns true if successful, false if insufficient credits
   */
  const decrementCredits = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !profile) {
      return false;
    }

    if (profile.credits <= 0) {
      return false;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);
      return true;
    } catch (err) {
      console.error('Failed to decrement credits:', err);
      return false;
    }
  }, [user?.id, profile]);

  // Fetch profile when user changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    decrementCredits,
  };
}