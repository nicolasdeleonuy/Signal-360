#!/usr/bin/env node

// Database migration management script
// Handles database version tracking and migration execution

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  migrationsDir: path.join(__dirname, '../../database/migrations'),
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

async function createSupabaseClient() {
  const key = config.serviceRoleKey || config.supabaseKey;
  return createClient(config.supabaseUrl, key);
}

async function ensureMigrationsTable(client) {
  logStep('SETUP', 'Ensuring migrations table exists...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      execution_time_ms INTEGER,
      checksum VARCHAR(64)
    );

    CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at DESC);
  `;

  try {
    const { error } = await client.rpc('exec_sql', { sql: createTableSQL });
    if (error) {
      throw error;
    }
    logSuccess('Migrations table ready');
  } catch (error) {
    logError(`Failed to create migrations table: ${error.message}`);
    throw error;
  }
}

async function getMigrationFiles() {
  logStep('SCAN', 'Scanning for migration files...');

  try {
    const files = await fs.readdir(config.migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        if (!match) {
          throw new Error(`Invalid migration filename format: ${file}`);
        }
        return {
          filename: file,
          version: match[1],
          name: match[2].replace(/_/g, ' '),
          path: path.join(config.migrationsDir, file),
        };
      });

    logSuccess(`Found ${migrationFiles.length} migration files`);
    return migrationFiles;
  } catch (error) {
    logError(`Failed to scan migration files: ${error.message}`);
    throw error;
  }
}

async function getExecutedMigrations(client) {
  logStep('CHECK', 'Checking executed migrations...');

  try {
    const { data, error } = await client
      .from('schema_migrations')
      .select('version, name, executed_at')
      .order('version');

    if (error) {
      throw error;
    }

    logSuccess(`Found ${data.length} executed migrations`);
    return data || [];
  } catch (error) {
    logError(`Failed to get executed migrations: ${error.message}`);
    throw error;
  }
}

async function calculateChecksum(filePath) {
  const crypto = require('crypto');
  const content = await fs.readFile(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

async function executeMigration(client, migration) {
  logStep('MIGRATE', `Executing migration ${migration.version}: ${migration.name}`);

  const startTime = Date.now();

  try {
    // Read migration file
    const sql = await fs.readFile(migration.path, 'utf8');
    const checksum = await calculateChecksum(migration.path);

    // Execute migration
    const { error } = await client.rpc('exec_sql', { sql });
    if (error) {
      throw error;
    }

    const executionTime = Date.now() - startTime;

    // Record migration
    const { error: recordError } = await client
      .from('schema_migrations')
      .insert({
        version: migration.version,
        name: migration.name,
        execution_time_ms: executionTime,
        checksum: checksum,
      });

    if (recordError) {
      throw recordError;
    }

    logSuccess(`Migration ${migration.version} completed in ${executionTime}ms`);
    return { success: true, executionTime };

  } catch (error) {
    logError(`Migration ${migration.version} failed: ${error.message}`);
    throw error;
  }
}

async function runMigrations(client, options = {}) {
  const { dryRun = false, target = null } = options;

  logStep('MIGRATE', dryRun ? 'Dry run - no changes will be made' : 'Running migrations...');

  try {
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations(client);
    const executedVersions = new Set(executedMigrations.map(m => m.version));

    // Find pending migrations
    let pendingMigrations = migrationFiles.filter(m => !executedVersions.has(m.version));

    // Filter by target if specified
    if (target) {
      pendingMigrations = pendingMigrations.filter(m => m.version <= target);
    }

    if (pendingMigrations.length === 0) {
      logSuccess('No pending migrations found');
      return { executed: 0, skipped: 0 };
    }

    log(`\nPending migrations:`, colors.yellow);
    pendingMigrations.forEach(m => {
      log(`  ${m.version}: ${m.name}`, colors.yellow);
    });

    if (dryRun) {
      log(`\nDry run complete - ${pendingMigrations.length} migrations would be executed`, colors.blue);
      return { executed: 0, skipped: pendingMigrations.length };
    }

    // Confirm execution
    if (pendingMigrations.length > 0 && !process.env.CI) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question(`\nExecute ${pendingMigrations.length} migrations? (y/N): `, resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log('Migration cancelled by user');
        return { executed: 0, skipped: pendingMigrations.length };
      }
    }

    // Execute migrations
    let executed = 0;
    let totalTime = 0;

    for (const migration of pendingMigrations) {
      const result = await executeMigration(client, migration);
      executed++;
      totalTime += result.executionTime;
    }

    logSuccess(`\nMigration complete: ${executed} migrations executed in ${totalTime}ms`);
    return { executed, skipped: 0 };

  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    throw error;
  }
}

async function rollbackMigration(client, version) {
  logStep('ROLLBACK', `Rolling back migration ${version}...`);

  try {
    // Check if migration exists
    const { data: migration, error } = await client
      .from('schema_migrations')
      .select('*')
      .eq('version', version)
      .single();

    if (error || !migration) {
      throw new Error(`Migration ${version} not found in executed migrations`);
    }

    // Look for rollback file
    const rollbackFile = path.join(config.migrationsDir, `${version}_rollback.sql`);
    
    try {
      await fs.access(rollbackFile);
    } catch {
      throw new Error(`Rollback file not found: ${version}_rollback.sql`);
    }

    // Execute rollback
    const rollbackSQL = await fs.readFile(rollbackFile, 'utf8');
    const { error: rollbackError } = await client.rpc('exec_sql', { sql: rollbackSQL });
    
    if (rollbackError) {
      throw rollbackError;
    }

    // Remove migration record
    const { error: deleteError } = await client
      .from('schema_migrations')
      .delete()
      .eq('version', version);

    if (deleteError) {
      throw deleteError;
    }

    logSuccess(`Migration ${version} rolled back successfully`);

  } catch (error) {
    logError(`Rollback failed: ${error.message}`);
    throw error;
  }
}

async function showMigrationStatus(client) {
  logStep('STATUS', 'Checking migration status...');

  try {
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations(client);
    const executedVersions = new Set(executedMigrations.map(m => m.version));

    log('\nMigration Status:', colors.bright);
    log('================\n');

    if (migrationFiles.length === 0) {
      log('No migration files found', colors.yellow);
      return;
    }

    migrationFiles.forEach(migration => {
      const isExecuted = executedVersions.has(migration.version);
      const status = isExecuted ? '✅ EXECUTED' : '⏳ PENDING';
      const color = isExecuted ? colors.green : colors.yellow;
      
      log(`${status} ${migration.version}: ${migration.name}`, color);
      
      if (isExecuted) {
        const executed = executedMigrations.find(m => m.version === migration.version);
        log(`         Executed: ${executed.executed_at}`, colors.reset);
      }
    });

    const pendingCount = migrationFiles.length - executedMigrations.length;
    log(`\nSummary: ${executedMigrations.length} executed, ${pendingCount} pending\n`);

  } catch (error) {
    logError(`Failed to show migration status: ${error.message}`);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];
  const options = process.argv.slice(3);

  log('🔄 Signal-360 Database Migration Tool', colors.bright);
  log('====================================\n');

  try {
    const client = await createSupabaseClient();
    await ensureMigrationsTable(client);

    switch (command) {
      case 'status':
        await showMigrationStatus(client);
        break;

      case 'migrate':
        const dryRun = options.includes('--dry-run');
        const targetIndex = options.indexOf('--target');
        const target = targetIndex >= 0 ? options[targetIndex + 1] : null;
        await runMigrations(client, { dryRun, target });
        break;

      case 'rollback':
        const version = options[0];
        if (!version) {
          logError('Rollback requires a version number');
          process.exit(1);
        }
        await rollbackMigration(client, version);
        break;

      default:
        log('Usage:', colors.bright);
        log('  node migrate.js status                    - Show migration status');
        log('  node migrate.js migrate [--dry-run]       - Run pending migrations');
        log('  node migrate.js migrate --target <version> - Migrate to specific version');
        log('  node migrate.js rollback <version>        - Rollback specific migration');
        log('');
        log('Examples:', colors.bright);
        log('  node migrate.js status');
        log('  node migrate.js migrate --dry-run');
        log('  node migrate.js migrate --target 002');
        log('  node migrate.js rollback 003');
        break;
    }

  } catch (error) {
    logError(error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  ensureMigrationsTable,
  getMigrationFiles,
  getExecutedMigrations,
  runMigrations,
  rollbackMigration,
  showMigrationStatus,
};