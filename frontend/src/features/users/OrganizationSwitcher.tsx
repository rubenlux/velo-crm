import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { MyOrganization, listMyOrganizations } from '../../services/users-api';
import { getActiveOrganizationId, getSession, setActiveOrganizationId } from '../../services/session';

export function OrganizationSwitcher() {
  const navigate = useNavigate();
  const session = getSession();
  const activeOrganizationId = getActiveOrganizationId();

  const [organizations, setOrganizations] = useState<MyOrganization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }
    listMyOrganizations(session.accessToken)
      .then(setOrganizations)
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar las organizaciones.'))
      .finally(() => setLoading(false));
  }, [session]);

  function handleSwitch(organizationId: string) {
    // Switching context is purely client-side (spec 006 research.md #2): the next
    // request to that Organization simply carries this header.
    setActiveOrganizationId(organizationId);
    navigate(`/organizations/${organizationId}`);
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando organizaciones…</p>;
  }

  return (
    <main>
      <h1>Mis organizaciones</h1>
      {error && <p role="alert">{error}</p>}
      <ul>
        {organizations.map((org) => (
          <li key={org.id}>
            {org.name} — {org.role} ({org.plan})
            {org.id === activeOrganizationId ? (
              ' (activa)'
            ) : (
              <button type="button" onClick={() => handleSwitch(org.id)}>
                Cambiar a esta organización
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
