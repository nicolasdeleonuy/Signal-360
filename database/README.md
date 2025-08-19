# Signal-360 Database Schema

This directory contains the complete database schema and migration files for the Signal-360 investment analysis platform.

## Overview

The database is built on PostgreSQL via Supabase and consists of two main tables:
- `profiles` - User profiles with encrypted API keys
- `analyses` - Historical analysis results and metadata

## Files

### Migration Files
- `001_create_profiles_table.sql` - Creates the profiles table with RLS policies
- `002_create_analyses_table.sql` - Creates the analyses table with indexes and constraints

### Schema Files
- `schema.sql` - Complete database schema in a single file
- `setup.sql` - Production-ready setup script with verification
- `README.md` - This documentation file

## Setup Instructions

### For Supabase (Recommended)

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the `setup.sql` script:
   ```sql
   -- Copy and paste the contents of setup.sql
   ```

### For Local Development

If running PostgreSQL locally with Supabase CLI:

```bash
# Start Supabase locally
supabase start

# Apply the schema
supabase db reset
# Or run the setup script
psql -h localhost -p 54322 -U postgres -d postgres -f database/setup.sql
```

## Schema Details

### Profiles Table

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_google_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

**Features:**
- One-to-one relationship with `auth.users`
- Encrypted Google API key storage using pgsodium
- Automatic timestamp management
- Row Level Security (RLS) policies

### Analyses Table

```sql
CREATE TABLE analyses (
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
```

**Features:**
- Foreign key relationship to profiles
- Flexible JSONB storage for analysis factors
- Check constraints for data validation
- Optimized indexes for common queries
- Row Level Security (RLS) policies

## Security Features

### Row Level Security (RLS)
All tables implement RLS policies to ensure users can only access their own data:

**Profiles:**
- Users can view, update, and insert only their own profile
- Profile ID matches authenticated user ID

**Analyses:**
- Users can view and insert only their own analyses
- Analysis user_id matches authenticated user ID

### Encryption
- Google API keys are stored encrypted using the pgsodium extension
- Encryption/decryption handled in Supabase Edge Functions

## Indexes

The following indexes are created for optimal query performance:

```sql
-- Analyses table indexes
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_ticker_symbol ON analyses(ticker_symbol);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_user_ticker ON analyses(user_id, ticker_symbol);
CREATE INDEX idx_analyses_context ON analyses(analysis_context);
```

## Data Validation

### Check Constraints
- `analysis_context` must be either 'investment' or 'trading'
- `synthesis_score` must be between 0 and 100 (inclusive)

### Foreign Key Constraints
- `profiles.id` references `auth.users(id)` with CASCADE DELETE
- `analyses.user_id` references `profiles(id)` with CASCADE DELETE

## Maintenance

### Backup Considerations
- Regular backups should include both schema and data
- Consider archival strategy for old analysis data
- Monitor JSONB column sizes for performance

### Performance Monitoring
- Monitor query performance on JSONB columns
- Consider additional indexes based on usage patterns
- Regular VACUUM and ANALYZE operations

## Troubleshooting

### Common Issues

1. **pgsodium extension not available**
   - Ensure pgsodium is installed in your PostgreSQL instance
   - For Supabase, this should be available by default

2. **RLS policies blocking queries**
   - Ensure `auth.uid()` returns the correct user ID
   - Check that RLS policies match your authentication flow

3. **Foreign key constraint violations**
   - Ensure profiles are created before analyses
   - Verify user IDs match between auth.users and profiles

### Verification Queries

```sql
-- Check if tables exist and RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'analyses');

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'analyses');

-- Verify indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('profiles', 'analyses');
```