#!/usr/bin/env node

// Database seeding utility
// Provides flexible seeding for different environments

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  environment: process.env.NODE_ENV || 'development',
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

// Seed data generators
const seedData = {
  // Development profiles
  developmentProfiles: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      encrypted_google_api_key: null,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      encrypted_google_api_key: 'ZGV2X2VuY3J5cHRlZF9rZXk=', // Base64: "dev_encrypted_key"
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      encrypted_google_api_key: 'ZGV2X2VuY3J5cHRlZF9rZXlfMg==', // Base64: "dev_encrypted_key_2"
    },
  ],

  // Test profiles for automated testing
  testProfiles: [
    {
      id: 'test0000-0000-0000-0000-000000000001',
      encrypted_google_api_key: null,
    },
    {
      id: 'test0000-0000-0000-0000-000000000002',
      encrypted_google_api_key: 'dGVzdF9lbmNyeXB0ZWRfa2V5', // Base64: "test_encrypted_key"
    },
  ],

  // Sample analyses for development
  developmentAnalyses: [
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      ticker_symbol: 'AAPL',
      analysis_context: 'investment',
      trading_timeframe: null,
      synthesis_score: 85,
      convergence_factors: [
        {
          category: 'fundamental',
          description: 'Strong revenue growth and market position',
          weight: 8.5,
          metadata: { revenue_growth: 0.15, market_share: 0.23 }
        },
        {
          category: 'technical',
          description: 'Bullish trend with strong support levels',
          weight: 7.0,
          metadata: { trend_strength: 0.8, support_level: 150 }
        }
      ],
      divergence_factors: [
        {
          category: 'technical',
          description: 'Overbought RSI indicating potential pullback',
          weight: 6.0,
          metadata: { rsi_value: 75, overbought_threshold: 70 }
        }
      ],
      full_report: {
        summary: 'Apple demonstrates strong fundamentals with excellent revenue growth and market position. Technical indicators show bullish momentum but RSI suggests caution for short-term entries.',
        fundamental: {
          score: 90,
          factors: ['Revenue growth', 'Market position', 'Brand strength', 'Innovation pipeline'],
          details: {
            revenue_growth: 0.15,
            market_cap: 3000000000000,
            pe_ratio: 28,
            profit_margin: 0.25
          }
        },
        technical: {
          score: 75,
          factors: ['Upward trend', 'Volume confirmation', 'Support levels'],
          details: {
            trend: 'bullish',
            rsi: 75,
            moving_average_50: 155,
            moving_average_200: 145
          }
        },
        esg: {
          score: 80,
          factors: ['Environmental initiatives', 'Supply chain responsibility'],
          details: {
            carbon_neutral_goal: 2030,
            renewable_energy: 0.75
          }
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
          description: 'Bullish breakout above resistance with volume',
          weight: 7.5,
          metadata: { breakout_level: 250, volume_ratio: 1.8 }
        }
      ],
      divergence_factors: [
        {
          category: 'fundamental',
          description: 'High valuation metrics raise concern',
          weight: 8.0,
          metadata: { pe_ratio: 45, price_to_sales: 12 }
        },
        {
          category: 'esg',
          description: 'Regulatory scrutiny and production challenges',
          weight: 6.5,
          metadata: { regulatory_issues: 3, production_delays: 2 }
        }
      ],
      full_report: {
        summary: 'Tesla shows strong technical momentum with breakout patterns, but fundamental valuation concerns and ESG challenges create mixed signals for trading.',
        technical: {
          score: 80,
          factors: ['Breakout pattern', 'Volume surge', 'Momentum indicators'],
          details: {
            breakout_level: 250,
            volume_ratio: 1.8,
            macd: 'bullish_crossover',
            rsi: 68
          }
        },
        fundamental: {
          score: 45,
          factors: ['High valuation', 'Growth potential', 'Execution risk'],
          details: {
            pe_ratio: 45,
            price_to_sales: 12,
            debt_to_equity: 0.3,
            cash_position: 25000000000
          }
        },
        esg: {
          score: 60,
          factors: ['Innovation in clean energy', 'Regulatory challenges'],
          details: {
            regulatory_issues: 3,
            environmental_impact: 'positive',
            labor_practices: 'mixed'
          }
        }
      }
    },
    {
      user_id: '00000000-0000-0000-0000-000000000002',
      ticker_symbol: 'MSFT',
      analysis_context: 'investment',
      trading_timeframe: null,
      synthesis_score: 78,
      convergence_factors: [
        {
          category: 'fundamental',
          description: 'Consistent cloud revenue growth and strong margins',
          weight: 8.0,
          metadata: { cloud_growth: 0.25, operating_margin: 0.35 }
        }
      ],
      divergence_factors: [
        {
          category: 'technical',
          description: 'Near resistance levels with weakening momentum',
          weight: 5.5,
          metadata: { resistance_level: 350, momentum_score: 0.4 }
        }
      ],
      full_report: {
        summary: 'Microsoft presents solid investment fundamentals driven by cloud growth, though technical indicators suggest potential near-term consolidation.',
        fundamental: {
          score: 85,
          factors: ['Cloud dominance', 'Recurring revenue', 'Strong balance sheet'],
          details: {
            cloud_revenue_growth: 0.25,
            operating_margin: 0.35,
            free_cash_flow: 60000000000
          }
        },
        technical: {
          score: 70,
          factors: ['Uptrend intact', 'Near resistance', 'Volume declining'],
          details: {
            trend: 'bullish',
            resistance_level: 350,
            volume_trend: 'declining'
          }
        }
      }
    }
  ],

  // Demo data for presentations
  demoAnalyses: [
    {
      user_id: '00000000-0000-0000-0000-000000000003',
      ticker_symbol: 'NVDA',
      analysis_context: 'investment',
      trading_timeframe: null,
      synthesis_score: 92,
      convergence_factors: [
        {
          category: 'fundamental',
          description: 'AI revolution driving unprecedented demand',
          weight: 9.5,
          metadata: { ai_market_size: 1000000000000, market_share: 0.8 }
        }
      ],
      divergence_factors: [],
      full_report: {
        summary: 'NVIDIA is perfectly positioned for the AI revolution with dominant market share and exceptional growth prospects.',
        fundamental: {
          score: 95,
          factors: ['AI leadership', 'Moat in GPU technology', 'Explosive revenue growth'],
          details: {
            revenue_growth: 2.5,
            ai_revenue_percentage: 0.6,
            r_and_d_investment: 7000000000
          }
        }
      }
    }
  ]
};

