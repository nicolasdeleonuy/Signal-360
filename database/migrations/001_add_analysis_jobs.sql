-- Migration: Add analysis_jobs table for asynchronous analysis tracking
-- Version: 001
-- Description: Creates the analysis_jobs table and related indexes for tracking asynchronous analysis progress

-- Create analysis_jobs table for tracking asynchronous analysis progress
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ticker_symbol TEXT NOT NULL,
    analysis_context TEXT NOT NULL CHECK (analysis_context IN ('investment', 'trading')),
    trading_timeframe TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_phase TEXT DEFAULT 'initializing',
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security for analysis_jobs
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_jobs table
CREATE POLICY "Users can view own analysis jobs" ON analysis_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis jobs" ON analysis_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update analysis jobs" ON analysis_jobs
    FOR UPDATE USING (true); -- Allow service role to update any job

-- Indexes for common query patterns on analysis_jobs table
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_ticker ON analysis_jobs(user_id, ticker_symbol);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status ON analysis_jobs(user_id, status);

-- Trigger for analysis_jobs table updated_at
CREATE TRIGGER update_analysis_jobs_updated_at
    BEFORE UPDATE ON analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table and column comments
COMMENT ON TABLE analysis_jobs IS 'Asynchronous analysis job tracking with status and progress';
COMMENT ON COLUMN analysis_jobs.id IS 'Unique job identifier (UUID string)';
COMMENT ON COLUMN analysis_jobs.user_id IS 'Foreign key to profiles.id, enforces user ownership';
COMMENT ON COLUMN analysis_jobs.ticker_symbol IS 'Stock ticker symbol (normalized to uppercase)';
COMMENT ON COLUMN analysis_jobs.analysis_context IS 'Type of analysis: investment or trading';
COMMENT ON COLUMN analysis_jobs.trading_timeframe IS 'Trading timeframe (e.g., 1D, 1W, 1M) - null for investment';
COMMENT ON COLUMN analysis_jobs.status IS 'Job status: pending, in_progress, completed, failed';
COMMENT ON COLUMN analysis_jobs.progress_percentage IS 'Analysis progress from 0-100';
COMMENT ON COLUMN analysis_jobs.current_phase IS 'Current analysis phase description';
COMMENT ON COLUMN analysis_jobs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN analysis_jobs.result_data IS 'Final analysis results in JSONB format';