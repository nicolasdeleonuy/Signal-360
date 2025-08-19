#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

// Integration test runner for Signal-360 Edge Functions
// Orchestrates execution of all integration test suites with reporting

import { parse } from 'https://deno.land/std@0.168.0/flags/mod.ts';

/**
 * Test suite configuration
 */
interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout: number; // in milliseconds
  critical: boolean; // if true, failure stops execution
}

/**
 * Test execution result
 */
interface TestResult {
  suite: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
}

/**
 * Test runner configuration
 */
const TEST_SUITES: TestSuite[] = [
  {
    name: 'Complete Workflow Integration',
    file: 'integration.test.ts',
    description: 'End-to-end analysis workflow testing',
    timeout: 60000, // 1 minute
    critical: true
  },
  {
    name: 'Workflow Component Integration',
    file: 'workflow-integration.test.ts',
    description: 'Analysis module and synthesis engine integration',
    timeout: 45000, // 45 seconds
    critical: true
  },
  {
    name: 'Performance and Load Testing',
    file: 'performance-integration.test.ts',
    description: 'System performance under various load conditions',
    timeout: 120000, // 2 minutes
    critical: false
  }
];

/**
 * Test runner class
 */
class IntegrationTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private verbose: boolean = false;
  private coverage: boolean = false;
  private coverageDir: string = 'coverage';

  constructor(options: { verbose?: boolean; coverage?: boolean; coverageDir?: string } = {}) {
    this.verbose = options.verbose || false;
    this.coverage = options.coverage || false;
    this.coverageDir = options.coverageDir || 'coverage';
  }

  /**
   * Run all test suites
   */
  async runAll(): Promise<boolean> {
    this.startTime = Date.now();
    
    console.log('🚀 Starting Signal-360 Integration Tests\n');
    
    // Set up test environment
    this.setupEnvironment();
    
    let allPassed = true;
    
    for (const suite of TEST_SUITES) {
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (!result.success) {
        allPassed = false;
        if (suite.critical) {
          console.log(`❌ Critical test suite failed: ${suite.name}`);
          console.log('Stopping execution due to critical failure.\n');
          break;
        }
      }
    }
    
    this.printSummary();
    return allPassed;
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`📋 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    
    const startTime = Date.now();
    
    try {
      const command = this.buildDenoCommand(suite);
      const process = Deno.run({
        cmd: command,
        stdout: 'piped',
        stderr: 'piped'
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
      }, suite.timeout);

      const [status, stdout, stderr] = await Promise.all([
        process.status(),
        process.output(),
        process.stderrOutput()
      ]);

      clearTimeout(timeoutId);
      process.close();

      const duration = Date.now() - startTime;
      const output = new TextDecoder().decode(stdout);
      const errorOutput = new TextDecoder().decode(stderr);

      if (this.verbose) {
        console.log('   Output:', output);
        if (errorOutput) {
          console.log('   Errors:', errorOutput);
        }
      }

      const success = status.success;
      const result: TestResult = {
        suite: suite.name,
        success,
        duration,
        output,
        error: success ? undefined : errorOutput
      };

      if (success) {
        console.log(`   ✅ Passed (${duration}ms)\n`);
      } else {
        console.log(`   ❌ Failed (${duration}ms)`);
        if (!this.verbose && errorOutput) {
          console.log(`   Error: ${errorOutput.split('\n')[0]}`);
        }
        console.log();
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        suite: suite.name,
        success: false,
        duration,
        output: '',
        error: error.message
      };

      console.log(`   ❌ Failed (${duration}ms)`);
      console.log(`   Error: ${error.message}\n`);

      return result;
    }
  }

  /**
   * Build Deno test command
   */
  private buildDenoCommand(suite: TestSuite): string[] {
    const command = ['deno', 'test'];
    
    // Add permissions
    command.push('--allow-env', '--allow-net', '--allow-read');
    
    // Add coverage if requested
    if (this.coverage) {
      command.push(`--coverage=${this.coverageDir}`);
    }
    
    // Add verbose flag if requested
    if (this.verbose) {
      command.push('--verbose');
    }
    
    // Add test file
    command.push(`supabase/functions/_shared/${suite.file}`);
    
    return command;
  }

  /**
   * Set up test environment variables
   */
  private setupEnvironment(): void {
    const envVars = {
      'SUPABASE_URL': 'https://test.supabase.co',
      'SUPABASE_ANON_KEY': 'test-anon-key',
      'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
      'ENCRYPTION_KEY': 'test-encryption-key-with-sufficient-length-for-security',
      'ENVIRONMENT': 'test'
    };

    for (const [key, value] of Object.entries(envVars)) {
      if (!Deno.env.get(key)) {
        Deno.env.set(key, value);
      }
    }

    if (this.verbose) {
      console.log('🔧 Environment variables set for testing\n');
    }
  }

  /**
   * Print test execution summary
   */
  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log('📊 Test Execution Summary');
    console.log('=' .repeat(50));
    console.log(`Total Suites: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log();

    // Detailed results
    console.log('📋 Detailed Results:');
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.suite} (${result.duration}ms)`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error.split('\n')[0]}`);
      }
    }
    console.log();

    // Performance summary
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    const maxDuration = Math.max(...this.results.map(r => r.duration));
    const minDuration = Math.min(...this.results.map(r => r.duration));

    console.log('⚡ Performance Summary:');
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Fastest Suite: ${minDuration}ms`);
    console.log(`Slowest Suite: ${maxDuration}ms`);
    console.log();

    // Final status
    if (failed === 0) {
      console.log('🎉 All integration tests passed!');
    } else {
      console.log(`⚠️  ${failed} test suite(s) failed.`);
    }

    // Coverage report
    if (this.coverage) {
      console.log(`📈 Coverage report generated in: ${this.coverageDir}/`);
    }
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport(): Promise<void> {
    if (!this.coverage) return;

    try {
      const process = Deno.run({
        cmd: ['deno', 'coverage', this.coverageDir, '--lcov'],
        stdout: 'piped'
      });

      const [status, output] = await Promise.all([
        process.status(),
        process.output()
      ]);

      process.close();

      if (status.success) {
        const lcovData = new TextDecoder().decode(output);
        await Deno.writeTextFile(`${this.coverageDir}/lcov.info`, lcovData);
        console.log(`📊 LCOV coverage report: ${this.coverageDir}/lcov.info`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to generate coverage report: ${error.message}`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = parse(Deno.args, {
    boolean: ['help', 'verbose', 'coverage'],
    string: ['coverage-dir'],
    alias: {
      h: 'help',
      v: 'verbose',
      c: 'coverage'
    }
  });

  if (args.help) {
    console.log(`
Signal-360 Integration Test Runner

Usage: deno run --allow-env --allow-net --allow-read run-integration-tests.ts [options]

Options:
  -h, --help           Show this help message
  -v, --verbose        Enable verbose output
  -c, --coverage       Generate code coverage report
  --coverage-dir DIR   Coverage output directory (default: coverage)

Examples:
  # Run all tests
  deno run --allow-env --allow-net --allow-read run-integration-tests.ts

  # Run with verbose output
  deno run --allow-env --allow-net --allow-read run-integration-tests.ts --verbose

  # Run with coverage
  deno run --allow-env --allow-net --allow-read run-integration-tests.ts --coverage
    `);
    return;
  }

  const runner = new IntegrationTestRunner({
    verbose: args.verbose,
    coverage: args.coverage,
    coverageDir: args['coverage-dir'] || 'coverage'
  });

  const success = await runner.runAll();

  if (args.coverage) {
    await runner.generateCoverageReport();
  }

  // Exit with appropriate code
  Deno.exit(success ? 0 : 1);
}

// Run if this is the main module
if (import.meta.main) {
  await main();
}