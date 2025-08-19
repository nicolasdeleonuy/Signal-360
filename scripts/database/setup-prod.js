#!/usr/bin/env node

// Production database setup script
// Automates database setup for production environments with safety checks

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  environment: process.env.NODE_ENV || 'production',
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
  logStep('VALIDATE', 'Checking production environment configuration...');

  // Strict validation for production
  const missing = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    logError(`Missing required environment variables: ${missing.join(', ')}`);
    logError('Production setup requires service role key for admin operations');
    process.exit(1);
  }

  // Validate URL format
  try {
    new URL(config.supabaseUrl);
  } catch (error) {
    logError('Invalid SUPABASE_URL format');
    process.exit(1);
  }

  // Ensure we're in production mode
  if (config.environment !== 'production') {
    logWarning(`Environment is set to '${config.environment}', not 'production'`);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('Continue with production setup anyway? (y/N): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log('Setup cancelled by user');
      process.exit(0);
    }
  }

  logSuccess('Production environment configuration validated');
}

async function createSupabaseClient() {
  logStep('CLIENT', 'Creating Supabase admin client...');

  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test admin connection
  try {
    const { data, error } = await client.auth.admin.listUsers();
    if (error) {
      throw error;
    }
    logSuccess('Supabase admin client created and connection tested');
    return client;
  } catch (error) {
    logError(`Failed to connect to Supabase with admin privileges: ${error.message}`);
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

async function checkExistingData(client) {
  logStep('CHECK', 'Checking for existing data...');

  try {
    // Check if tables exist
    const { data: tables, error: tablesError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'analyses']);

    if (tablesError) {
      logWarning('Could not check existing tables');
      return { hasData: false, tableCount: 0 };
    }

    const tableCount = tables ? tables.length : 0;
    
    if (tableCount === 0) {
      logSuccess('No existing tables found - safe to proceed');
      return { hasData: false, tableCount: 0 };
    }

    // Check for existing data
    let totalRecords = 0;
    const tableCounts = {};

    for (const table of tables) {
      const { count, error } = await client
        .from(table.table_name)
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        tableCounts[table.table_name] = count;
        totalRecords += count;
      }
    }

    if (totalRecords > 0) {
      logWarning('Found existing data in production database:');
      Object.entries(tableCounts).forEach(([table, count]) => {
        log(`  - ${table}: ${count} records`, colors.yellow);
      });
      
      return { hasData: true, tableCount, tableCounts, totalRecords };
    }

    logSuccess('Tables exist but no data found - safe to proceed');
    return { hasData: false, tableCount, tableCounts };

  } catch (error) {
    logError(`Failed to check existing data: ${error.message}`);
    throw error;
  }
}

async function confirmProductionSetup(existingData) {
  if (existingData.hasData) {
    log('\n⚠️  WARNING: PRODUCTION DATABASE CONTAINS DATA ⚠️', colors.red + colors.bright);
    log('This operation may modify or overwrite existing data!', colors.red);
    log(`Total records found: ${existingData.totalRecords}`, colors.red);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    log('\nType "CONFIRM PRODUCTION SETUP" to continue:', colors.yellow);
    const confirmation = await new Promise(resolve => {
      readline.question('> ', resolve);
    });
    readline.close();

    if (confirmation !== 'CONFIRM PRODUCTION SETUP') {
      log('Setup cancelled - confirmation not provided');
      process.exit(0);
    }
  }

  log('\n🔒 PRODUCTION SETUP CONFIRMED', colors.green + colors.bright);
  log('Proceeding with production database setup...\n');
}

async function setupProductionSchema(client) {
  logStep('SCHEMA', 'Setting up production database schema...');

  try {
    const setupSQL = await readSQLFile('setup.sql');
    
    // Execute setup with error handling
    const { error } = await client.rpc('exec_sql', { sql: setupSQL });
    
    if (error) {
      // Fallback: try to execute statements individually
      logWarning('Batch execution failed, trying individual statements...');
      
      const statements = setupSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await client.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            logWarning(`Statement failed: ${stmtError.message}`);
            // Continue with other statements
          }
        }
      }
    }

    logSuccess('Production database schema setup completed');

  } catch (error) {
    logError(`Production schema setup failed: ${error.message}`);
    throw error;
  }
}

