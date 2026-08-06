import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { ChatProvider } from './context/ChatContext.jsx'
import { PresenceProvider } from './context/PresenceContext.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import WelcomePage from './components/auth/WelcomePage.jsx'
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
  // Must reset password on first sign-in (admin-invited user with temp creds).
  const pathname = window.location.pathname
  if (
    window.location.search.includes('type=recovery') === false &&
    pathname !== '/welcome'
  ) {
    // profile is fetched asynchronously; the protected route will redirect once
    // the flag loads. WelcomePage itself handles the recovery link.
  }
  return children
}

function EmployeeOnly({ children }) {
  const { isEmployee } = useAuth()
  if (!isEmployee) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session, loading, profile } = useAuth()

  // First-login redirect to /welcome when must_reset_password is true.
  if (
    !loading &&
    session &&
    profile?.must_reset_password &&
    window.location.pathname !== '/welcome'
  ) {
    return <Navigate to="/welcome" replace />
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/welcome"
        element={session ? <WelcomePage /> : <WelcomePage />}
      />
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