# Implementation Plan

- [x] 1. Fix sign-up.test.tsx selector issues
  - Replace ambiguous text selectors with role-based selectors for "Create Account"
  - Use `getByRole('heading', { name: 'Create Account' })` for page title
  - Use `getByRole('button', { name: 'Create Account' })` for form button
  - Investigate and fix missing "Please enter a valid email address" error message
  - Run tests to verify all 12 tests pass
  - _Requirements: 1.1, 2.1, 2.2, 4.3_

- [x] 2. Fix auth-pages-integration.test.tsx selector issues
  - Replace `getByText('Sign In')` with `getByRole('heading', { name: 'Sign In' })`
  - Replace `getByText('Create Account')` with `getByRole('heading', { name: 'Create Account' })`
  - Ensure button selectors use `getByRole('button', { name: '...' })`
  - Run tests to verify all 5 tests pass
  - _Requirements: 1.1, 2.1, 2.2, 4.3_

- [x] 3. Fix login-integration.test.tsx selector issues
  - Replace ambiguous "Sign In" text selectors with role-based selectors
  - Use `getByRole('heading', { name: 'Sign In' })` for page titles
  - Use `getByRole('button', { name: 'Sign In' })` for form buttons
  - Improve async handling and mock setup if needed
  - Run tests to verify all 7 tests pass
  - _Requirements: 1.1, 2.1, 2.2, 4.1, 4.2_

- [ ] 4. Fix profile-protected-route.test.tsx selector and timing issues
  - Replace "Sign In" text selectors with role-based selectors
  - Improve async handling for route transitions and auth state changes
  - Add proper waitFor patterns for complex authentication flows
  - Fix mock callback handling for auth state changes
  - Run tests to verify all 8 tests pass
  - _Requirements: 1.1, 2.1, 2.2, 4.1, 4.2_

- [ ] 5. Validate component implementations
  - Check sign-up component for missing validation error messages
  - Verify all components have proper accessibility attributes
  - Ensure error messages match test expectations
  - Add missing validation messages if required
  - _Requirements: 2.1, 2.3, 3.2_

- [ ] 6. Run comprehensive test validation
  - Execute all migrated page test files to confirm zero failures
  - Run complete test suite to check for regressions
  - Verify test coverage is maintained or improved
  - Document any remaining issues or limitations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2_

- [ ] 7. Update test patterns and documentation
  - Document the improved selector patterns for future reference
  - Update any test utilities or helpers to use semantic selectors
  - Add comments explaining the role-based selector approach
  - Create guidelines for avoiding similar issues in future tests
  - _Requirements: 4.1, 4.3, 5.3, 5.4_