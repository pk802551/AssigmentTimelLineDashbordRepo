import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './state/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { user, initializing } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!initializing && user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
