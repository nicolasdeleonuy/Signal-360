import { useState, useEffect, useCallback, useRef } from 'react';
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

// Global event system for profile updates
class ProfileEventEmitter {
  private listeners: Set<(profile: UserProfile | null) => void> = new Set();

  subscribe(listener: (profile: UserProfile | null) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(profile: UserProfile | null) {
    this.listeners.forEach(listener => listener(profile));
  }
}

const profileEmitter = new ProfileEventEmitter();

/**
 * Custom hook for managing user profile data including credits
 */
export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isSubscribedRef = useRef<boolean>(false);

  /**
   * Fetches the user profile from Supabase
   */
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      const nullProfile = null;
      setProfile(nullProfile);
      setLoading(false);
      // Emit to all instances
      profileEmitter.emit(nullProfile);
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
          // Emit to all instances
          profileEmitter.emit(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
        // Emit to all instances
        profileEmitter.emit(data);
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
      console.error('decrementCredits: Missing user or profile');
      return false;
    }

    if (profile.credits <= 0) {
      console.error('decrementCredits: Insufficient credits');
      return false;
    }

    try {
      console.log('decrementCredits: Starting credit decrement, current credits:', profile.credits);
      
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('decrementCredits: Database update error:', updateError);
        throw updateError;
      }

      console.log('decrementCredits: Database updated successfully, new credits:', data.credits);
      
      // CRITICAL: Update all hook instances globally
      setProfile(data);
      
      // Emit to all other instances with a slight delay to ensure state consistency
      setTimeout(() => {
        profileEmitter.emit(data);
        console.log('decrementCredits: All instances updated via global event system');
      }, 0);
      
      return true;
    } catch (err) {
      console.error('Failed to decrement credits:', err);
      return false;
    }
  }, [user?.id, profile]);

  // Subscribe to global profile updates
  useEffect(() => {
    if (!isSubscribedRef.current) {
      const unsubscribe = profileEmitter.subscribe((updatedProfile) => {
        console.log('useUserProfile: Received global profile update:', updatedProfile);
        setProfile(updatedProfile);
      });
      isSubscribedRef.current = true;

      return () => {
        unsubscribe();
        isSubscribedRef.current = false;
      };
    }
  }, []);

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