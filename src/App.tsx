import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import { ProtectedRoute } from './components/protected-route'
import { ErrorBoundary } from './components/error-boundary'
import { AuthErrorBoundary } from './components/auth-error-boundary'
import { ToastProvider } from './components/toast'
import { NetworkErrorHandler } from './components/network-error-handler'
import { SessionExpiryWarning } from './components/session-expiry-warning'
import { LoginPage } from './pages/login'
import { SignUpPage } from './pages/sign-up'
import { ProfilePage } from './pages/profile'
import { DashboardPage } from './pages/DashboardPage'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <AuthProvider>
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
                    
                    {/* Default Route - Redirect to dashboard for authenticated users, login for others */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* Catch-all Route - Redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </AuthErrorBoundary>
            </NetworkErrorHandler>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App