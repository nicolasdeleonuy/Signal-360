-- Signal-360 Database Schema
-- Complete database schema for Signal-360 investment analysis platform
-- Platform: Supabase (PostgreSQL)
-- Version: 1.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

-- Create profiles table with one-to-one relationship to auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_google_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- ANALYSES TABLE
-- =============================================================================

-- Create analyses table for storing analysis results
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

-- Enable Row Level Security for analyses
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses table
CREATE POLICY "Users can view own analyses" ON analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Indexes for common query patterns on analyses table
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_ticker_symbol ON analyses(ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_ticker ON analyses(user_id, ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_context ON analyses(analysis_context);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles table updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

-- Table comments
COMMENT ON TABLE profiles IS 'User profiles with encrypted API keys, linked to auth.users';
COMMENT ON TABLE analyses IS 'Analysis results and metadata for investment/trading decisions';

-- Column comments for profiles
COMMENT ON COLUMN profiles.id IS 'UUID from auth.users, serves as both PK and FK';
COMMENT ON COLUMN profiles.encrypted_google_api_key IS 'Encrypted Google API key using pgsodium';

-- Column comments for analyses
COMMENT ON COLUMN analyses.user_id IS 'Foreign key to profiles.id, enforces user ownership';
COMMENT ON COLUMN analyses.ticker_symbol IS 'Stock ticker symbol (normalized to uppercase)';
COMMENT ON COLUMN analyses.analysis_context IS 'Type of analysis: investment or trading';
COMMENT ON COLUMN analyses.trading_timeframe IS 'Trading timeframe (e.g., 1D, 1W, 1M) - null for investment';
COMMENT ON COLUMN analyses.synthesis_score IS 'Final analysis score from 0-100';
COMMENT ON COLUMN analyses.convergence_factors IS 'JSONB array of positive factors';
COMMENT ON COLUMN analyses.divergence_factors IS 'JSONB array of negative factors';
COMMENT ON COLUMN analyses.full_report IS 'Complete analysis report in JSONB format';