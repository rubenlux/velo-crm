import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Membership, listMembers } from '../../services/organizations-api';
import { Role, assignRole, grantPermission, listRoles, revokePermission, revokeRole } from '../../services/roles-api';
import { getSession } from '../../services/session';

export function AssignRoles() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [members, setMembers] = useState<Membership[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permission, setPermission] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) {
      return;
    }
    setLoading(true);
    try {
      const [membersList, rolesList] = await Promise.all([
        listMembers(session.accessToken, organizationId),
        listRoles(session.accessToken, organizationId),
      ]);
      setMembers(membersList);
      setRoles(rolesList);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar roles y miembros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session]);

  async function withFeedback(action: () => Promise<void>) {
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);
    try {
      await action();
      setStatus('Acción completada.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo completar la acción.');
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando roles y miembros…</p>;
  }

  return (
    <main>
      <h1>Asignar roles y permisos</h1>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      <label>
        Miembro
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value="">Seleccionar…</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.userId} ({member.role})
            </option>
          ))}
        </select>
      </label>

      <label>
        Rol adicional
        <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
          <option value="">Seleccionar…</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
              {role.organizationId ? ' (personalizado)' : ''}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={!selectedUserId || !selectedRoleId}
        onClick={() =>
          withFeedback(() => assignRole(session.accessToken, organizationId!, selectedUserId, selectedRoleId))
        }
      >
        Asignar rol
      </button>
      <button
        type="button"
        disabled={!selectedUserId || !selectedRoleId}
        onClick={() =>
          withFeedback(() => revokeRole(session.accessToken, organizationId!, selectedUserId, selectedRoleId))
        }
      >
        Revocar rol
      </button>

      <label>
        Permiso directo (recurso.acción)
        <input value={permission} onChange={(e) => setPermission(e.target.value)} placeholder="lead.create" />
      </label>

      <button
        type="button"
        disabled={!selectedUserId || !permission}
        onClick={() =>
          withFeedback(() => grantPermission(session.accessToken, organizationId!, selectedUserId, permission))
        }
      >
        Otorgar permiso
      </button>
      <button
        type="button"
        disabled={!selectedUserId || !permission}
        onClick={() =>
          withFeedback(() => revokePermission(session.accessToken, organizationId!, selectedUserId, permission))
        }
      >
        Revocar permiso
      </button>
    </main>
  );
}
