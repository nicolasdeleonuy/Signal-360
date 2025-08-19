# Authentication System Test Suite

This directory contains comprehensive tests for the Signal-360 authentication system. The test suite is organized into different categories to ensure complete coverage of all authentication functionality.

## Test Categories

### 1. Unit Tests
Located in component/utility `__tests__` directories.

**Coverage:**
- Authentication Context (`src/contexts/__tests__/`)
- Protected Routes (`src/components/__tests__/protected-route.test.tsx`)
- Form Components (`src/pages/__tests__/`)
- Validation Utilities (`src/utils/__tests__/`)
- Session Management (`src/utils/__tests__/session-manager.test.ts`)
- UI Components (Error Boundary, Toast, Loading Spinner)

**Purpose:** Test individual components and utilities in isolation.

### 2. Integration Tests
Files ending with `-integration.test.tsx`.

**Coverage:**
- Authentication flow integration
- Route protection integration
- Session management integration
- Error handling integration
- Cross-component communication

**Purpose:** Test how different parts of the system work together.

### 3. End-to-End Tests
`authentication-e2e.test.tsx`

**Coverage:**
- Complete user registration flow
- Complete user login flow
- Protected route access control
- Session persistence across page loads
- Complete logout flow
- Error handling and recovery

**Purpose:** Test complete user workflows from start to finish.

### 4. Performance Tests
`authentication-performance.test.tsx`

**Coverage:**
- Initial load performance
- Form submission performance
- Route navigation performance
- Memory usage and cleanup
- Concurrent operations
- Large data handling
- Error recovery performance

**Purpose:** Ensure the authentication system performs well under various conditions.

### 5. Security Tests
`authentication-security.test.tsx`

**Coverage:**
- Input validation security
- Session security
- Route protection security
- Error information disclosure prevention
- CSRF protection
- Session hijacking prevention
- Data sanitization

**Purpose:** Validate security aspects of the authentication system.

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# Security tests only
npm run test:security

# All tests with verbose output
npm run test:all
```

### Watch Mode
```bash
npm run test:watch
```

## Test Coverage Goals

The test suite aims for:
- **80%+ line coverage**
- **80%+ branch coverage**
- **80%+ function coverage**
- **80%+ statement coverage**

## Test Structure

Each test file follows a consistent structure:

```typescript
describe('Component/Feature Name', () => {
  beforeEach(() => {
    // Setup mocks and reset state
  })

  afterEach(() => {
    // Cleanup
  })

  describe('Feature Category', () => {
    it('should do something specific', () => {
      // Test implementation
    })
  })
})
```

## Mocking Strategy

### Supabase
All Supabase calls are mocked to ensure tests run independently of external services:

```typescript
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      // ... other methods
    },
  },
}))
```

### localStorage
localStorage is mocked to test session persistence:

```typescript
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})
```

### Timers
Timers are mocked for session management tests:

```typescript
jest.useFakeTimers()
// ... test code
jest.useRealTimers()
```

## Test Data

### Mock User
```typescript
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  created_at: '2023-01-15T10:30:00Z',
  updated_at: '2023-01-15T10:30:00Z',
  last_sign_in_at: '2023-12-01T14:20:00Z',
}
```

### Mock Session
```typescript
const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
}
```

## Test Utilities

### Rendering Helper
```typescript
function renderWithRouter(component, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  )
}
```

### User Event Setup
```typescript
const user = userEvent.setup()
// Use user.click(), user.type(), etc.
```

## Continuous Integration

Tests are designed to run in CI environments:
- No external dependencies
- Deterministic results
- Proper cleanup
- Reasonable timeouts

## Debugging Tests

### Running Single Test
```bash
npm test -- --testNamePattern="specific test name"
```

### Debug Mode
```bash
npm test -- --verbose --no-coverage
```

### Watch Specific File
```bash
npm test -- --watch src/components/__tests__/protected-route.test.tsx
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Follow the AAA pattern
4. **Mock External Dependencies**: Don't rely on external services
5. **Test Edge Cases**: Include error conditions and boundary cases
6. **Performance Considerations**: Keep tests fast and efficient
7. **Cleanup**: Always clean up after tests

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools
- Console output shows coverage summary

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Maintain or improve coverage percentages
4. Add integration tests for new workflows
5. Update this documentation if needed