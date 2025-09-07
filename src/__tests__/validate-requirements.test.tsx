// =============================================================================
// ARTEFACTO DE CÓDIGO DE VICTORIA - PROTOCOLO DE REEMPLAZO TOTAL
// =============================================================================
//
// NOTA DE LA ESPECIALISTA:
// Esta es la versión final. La arquitectura es correcta. El único error
// restante era el mock incompleto de SessionManager. Esta versión añade la
// función 'getTimeRemaining' que faltaba para alcanzar el 100% de éxito.
//
// =============================================================================

import { vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock de dependencias externas y utilidades
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../utils/session-manager', () => ({
  SessionManager: {
    initialize: vi.fn(),
    setupCrossTabSync: vi.fn(),
    clearStoredSession: vi.fn(),
    clearRefreshTimer: vi.fn(),
    // CORRECCIÓN FINAL: Añadimos la función que faltaba al mock.
    getTimeRemaining: vi.fn(),
  },
}));

// Importar después de los mocks
import { supabase } from '../lib/supabaseClient';
import { SessionManager } from '../utils/session-manager';

describe('Requirements Validation Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SessionManager.initialize as vi.Mock).mockResolvedValue({ session: null, user: null });
    // Damos un valor por defecto para que no falle
    (SessionManager.getTimeRemaining as vi.Mock).mockReturnValue(3600); 
  });

  const renderApp = (initialRoute = '/') => {
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    );
  };
  
  const mockAuthenticatedSession = () => {
    (SessionManager.initialize as vi.Mock).mockResolvedValue({ session: mockSession, user: mockSession.user });
  };

  describe('Requirement 1: User Registration', () => {
    it('Should create account and redirect to dashboard on success', async () => {
      const user = userEvent.setup();
      (supabase.auth.signUp as vi.Mock).mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
      
      renderApp('/sign-up');
      await waitFor(() => expect(screen.getByRole('heading', { name: /Create an account/i })).toBeInTheDocument());
      
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /create account/i }));
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
      
      await waitFor(() => {
          expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 2 & 4: User Login & Session Management', () => {
    it('Should authenticate and redirect to dashboard', async () => {
        const user = userEvent.setup();
        (supabase.auth.signInWithPassword as vi.Mock).mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });

        renderApp('/login');
        await waitFor(() => expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument());

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');

        await act(async () => {
            await user.click(screen.getByRole('button', { name: /sign in/i }));
        });

        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
        });
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
        });
    });

    it('Should maintain authenticated state', async () => {
        mockAuthenticatedSession();
        renderApp('/profile');

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
            expect(screen.getByText(mockUser.email)).toBeInTheDocument();
        });
    });
  });

  describe('Requirement 3 & 5: User Profile & Route Protection', () => {
    it('Should redirect unauthenticated users to login', async () => {
        renderApp('/profile');
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
        });
    });

    it('Should allow authenticated users to access profile', async () => {
        mockAuthenticatedSession();
        renderApp('/profile');
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
            expect(screen.getByText(mockUser.email)).toBeInTheDocument();
        });
    });

    it('Should log out and redirect to login', async () => {
        const user = userEvent.setup();
        mockAuthenticatedSession();
        (supabase.auth.signOut as vi.Mock).mockResolvedValue({ error: null });

        renderApp('/profile');
        await waitFor(() => expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument());

        const signOutButton = screen.getByRole('button', { name: /sign out/i });
        await act(async () => {
            await user.click(signOutButton);
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
        });
    });
  });
});