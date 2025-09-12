import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { mockCreateAnalysisService } from './mocks/analysisServiceMock';

// Global mock for react-router-dom to make MemoryRouter and other components available
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

// Global mock for Supabase client to provide comprehensive authentication API
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    // Add other Supabase methods if needed by tests
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Global mock for analysis service to prevent live API calls during tests
vi.mock('../services/analysisService', () => ({
  createAnalysisService: mockCreateAnalysisService,
  // Re-export types for test usage
  ...vi.importActual('../services/analysisService')
}));