import { Navigate } from 'react-router-dom';
import { getActiveOrganizationId } from '../services/session';

export function RootRedirect() {
  const activeOrganizationId = getActiveOrganizationId();
  return <Navigate to={activeOrganizationId ? `/organizations/${activeOrganizationId}` : '/organizations'} replace />;
}
