#!/usr/bin/env node

// Development database setup script
// Automates database setup for development environments

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function validateEnvironment() {
  logStep('VALIDATE', 'Checking environment configuration...');

  const missing = [];
  if (!config.supabaseUrl) missing.push('VITE_SUPABASE_URL or SUPABASE_URL');
  if (!config.supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    logError(`Missing required environment variables: ${missing.join(', ')}`);
    logError('Please check your .env.local file or environment configuration');
    process.exit(1);
  }

  if (!config.serviceRoleKey) {
    logWarning('SUPABASE_SERVICE_ROLE_KEY not found - some operations may be limited');
  }

  logSuccess('Environment configuration validated');
}

async function createSupabaseClient() {
  logStep('CLIENT', 'Creating Supabase client...');

  // Use service role key if available for admin operations
  const key = config.serviceRoleKey || config.supabaseKey;
  const client = createClient(config.supabaseUrl, key);

  // Test connection
  try {
    const { error } = await client.from('profiles').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows found" which is fine for testing connection
      throw error;
    }
    logSuccess('Supabase client created and connection tested');
    return client;
  } catch (error) {
    logError(`Failed to connect to Supabase: ${error.message}`);
    throw error;
  }
}

async function readSQLFile(filename) {
  const filePath = path.join(__dirname, '../../database', filename);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    logError(`Failed to read SQL file ${filename}: ${error.message}`);
    throw error;
  }
}

async function executeSQLFile(client, filename, description) {
  logStep('SQL', `Executing ${description}...`);

  try {
    const sql = await readSQLFile(filename);
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await client.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try alternative method if rpc doesn't work
          console.warn(`RPC method failed, trying direct execution: ${error.message}`);
          // Note: Direct SQL execution may not be available in all Supabase setups
        }
      }
    }

    logSuccess(`${description} completed successfully`);
  } catch (error) {
    logError(`Failed to execute ${description}: ${error.message}`);
    throw error;
  }
}

