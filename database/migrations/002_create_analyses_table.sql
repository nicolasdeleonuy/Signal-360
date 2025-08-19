-- Migration: Create analyses table
-- Description: Creates the analyses table for storing analysis results with foreign key to profiles
-- Requires: profiles table from migration 001

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

-- Enable Row Level Security
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analyses table
CREATE POLICY "Users can view own analyses" ON analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_ticker_symbol ON analyses(ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_ticker ON analyses(user_id, ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_context ON analyses(analysis_context);

-- Add comments for documentation
COMMENT ON TABLE analyses IS 'Analysis results and metadata for investment/trading decisions';
COMMENT ON COLUMN analyses.user_id IS 'Foreign key to profiles.id, enforces user ownership';
COMMENT ON COLUMN analyses.ticker_symbol IS 'Stock ticker symbol (normalized to uppercase)';
COMMENT ON COLUMN analyses.analysis_context IS 'Type of analysis: investment or trading';
COMMENT ON COLUMN analyses.trading_timeframe IS 'Trading timeframe (e.g., 1D, 1W, 1M) - null for investment';
COMMENT ON COLUMN analyses.synthesis_score IS 'Final analysis score from 0-100';
COMMENT ON COLUMN analyses.convergence_factors IS 'JSONB array of positive factors';
COMMENT ON COLUMN analyses.divergence_factors IS 'JSONB array of negative factors';
COMMENT ON COLUMN analyses.full_report IS 'Complete analysis report in JSONB format';