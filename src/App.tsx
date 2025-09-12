import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/login'
import SignUpPage from './pages/sign-up'
import DashboardPage from './pages/DashboardPage'
import ResultsPage from './pages/ResultsPage'
import ProtectedRoute from './components/protected-route'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analysis/:ticker" 
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App