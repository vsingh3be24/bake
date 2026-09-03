import { Navigate, useLocation } from 'react-router-dom';
import { useOwnerStore } from '../../store/ownerStore.js';

export function OwnerProtectedRoute({ children }) {
  const owner = useOwnerStore((s) => s.owner);
  const status = useOwnerStore((s) => s.status);
  const location = useLocation();

  if (status !== 'ready') return null; // brief flash while fetchMe() resolves

  if (!owner) {
    return <Navigate to="/owner/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
