// Contenido corregido para src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/auth-context';
import { ProtectedRoute } from './components/protected-route';
import { ErrorBoundary } from './components/error-boundary';
import { AuthErrorBoundary } from './components/auth-error-boundary';
import { ToastProvider } from './components/toast';
import { NetworkErrorHandler } from './components/network-error-handler';
import { SessionExpiryWarning } from './components/session-expiry-warning';
import { LoginPage } from './pages/login';
import { SignUpPage } from './pages/sign-up';
import { ProfilePage } from './pages/profile';
import { DashboardPage } from './pages/DashboardPage';

// NOTA: El componente Router (BrowserRouter) se ha quitado de aquí.
// Debe estar en el punto de entrada de la aplicación (main.tsx), no aquí.
// Esto permite que el componente App sea testeado correctamente con MemoryRouter.
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <NetworkErrorHandler>
            <AuthErrorBoundary>
              <div className="App">
                <SessionExpiryWarning />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/sign-up" element={<SignUpPage />} />
                  
                  {/* Protected Routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Default Route */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Catch-all Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </AuthErrorBoundary>
          </NetworkErrorHandler>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;