async function clearExistingData(client, tables) {
  logStep('CLEAR', 'Clearing existing seed data...');

  try {
    for (const table of tables.reverse()) { // Reverse to handle foreign keys
      const { error } = await client.from(table).delete().neq('id', 'impossible-id');
      if (error) {
        logWarning(`Failed to clear ${table}: ${error.message}`);
      }
    }
    logSuccess('Existing data cleared');
  } catch (error) {
    logError(`Failed to clear data: ${error.message}`);
    throw error;
  }
}

async function seedProfiles(client, profiles, description) {
  logStep('SEED', `Seeding ${description}...`);

  try {
    let created = 0;
    let skipped = 0;

    for (const profile of profiles) {
      const { error } = await client
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (error) {
        logWarning(`Failed to create profile ${profile.id}: ${error.message}`);
        skipped++;
      } else {
        created++;
      }
    }

    logSuccess(`${description}: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  } catch (error) {
    logError(`Failed to seed profiles: ${error.message}`);
    throw error;
  }
}

async function seedAnalyses(client, analyses, description) {
  logStep('SEED', `Seeding ${description}...`);

  try {
    let created = 0;
    let skipped = 0;

    for (const analysis of analyses) {
      const { error } = await client
        .from('analyses')
        .insert(analysis);

      if (error) {
        logWarning(`Failed to create analysis for ${analysis.ticker_symbol}: ${error.message}`);
        skipped++;
      } else {
        created++;
      }
    }

    logSuccess(`${description}: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  } catch (error) {
    logError(`Failed to seed analyses: ${error.message}`);
    throw error;
  }
}

async function seedDevelopment(client, options = {}) {
  const { clear = false } = options;

  log('\n🌱 Seeding Development Data', colors.bright);
  log('===========================\n');

  try {
    if (clear) {
      await clearExistingData(client, ['analyses', 'profiles']);
    }

    const profileResult = await seedProfiles(
      client, 
      seedData.developmentProfiles, 
      'development profiles'
    );

    const analysisResult = await seedAnalyses(
      client, 
      seedData.developmentAnalyses, 
      'development analyses'
    );

    logSuccess(`Development seeding complete: ${profileResult.created + analysisResult.created} records created`);
    return { profiles: profileResult, analyses: analysisResult };

  } catch (error) {
    logError(`Development seeding failed: ${error.message}`);
    throw error;
  }
}

async function seedTesting(client, options = {}) {
  const { clear = false } = options;

  log('\n🧪 Seeding Test Data', colors.bright);
  log('===================\n');

  try {
    if (clear) {
      // Only clear test data
      const { error } = await client
        .from('profiles')
        .delete()
        .like('id', 'test%');
      
      if (error) {
        logWarning(`Failed to clear test profiles: ${error.message}`);
      }
    }

    const profileResult = await seedProfiles(
      client, 
      seedData.testProfiles, 
      'test profiles'
    );

    logSuccess(`Test seeding complete: ${profileResult.created} records created`);
    return { profiles: profileResult };

  } catch (error) {
    logError(`Test seeding failed: ${error.message}`);
    throw error;
  }
}

async function seedDemo(client, options = {}) {
  const { clear = false } = options;

  log('\n🎭 Seeding Demo Data', colors.bright);
  log('===================\n');

  try {
    if (clear) {
      await clearExistingData(client, ['analyses', 'profiles']);
    }

    // Seed all data for comprehensive demo
    const profileResult = await seedProfiles(
      client, 
      seedData.developmentProfiles, 
      'demo profiles'
    );

    const analysisResult = await seedAnalyses(
      client, 
      [...seedData.developmentAnalyses, ...seedData.demoAnalyses], 
      'demo analyses'
    );

    logSuccess(`Demo seeding complete: ${profileResult.created + analysisResult.created} records created`);
    return { profiles: profileResult, analyses: analysisResult };

  } catch (error) {
    logError(`Demo seeding failed: ${error.message}`);
    throw error;
  }
}

async function showSeedStatus(client) {
  logStep('STATUS', 'Checking seed data status...');

  try {
    const { count: profileCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: analysisCount } = await client
      .from('analyses')
      .select('*', { count: 'exact', head: true });

    // Check for specific seed data
    const { data: devProfiles } = await client
      .from('profiles')
      .select('id')
      .like('id', '00000000-%');

    const { data: testProfiles } = await client
      .from('profiles')
      .select('id')
      .like('id', 'test%');

    log('\nSeed Data Status:', colors.bright);
    log('================\n');
    log(`Total Profiles: ${profileCount || 0}`);
    log(`Total Analyses: ${analysisCount || 0}`);
    log(`Development Profiles: ${devProfiles?.length || 0}`);
    log(`Test Profiles: ${testProfiles?.length || 0}`);

  } catch (error) {
    logError(`Failed to check seed status: ${error.message}`);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];
  const options = process.argv.slice(3);
  const clear = options.includes('--clear');

  log('🌱 Signal-360 Database Seeding Tool', colors.bright);
  log('===================================\n');

  try {
    const client = await createSupabaseClient();

    switch (command) {
      case 'dev':
      case 'development':
        await seedDevelopment(client, { clear });
        break;

      case 'test':
      case 'testing':
        await seedTesting(client, { clear });
        break;

      case 'demo':
        await seedDemo(client, { clear });
        break;

      case 'status':
        await showSeedStatus(client);
        break;

      case 'clear':
        await clearExistingData(client, ['analyses', 'profiles']);
        logSuccess('All seed data cleared');
        break;

      default:
        log('Usage:', colors.bright);
        log('  node seed.js dev [--clear]      - Seed development data');
        log('  node seed.js test [--clear]     - Seed test data');
        log('  node seed.js demo [--clear]     - Seed demo data');
        log('  node seed.js status             - Show seed data status');
        log('  node seed.js clear              - Clear all seed data');
        log('');
        log('Options:', colors.bright);
        log('  --clear                         - Clear existing data before seeding');
        log('');
        log('Examples:', colors.bright);
        log('  node seed.js dev');
        log('  node seed.js demo --clear');
        log('  node seed.js status');
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
  seedDevelopment,
  seedTesting,
  seedDemo,
  showSeedStatus,
  clearExistingData,
  seedData,
};