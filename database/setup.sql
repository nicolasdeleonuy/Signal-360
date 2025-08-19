-- Signal-360 Database Setup Script
-- This script sets up the complete database schema for development and production
-- Run this script in Supabase SQL Editor or via psql

-- =============================================================================
-- SETUP VERIFICATION
-- =============================================================================

-- Verify Supabase auth is available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        RAISE EXCEPTION 'Supabase auth schema not found. This script requires Supabase.';
    END IF;
END $$;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Enable pgsodium for encryption (required for API key storage)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Verify pgsodium is available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgsodium') THEN
        RAISE EXCEPTION 'pgsodium extension is required but not available';
    END IF;
END $$;

-- =============================================================================
-- SCHEMA CREATION
-- =============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_google_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ticker_symbol TEXT NOT NULL,
    analysis_context TEXT NOT NULL CHECK (analysis_context IN ('investment', 'trading')),
    trading_timeframe TEXT,
    synthesis_score INTEGER CHECK (synthesis_score >= 0 AND synthesis_score <= 100),
    convergence_factors JSONB DEFAULT '[]'::jsonb,
    divergence_factors JSONB DEFAULT '[]'::jsonb,
    full_report JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Analyses RLS policies
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;

CREATE POLICY "Users can view own analyses" ON analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_ticker_symbol ON analyses(ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_ticker ON analyses(user_id, ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_context ON analyses(analysis_context);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Add table and column comments
COMMENT ON TABLE profiles IS 'User profiles with encrypted API keys, linked to auth.users';
COMMENT ON TABLE analyses IS 'Analysis results and metadata for investment/trading decisions';

COMMENT ON COLUMN profiles.id IS 'UUID from auth.users, serves as both PK and FK';
COMMENT ON COLUMN profiles.encrypted_google_api_key IS 'Encrypted Google API key using pgsodium';

COMMENT ON COLUMN analyses.user_id IS 'Foreign key to profiles.id, enforces user ownership';
COMMENT ON COLUMN analyses.ticker_symbol IS 'Stock ticker symbol (normalized to uppercase)';
COMMENT ON COLUMN analyses.analysis_context IS 'Type of analysis: investment or trading';
COMMENT ON COLUMN analyses.trading_timeframe IS 'Trading timeframe (e.g., 1D, 1W, 1M) - null for investment';
COMMENT ON COLUMN analyses.synthesis_score IS 'Final analysis score from 0-100';
COMMENT ON COLUMN analyses.convergence_factors IS 'JSONB array of positive factors';
COMMENT ON COLUMN analyses.divergence_factors IS 'JSONB array of negative factors';
COMMENT ON COLUMN analyses.full_report IS 'Complete analysis report in JSONB format';

-- =============================================================================
-- SETUP COMPLETION
-- =============================================================================

-- Verify setup completed successfully
DO $$
BEGIN
    -- Check tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE EXCEPTION 'Setup failed: profiles table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analyses') THEN
        RAISE EXCEPTION 'Setup failed: analyses table not created';
    END IF;
    
    -- Check RLS is enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Setup failed: RLS not enabled on profiles table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'analyses' AND rowsecurity = true) THEN
        RAISE EXCEPTION 'Setup failed: RLS not enabled on analyses table';
    END IF;
    
    RAISE NOTICE 'Signal-360 database setup completed successfully!';
END $$;