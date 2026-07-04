import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { MyOrganization, listMyOrganizations } from '../../services/users-api';
import { getActiveOrganizationId, getSession, setActiveOrganizationId } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

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
    return <p className="p-7 text-text-2">Cargando organizaciones…</p>;
  }

  return (
    <div className="max-w-[640px] p-7">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">Mis organizaciones</h1>
        <Button variant="primary" onClick={() => navigate('/organizations/new')}>
          Crear organización
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 font-semibold text-red-text">
          {error}
        </p>
      )}
      <Card className="overflow-hidden">
        {organizations.map((org) => (
          <div key={org.id} className="flex items-center gap-3.5 border-b border-border px-5 py-4 last:border-b-0">
            <Avatar initials={org.name.slice(0, 1).toUpperCase()} tone="purple" size="md" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{org.name}</div>
              <div className="text-[11px] font-semibold text-text-3">
                {org.role} · {org.plan}
              </div>
            </div>
            {org.id === activeOrganizationId ? (
              <Badge tone="green">Activa</Badge>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => handleSwitch(org.id)}>
                Cambiar a esta
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