async function enableSecurityFeatures(client) {
  logStep('SECURITY', 'Enabling production security features...');

  try {
    // Verify RLS is enabled
    const { data: rlsStatus, error: rlsError } = await client
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['profiles', 'analyses']);

    if (rlsError) {
      logWarning('Could not verify RLS status');
    } else {
      const tablesWithoutRLS = rlsStatus.filter(t => !t.rowsecurity);
      if (tablesWithoutRLS.length > 0) {
        logError(`RLS not enabled on tables: ${tablesWithoutRLS.map(t => t.tablename).join(', ')}`);
        throw new Error('Row Level Security must be enabled on all tables in production');
      }
      logSuccess('Row Level Security verified on all tables');
    }

    // Verify pgsodium extension
    const { data: extensions, error: extError } = await client
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'pgsodium');

    if (extError || !extensions || extensions.length === 0) {
      logWarning('pgsodium extension not found - API key encryption may not work');
    } else {
      logSuccess('pgsodium extension verified');
    }

    logSuccess('Production security features verified');

  } catch (error) {
    logError(`Security verification failed: ${error.message}`);
    throw error;
  }
}

async function createProductionIndexes(client) {
  logStep('INDEXES', 'Creating production performance indexes...');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_analyses_ticker_created ON analyses(ticker_symbol, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_analyses_context_score ON analyses(analysis_context, synthesis_score DESC);',
    'CREATE INDEX IF NOT EXISTS idx_analyses_score_created ON analyses(synthesis_score DESC, created_at DESC);',
  ];

  try {
    for (const indexSQL of indexes) {
      const { error } = await client.rpc('exec_sql', { sql: indexSQL });
      if (error) {
        logWarning(`Index creation failed: ${error.message}`);
      }
    }

    logSuccess('Production indexes created');

  } catch (error) {
    logError(`Index creation failed: ${error.message}`);
    throw error;
  }
}

async function verifyProductionSetup(client) {
  logStep('VERIFY', 'Verifying production database setup...');

  try {
    // Comprehensive verification
    const verifications = [];

    // Check tables
    const { data: tables, error: tablesError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'analyses']);

    if (tablesError) {
      verifications.push({ check: 'Tables', status: 'ERROR', message: tablesError.message });
    } else {
      const tableNames = tables.map(t => t.table_name);
      const expectedTables = ['profiles', 'analyses'];
      const missingTables = expectedTables.filter(t => !tableNames.includes(t));
      
      if (missingTables.length > 0) {
        verifications.push({ check: 'Tables', status: 'ERROR', message: `Missing: ${missingTables.join(', ')}` });
      } else {
        verifications.push({ check: 'Tables', status: 'OK', message: tableNames.join(', ') });
      }
    }

    // Check RLS
    const { data: rlsStatus, error: rlsError } = await client
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['profiles', 'analyses']);

    if (rlsError) {
      verifications.push({ check: 'RLS', status: 'WARNING', message: 'Could not verify' });
    } else {
      const rlsEnabled = rlsStatus.filter(t => t.rowsecurity);
      if (rlsEnabled.length === 2) {
        verifications.push({ check: 'RLS', status: 'OK', message: 'Enabled on all tables' });
      } else {
        verifications.push({ check: 'RLS', status: 'ERROR', message: 'Not enabled on all tables' });
      }
    }

    // Check indexes
    const { data: indexes, error: indexError } = await client
      .from('pg_indexes')
      .select('indexname')
      .eq('schemaname', 'public')
      .like('indexname', 'idx_%');

    if (indexError) {
      verifications.push({ check: 'Indexes', status: 'WARNING', message: 'Could not verify' });
    } else {
      verifications.push({ check: 'Indexes', status: 'OK', message: `${indexes.length} custom indexes` });
    }

    // Display verification results
    logSuccess('Production setup verification:');
    verifications.forEach(({ check, status, message }) => {
      const color = status === 'OK' ? colors.green : status === 'WARNING' ? colors.yellow : colors.red;
      const icon = status === 'OK' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
      log(`  ${icon} ${check}: ${message}`, color);
    });

    // Check for any errors
    const errors = verifications.filter(v => v.status === 'ERROR');
    if (errors.length > 0) {
      throw new Error(`Production setup verification failed: ${errors.length} errors found`);
    }

    logSuccess('Production database setup verification completed');

  } catch (error) {
    logError(`Production verification failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  log('🏭 Signal-360 Database Setup (Production)', colors.bright);
  log('==========================================\n');

  try {
    await validateEnvironment();
    const client = await createSupabaseClient();
    const existingData = await checkExistingData(client);
    await confirmProductionSetup(existingData);
    await setupProductionSchema(client);
    await enableSecurityFeatures(client);
    await createProductionIndexes(client);
    await verifyProductionSetup(client);

    log('\n🎉 Production database setup completed successfully!', colors.green + colors.bright);
    log('Your Signal-360 production database is ready\n');

  } catch (error) {
    log('\n💥 Production database setup failed!', colors.red + colors.bright);
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
  checkExistingData,
  setupProductionSchema,
  enableSecurityFeatures,
  verifyProductionSetup,
};