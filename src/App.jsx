import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { ChatProvider } from './context/ChatContext.jsx'
import { PresenceProvider } from './context/PresenceContext.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import SignupPage from './components/auth/SignupPage.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import AdminPage from './components/admin/AdminPage.jsx'

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="full-center">
        <div className="spinner" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return children
}

function EmployeeOnly({ children }) {
  const { isEmployee } = useAuth()
  if (!isEmployee) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={session ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <ChatProvider>
              <PresenceProvider>
                <AppLayout />
              </PresenceProvider>
            </ChatProvider>
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <EmployeeOnly>
              <AdminPage />
            </EmployeeOnly>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
