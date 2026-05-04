import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AuthGuard from './components/AuthGuard'
import Landing from './pages/Landing'
import Analyse from './pages/Analyse'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Login from './pages/Login'
import Register from './pages/Register'
import Pricing from './pages/Pricing'

function Protected({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app" element={<Protected><Analyse /></Protected>} />
          <Route path="/historique" element={<Protected><History /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/pricing" element={<Protected><Pricing /></Protected>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
