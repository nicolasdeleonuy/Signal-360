import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/login'
import SignUpPage from './pages/sign-up'
import DashboardPage from './pages/DashboardPage'
import ResultsPage from './pages/ResultsPage'
import RealityCheckPage from './pages/RealityCheckPage'
import ProtectedRoute from './components/protected-route'
import { MainLayout } from './components/layout/MainLayout'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analysis/:ticker" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <ResultsPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reality-check" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <RealityCheckPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App