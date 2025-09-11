import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/login'
import SignUpPage from './pages/sign-up'
import DashboardPage from './pages/DashboardPage'
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
    </Routes>
  )
}

export default App