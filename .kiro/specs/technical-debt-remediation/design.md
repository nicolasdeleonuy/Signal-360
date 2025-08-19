# Design Document

## Overview

This design addresses the systematic remediation of 525+ TypeScript errors in the Signal-360 project. The errors fall into several categories that require different approaches:

1. **Jest/Vitest Configuration Issues** (majority of errors): Test files using Jest syntax but project configured for Vitest
2. **Supabase Type Issues**: Missing or incorrect type definitions for Supabase client methods
3. **Import/Export Issues**: Unused imports and incorrect module references
4. **Environment Variable Types**: Missing Vite environment variable type definitions
5. **Class Property Issues**: Static class properties not properly defined

The remediation will be executed in phases to ensure systematic resolution and prevent regression.

## Architecture

### Phase-Based Remediation Strategy

The remediation follows a dependency-first approach where configuration issues are resolved before code-specific issues:

```
Phase 1: Configuration Foundation
├── TypeScript Configuration
├── Testing Framework Alignment  
└── Environment Types

Phase 2: Type System Corrections
├── Supabase Client Types
├── Import/Export Cleanup
└── Class Structure Fixes

Phase 3: Validation & Optimization
├── Build Verification
├── Test Execution
└── Performance Validation
```

## Components and Interfaces

### 1. Configuration Management Component

**Purpose**: Ensure TypeScript and testing configurations are properly aligned

**Key Files**:
- `tsconfig.json` - Main TypeScript configuration
- `vite.config.ts` - Vite configuration with test setup
- `package.json` - Dependencies and scripts

**Configuration Requirements**:
```typescript
// tsconfig.json additions needed
{
  "compilerOptions": {
    "esModuleInterop": true,        // Critical for recharts/react imports
    "allowSyntheticDefaultImports": true,
    "types": ["vitest/globals", "@testing-library/jest-dom", "vite/client"]
  }
}
```

### 2. Testing Framework Alignment Component

**Purpose**: Resolve Jest vs Vitest configuration mismatch

**Current Issue**: Test files use Jest syntax (`jest.fn()`, `jest.mock()`) but project uses Vitest

**Resolution Strategy**:
- Option A: Migrate all test files to Vitest syntax
- Option B: Configure Vitest to provide Jest-compatible globals
- **Recommended**: Option B for minimal disruption

**Implementation**:
```typescript
// vite.config.ts test configuration
test: {
  globals: true,           // Enables jest-like globals
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}
```

### 3. Type Definition Enhancement Component

**Purpose**: Add missing type definitions for external libraries and environment

**Key Areas**:
- Vite environment variables (`import.meta.env`)
- Supabase client method types
- Jest/Vitest global function types

**Type Augmentation Strategy**:
```typescript
// src/types/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 4. Supabase Client Type Resolution Component

**Purpose**: Fix PostgrestQueryBuilder type issues in query-builder.ts

**Current Issue**: Methods like `eq`, `neq`, `gt`, etc. not recognized on PostgrestQueryBuilder type

**Resolution**: Update Supabase client usage to use proper type assertions or update to latest @supabase/supabase-js version

### 5. Code Quality Enhancement Component

**Purpose**: Remove unused imports and fix class property definitions

**Key Actions**:
- Remove unused React imports (React 17+ JSX transform)
- Fix static class property definitions in SessionManager
- Clean up unused variables and parameters

## Data Models

### Error Classification Model

```typescript
interface TypeScriptError {
  file: string
  line: number
  column: number
  code: string
  category: ErrorCategory
  priority: Priority
  description: string
}

enum ErrorCategory {
  CONFIGURATION = 'configuration',
  JEST_VITEST = 'jest_vitest', 
  SUPABASE_TYPES = 'supabase_types',
  IMPORTS = 'imports',
  ENVIRONMENT = 'environment',
  CLASS_PROPERTIES = 'class_properties'
}

enum Priority {
  CRITICAL = 1,    // Blocks build completely
  HIGH = 2,        // Affects functionality
  MEDIUM = 3,      // Code quality issues
  LOW = 4          // Cosmetic issues
}
```

### Remediation Progress Model

```typescript
interface RemediationProgress {
  phase: RemediationPhase
  totalErrors: number
  resolvedErrors: number
  remainingErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  lastBuildStatus: 'success' | 'failure'
  timestamp: Date
}
```

## Error Handling

### Build Failure Recovery

1. **Incremental Validation**: After each fix batch, run `npx tsc --noEmit` to validate changes
2. **Rollback Strategy**: Maintain git commits for each phase to enable rollback if needed
3. **Error Isolation**: Fix errors in isolated batches to prevent cascading issues

### Configuration Validation

1. **TypeScript Config Validation**: Ensure all required compiler options are present
2. **Dependency Verification**: Verify all required type packages are installed
3. **Build Process Verification**: Confirm `npm run build` succeeds after each phase

## Testing Strategy

### Phase Testing Approach

1. **Configuration Phase Testing**:
   - Verify TypeScript compilation without errors
   - Confirm Vite build process succeeds
   - Validate test runner configuration

2. **Type Resolution Testing**:
   - Test Supabase client method calls
   - Verify environment variable access
   - Confirm import/export resolution

3. **Integration Testing**:
   - Run full test suite to ensure no regression
   - Verify all components still function correctly
   - Confirm build artifacts are generated properly

### Validation Commands

```bash
# TypeScript validation
npx tsc --noEmit

# Build validation  
npm run build

# Test validation
npm run test

# Lint validation
npm run lint
```

## Implementation Phases

### Phase 1: Configuration Foundation (Priority: CRITICAL)
- Update tsconfig.json with missing compiler options
- Add Vite environment type definitions
- Configure Vitest for Jest compatibility
- Install missing type dependencies

### Phase 2: Type System Corrections (Priority: HIGH)
- Fix Supabase client type issues
- Remove unused imports (React, fireEvent, etc.)
- Fix class property definitions in SessionManager
- Resolve environment variable type access

### Phase 3: Code Quality Improvements (Priority: MEDIUM)
- Clean up unused variables and parameters
- Fix implicit any types in callback functions
- Resolve function signature mismatches
- Optimize import statements

### Phase 4: Validation & Optimization (Priority: LOW)
- Verify zero TypeScript errors
- Optimize build performance
- Document configuration decisions
- Create maintenance guidelines

## Success Criteria

1. **Zero TypeScript Errors**: `npx tsc --noEmit` completes without errors
2. **Successful Build**: `npm run build` completes successfully
3. **Test Compatibility**: All existing tests continue to pass
4. **AI Agent Validation**: Build process reliable enough for AI agent validation
5. **Maintainable Configuration**: Clear documentation for future maintenance