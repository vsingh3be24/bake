import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export function ProtectedRoute({ children }) {
  const customer = useAuthStore((s) => s.customer);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status !== 'ready') return null; // brief flash while fetchMe() resolves

  if (!customer) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
