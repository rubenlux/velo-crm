import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Role, deleteCustomRole, listRoles } from '../../services/roles-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../lib/icons';

export function RolesList() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) {
      return;
    }
    setLoading(true);
    try {
      setRoles(await listRoles(session.accessToken, organizationId));
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los roles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  async function handleDelete(roleId: string) {
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    try {
      await deleteCustomRole(session.accessToken, organizationId, roleId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo eliminar el rol.');
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="text-[13px] text-text-2">Cargando roles…</p>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="text-[15px] font-extrabold">Roles</div>
        <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} />} onClick={() => navigate(`/organizations/${organizationId}/roles/new`)}>
          Crear rol personalizado
        </Button>
      </div>
      {error && (
        <p role="alert" className="px-5 py-3 font-semibold text-red-text">
          {error}
        </p>
      )}
      {roles.map((role) => (
        <div key={role.id} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">{role.name}</div>
            <div className="text-[11px] font-semibold text-text-3">{role.permissions.length} permisos</div>
          </div>
          <Badge tone={role.isDefault ? 'neutral' : 'blue'}>{role.isDefault ? 'Por defecto' : 'Personalizado'}</Badge>
          {!role.isDefault && (
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => navigate(`/organizations/${organizationId}/roles/${role.id}/edit`)}>
                Editar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleDelete(role.id)}>
                Eliminar
              </Button>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
