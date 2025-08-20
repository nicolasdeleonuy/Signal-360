# Design Document

## Overview

This design outlines a systematic approach to eliminate all 74 TypeScript errors in the Signal-360 codebase. The errors fall into several categories that can be addressed with specific patterns and solutions. The approach prioritizes maintaining existing functionality while improving type safety and code quality.

## Architecture

### Error Classification System

Based on the TypeScript compiler output, errors are categorized as follows:

1. **Unused Declarations (TS6133)** - 25 errors
   - Unused React imports in test files
   - Unused variables and constants
   
2. **Implicit Any Types (TS7006)** - 8 errors
   - Callback parameters without explicit types
   - Mock implementation parameters
   
3. **Property Access Errors (TS2339)** - 15 errors
   - Missing mock properties on test objects
   - Incorrect property access patterns
   
4. **Type Assignment Errors (TS2322)** - 7 errors
   - Null assignments to non-nullable types
   - Promise resolve function type mismatches
   
5. **Argument Type Errors (TS2345)** - 2 errors
   - Incorrect parameter types in function calls
   
6. **Access Modifier Errors (TS2445)** - 1 error
   - Protected property access violation

### Solution Strategy

The design follows a phased approach:

1. **Phase 1: Cleanup Unused Code** - Remove unused imports and variables
2. **Phase 2: Fix Type Annotations** - Add explicit types for parameters
3. **Phase 3: Resolve Mock Issues** - Fix test mock implementations
4. **Phase 4: Handle Type Assignments** - Fix null/undefined handling
5. **Phase 5: Validation** - Ensure zero errors and no regressions

## Components and Interfaces

### Mock Type Definitions

Create proper TypeScript interfaces for mock objects used in tests:

```typescript
interface MockSupabaseAuth {
  getSession: jest.MockedFunction<() => Promise<AuthResponse>>;
  onAuthStateChange: jest.MockedFunction<(callback: AuthCallback) => Subscription>;
  signUp: jest.MockedFunction<(credentials: SignUpCredentials) => Promise<AuthResponse>>;
  signInWithPassword: jest.MockedFunction<(credentials: SignInCredentials) => Promise<AuthResponse>>;
  signOut: jest.MockedFunction<() => Promise<{ error: AuthError | null }>>;
  refreshSession: jest.MockedFunction<(session?: RefreshSession) => Promise<AuthResponse>>;
}

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>;
```

### Type-Safe Environment Access

Handle `import.meta.env` and other environment variable access:

```typescript
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Validation Service Interface

Define missing methods in ValidationService:

```typescript
interface ValidationService {
  isValidApiKeyFormat(key: string): boolean;
  // ... other existing methods
}
```

## Data Models

### Error Resolution Patterns

#### Pattern 1: Unused Import Removal
```typescript
// Before
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// After (when React is not used)
import { render, screen } from '@testing-library/react'
```

#### Pattern 2: Explicit Callback Types
```typescript
// Before
supabase.auth.onAuthStateChange.mockImplementation((callback) => {

// After
supabase.auth.onAuthStateChange.mockImplementation((callback: AuthCallback) => {
```

#### Pattern 3: Optional Property Handling
```typescript
// Before
google_api_key: null,

// After
google_api_key: undefined,
```

#### Pattern 4: Promise Resolve Type Fixes
```typescript
// Before
let resolveSignIn: () => void
resolveSignIn = resolve

// After
let resolveSignIn: (value: unknown) => void
resolveSignIn = resolve
```

## Error Handling

### Compilation Error Prevention

1. **Incremental Validation**: After each batch of fixes, run TypeScript compiler to ensure no new errors are introduced
2. **Test Preservation**: Maintain all existing test functionality while fixing type errors
3. **Rollback Strategy**: If fixes break functionality, revert and use alternative approaches

### Mock Object Error Handling

1. **Type-Safe Mocks**: Use proper Jest mock types with TypeScript generics
2. **Property Existence**: Ensure all accessed properties exist on mock objects
3. **Method Signatures**: Match original method signatures in mock implementations

## Testing Strategy

### Validation Approach

1. **Pre-Fix Baseline**: Document current test pass/fail status
2. **Incremental Testing**: Run tests after each phase of fixes
3. **Type Checking**: Use `npx tsc --noEmit --project .` as the primary validation
4. **Regression Prevention**: Ensure all existing tests continue to pass

### Test Categories to Validate

1. **Unit Tests**: Component and service tests
2. **Integration Tests**: Authentication and routing flows
3. **End-to-End Tests**: Complete user workflows
4. **Performance Tests**: Load and stress testing
5. **Security Tests**: Authentication and data protection

### Error-Specific Testing

1. **Mock Functionality**: Verify mock objects work correctly after type fixes
2. **Type Safety**: Confirm TypeScript provides proper IntelliSense
3. **Runtime Behavior**: Ensure no runtime errors are introduced
4. **Build Process**: Verify successful compilation and bundling

## Implementation Phases

### Phase 1: Unused Code Cleanup (25 errors)
- Remove unused React imports from test files
- Remove unused variables and constants
- Clean up unused function parameters

### Phase 2: Type Annotation Fixes (8 errors)
- Add explicit types to callback parameters
- Fix mock implementation parameter types
- Ensure all function parameters have proper types

### Phase 3: Mock Object Resolution (15 errors)
- Create proper mock interfaces
- Fix missing mock properties
- Ensure mock methods match original signatures

### Phase 4: Type Assignment Corrections (7 errors)
- Replace null with undefined where appropriate
- Fix Promise resolve function types
- Handle optional property assignments

### Phase 5: Miscellaneous Fixes (3 errors)
- Fix function argument type mismatches
- Resolve protected property access issues
- Address any remaining edge cases

### Phase 6: Final Validation
- Run complete TypeScript compilation check
- Execute full test suite
- Verify zero TypeScript errors
- Confirm no functionality regressions