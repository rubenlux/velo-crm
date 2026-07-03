import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Membership, listMembers } from '../../services/organizations-api';
import { deactivateMember, deleteMember, reactivateMember } from '../../services/users-api';
import { getSession } from '../../services/session';

export function ManageOrgUsers() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [members, setMembers] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId) {
      return;
    }
    setLoading(true);
    try {
      setMembers(await listMembers(session.accessToken, organizationId));
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los miembros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session]);

  async function handleAction(action: 'deactivate' | 'reactivate' | 'delete', userId: string) {
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);

    try {
      if (action === 'deactivate') {
        await deactivateMember(session.accessToken, organizationId, userId);
      } else if (action === 'reactivate') {
        await reactivateMember(session.accessToken, organizationId, userId);
      } else {
        await deleteMember(session.accessToken, organizationId, userId);
      }
      setStatus('Acción completada.');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo completar la acción.');
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando miembros…</p>;
  }

  return (
    <main>
      <h1>Administrar usuarios</h1>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      <ul>
        {members.map((member) => (
          <li key={member.id}>
            {member.userId} — {member.role}
            <button type="button" onClick={() => handleAction('deactivate', member.userId)}>
              Desactivar
            </button>
            <button type="button" onClick={() => handleAction('reactivate', member.userId)}>
              Reactivar
            </button>
            <button type="button" onClick={() => handleAction('delete', member.userId)}>
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
