import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Role, deleteCustomRole, listRoles } from '../../services/roles-api';
import { getSession } from '../../services/session';

export function RolesList() {
  const { organizationId } = useParams<{ organizationId: string }>();
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
  }, [organizationId, session]);

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
    return <p>Cargando roles…</p>;
  }

  return (
    <main>
      <h1>Roles</h1>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link to={`/organizations/${organizationId}/roles/new`}>Crear rol personalizado</Link>
      </p>

      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            {role.name} {role.isDefault ? '(por defecto)' : '(personalizado)'} — {role.permissions.length} permisos
            {!role.isDefault && (
              <>
                {' '}
                <Link to={`/organizations/${organizationId}/roles/${role.id}/edit`}>Editar</Link>{' '}
                <button type="button" onClick={() => handleDelete(role.id)}>
                  Eliminar
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
