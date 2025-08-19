# Database Scripts

This directory contains automated database setup, migration, and seeding scripts for Signal-360.

## Overview

The database scripts provide comprehensive automation for:
- **Development Setup** - Quick database setup for local development
- **Production Deployment** - Safe production database deployment
- **Migration Management** - Version-controlled database changes
- **Data Seeding** - Populate databases with test and demo data

## Scripts

### 1. Development Setup (`setup-dev.js`)

Automates database setup for development environments.

```bash
# Basic development setup
node scripts/database/setup-dev.js

# Environment variables required:
# VITE_SUPABASE_URL or SUPABASE_URL
# VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY (optional, for admin operations)
```

**Features:**
- Validates environment configuration
- Creates database schema with RLS policies
- Seeds development data
- Verifies setup completion
- Interactive prompts for safety

### 2. Production Setup (`setup-prod.js`)

Handles production database deployment with safety checks.

```bash
# Production setup (requires confirmation)
NODE_ENV=production node scripts/database/setup-prod.js

# Environment variables required:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

**Features:**
- Strict environment validation
- Existing data detection and warnings
- Interactive confirmation prompts
- Security feature verification
- Performance index creation
- Comprehensive verification

### 3. Migration Management (`migrate.js`)

Manages database schema changes with version tracking.

```bash
# Show migration status
node scripts/database/migrate.js status

# Run pending migrations
node scripts/database/migrate.js migrate

# Dry run (preview changes)
node scripts/database/migrate.js migrate --dry-run

# Migrate to specific version
node scripts/database/migrate.js migrate --target 003

# Rollback migration
node scripts/database/migrate.js rollback 003
```

**Features:**
- Version tracking with `schema_migrations` table
- Dry run capability
- Rollback support (requires rollback files)
- Checksum validation
- Execution time tracking

### 4. Data Seeding (`seed.js`)

Populates databases with test and demo data.

```bash
# Seed development data
node scripts/database/seed.js dev

# Seed test data
node scripts/database/seed.js test

# Seed demo data with clear
node scripts/database/seed.js demo --clear

# Check seed status
node scripts/database/seed.js status

# Clear all seed data
node scripts/database/seed.js clear
```

**Features:**
- Multiple seed data sets (dev, test, demo)
- Selective data clearing
- Conflict resolution
- Status reporting

## Setup Process

### Development Environment

1. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Add your Supabase credentials
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Run Development Setup**
   ```bash
   node scripts/database/setup-dev.js
   ```

4. **Verify Setup**
   ```bash
   node scripts/database/migrate.js status
   node scripts/database/seed.js status
   ```

### Production Environment

1. **Set Environment Variables**
   ```bash
   export NODE_ENV=production
   export SUPABASE_URL=your_production_url
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Run Production Setup**
   ```bash
   node scripts/database/setup-prod.js
   ```

3. **Verify Production Setup**
   ```bash
   node scripts/database/migrate.js status
   ```

## Migration Files

Migration files should be placed in `database/migrations/` with the naming convention:
```
001_create_profiles_table.sql
002_create_analyses_table.sql
003_add_indexes.sql
```

### Migration File Structure

```sql
-- Migration: Description of changes
-- Version: 001
-- Description: Create profiles table

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_google_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
```

### Rollback Files (Optional)

For migrations that support rollback, create corresponding rollback files:
```
001_rollback.sql
002_rollback.sql
```

## Seed Data Structure

The seeding system supports multiple data sets:

### Development Data
- Basic user profiles for development
- Sample analyses with realistic data
- Covers common use cases

### Test Data
- Minimal data for automated testing
- Predictable IDs and values
- Isolated from development data

### Demo Data
- Comprehensive data for demonstrations
- Showcases all features
- Realistic business scenarios

## Error Handling

All scripts include comprehensive error handling:

- **Environment Validation** - Check required variables
- **Connection Testing** - Verify database connectivity
- **Data Validation** - Ensure data integrity
- **Rollback Capability** - Undo changes on failure
- **Detailed Logging** - Track all operations

## Security Considerations

### Development
- Uses anon key for basic operations
- Service role key for admin operations (optional)
- Interactive prompts for destructive operations

### Production
- Requires service role key for all operations
- Multiple confirmation prompts
- Existing data detection and warnings
- Comprehensive security verification

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing required environment variables
   Solution: Check .env.local file and ensure all required variables are set
   ```

2. **Connection Failures**
   ```
   Error: Failed to connect to Supabase
   Solution: Verify URL and keys, check network connectivity
   ```

3. **Permission Errors**
   ```
   Error: Insufficient privileges
   Solution: Ensure service role key is provided for admin operations
   ```

4. **Migration Conflicts**
   ```
   Error: Migration already executed
   Solution: Check migration status, consider rollback if needed
   ```

### Debug Mode

Enable debug mode for detailed error information:
```bash
DEBUG=1 node scripts/database/setup-dev.js
```

## Best Practices

1. **Always backup production data** before running setup or migrations
2. **Test migrations in development** before applying to production
3. **Use dry-run mode** to preview changes
4. **Keep migration files small** and focused on single changes
5. **Document breaking changes** in migration comments
6. **Use semantic versioning** for migration numbering
7. **Test rollback procedures** before deploying

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Setup Database
  run: |
    node scripts/database/migrate.js migrate
    node scripts/database/seed.js test
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Docker Integration

```dockerfile
# Copy database scripts
COPY scripts/database/ /app/scripts/database/
COPY database/ /app/database/

# Run setup
RUN node scripts/database/setup-prod.js
```

## Monitoring and Maintenance

- **Regular backups** of production databases
- **Monitor migration execution times** for performance
- **Clean up old seed data** periodically
- **Review and update seed data** as features evolve
- **Test disaster recovery procedures** regularly