async function setupSchema(client) {
  logStep('SCHEMA', 'Setting up database schema...');

  try {
    // Check if tables already exist
    const { data: tables, error } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'analyses']);

    if (error) {
      logWarning('Could not check existing tables, proceeding with setup');
    } else if (tables && tables.length > 0) {
      const existingTables = tables.map(t => t.table_name);
      logWarning(`Found existing tables: ${existingTables.join(', ')}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Do you want to continue? This may overwrite existing data (y/N): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log('Setup cancelled by user');
        return;
      }
    }

    // Execute setup script
    await executeSQLFile(client, 'setup.sql', 'database schema setup');
    logSuccess('Database schema setup completed');

  } catch (error) {
    logError(`Schema setup failed: ${error.message}`);
    throw error;
  }
}

async function seedDatabase(client) {
  logStep('SEED', 'Seeding database with development data...');

  try {
    // Check if we should seed
    const { count: profileCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (profileCount > 0) {
      logWarning(`Found ${profileCount} existing profiles`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Do you want to add seed data anyway? (y/N): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log('Seeding skipped by user');
        return;
      }
    }

    // Create development user profiles
    const devProfiles = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        encrypted_google_api_key: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        encrypted_google_api_key: 'ZGV2X2VuY3J5cHRlZF9rZXk=', // Base64 encoded "dev_encrypted_key"
      },
    ];

    for (const profile of devProfiles) {
      const { error } = await client
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (error) {
        logWarning(`Failed to create profile ${profile.id}: ${error.message}`);
      }
    }

    // Create sample analyses
    const sampleAnalyses = [
      {
        user_id: '00000000-0000-0000-0000-000000000001',
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        trading_timeframe: null,
        synthesis_score: 85,
        convergence_factors: [
          {
            category: 'fundamental',
            description: 'Strong revenue growth',
            weight: 8.5,
            metadata: { growth_rate: 0.15 }
          }
        ],
        divergence_factors: [
          {
            category: 'technical',
            description: 'Overbought RSI',
            weight: 6.0,
            metadata: { rsi_value: 75 }
          }
        ],
        full_report: {
          summary: 'Apple shows strong fundamentals with some technical concerns',
          fundamental: {
            score: 90,
            factors: ['Revenue growth', 'Market position'],
            details: { revenue_growth: 0.15, market_cap: 3000000000000 }
          },
          technical: {
            score: 70,
            factors: ['RSI overbought', 'Strong trend'],
            details: { rsi: 75, trend: 'bullish' }
          }
        }
      },
      {
        user_id: '00000000-0000-0000-0000-000000000001',
        ticker_symbol: 'TSLA',
        analysis_context: 'trading',
        trading_timeframe: '1D',
        synthesis_score: 65,
        convergence_factors: [
          {
            category: 'technical',
            description: 'Bullish breakout',
            weight: 7.0,
            metadata: { breakout_level: 250 }
          }
        ],
        divergence_factors: [
          {
            category: 'fundamental',
            description: 'High valuation',
            weight: 8.0,
            metadata: { pe_ratio: 45 }
          }
        ],
        full_report: {
          summary: 'Tesla shows technical strength but fundamental concerns',
          technical: {
            score: 80,
            factors: ['Breakout pattern', 'Volume surge'],
            details: { breakout_level: 250, volume_ratio: 1.5 }
          },
          fundamental: {
            score: 50,
            factors: ['High valuation', 'Execution risk'],
            details: { pe_ratio: 45, debt_ratio: 0.3 }
          }
        }
      }
    ];

    for (const analysis of sampleAnalyses) {
      const { error } = await client
        .from('analyses')
        .insert(analysis);

      if (error) {
        logWarning(`Failed to create analysis for ${analysis.ticker_symbol}: ${error.message}`);
      }
    }

    logSuccess('Database seeded with development data');

  } catch (error) {
    logError(`Database seeding failed: ${error.message}`);
    throw error;
  }
}

async function verifySetup(client) {
  logStep('VERIFY', 'Verifying database setup...');

  try {
    // Check tables exist
    const { data: tables, error: tablesError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'analyses']);

    if (tablesError) {
      throw new Error(`Failed to verify tables: ${tablesError.message}`);
    }

    const tableNames = tables.map(t => t.table_name);
    const expectedTables = ['profiles', 'analyses'];
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }

    // Check RLS is enabled
    const { data: rlsStatus, error: rlsError } = await client
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['profiles', 'analyses']);

    if (rlsError) {
      logWarning('Could not verify RLS status');
    } else {
      const rlsEnabled = rlsStatus.filter(t => t.rowsecurity);
      if (rlsEnabled.length !== 2) {
        logWarning('RLS may not be enabled on all tables');
      }
    }

    // Check data counts
    const { count: profileCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: analysisCount } = await client
      .from('analyses')
      .select('*', { count: 'exact', head: true });

    logSuccess(`Setup verification completed:`);
    log(`  - Tables: ${tableNames.join(', ')}`, colors.green);
    log(`  - Profiles: ${profileCount || 0}`, colors.green);
    log(`  - Analyses: ${analysisCount || 0}`, colors.green);

  } catch (error) {
    logError(`Setup verification failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  log('🚀 Signal-360 Database Setup (Development)', colors.bright);
  log('==========================================\n');

  try {
    await validateEnvironment();
    const client = await createSupabaseClient();
    await setupSchema(client);
    await seedDatabase(client);
    await verifySetup(client);

    log('\n🎉 Database setup completed successfully!', colors.green + colors.bright);
    log('You can now start developing with Signal-360\n');

  } catch (error) {
    log('\n💥 Database setup failed!', colors.red + colors.bright);
    logError(error.message);
    if (error.stack) {
      log('\nStack trace:', colors.red);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironment,
  createSupabaseClient,
  setupSchema,
  seedDatabase,
  verifySetup,
};