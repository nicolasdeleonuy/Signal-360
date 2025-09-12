-- Migration: Add credits column to profiles table
-- Date: 2024-11-09
-- Description: Add credits system for premium features

-- Add credits column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3 NOT NULL;

-- Add check constraint to ensure credits are non-negative
ALTER TABLE profiles 
ADD CONSTRAINT check_credits_non_negative CHECK (credits >= 0);

-- Update existing users to have 3 credits
UPDATE profiles SET credits = 3 WHERE credits IS NULL;

-- Add comment for the new column
COMMENT ON COLUMN profiles.credits IS 'User credits for premium features, default 3 for trial users';