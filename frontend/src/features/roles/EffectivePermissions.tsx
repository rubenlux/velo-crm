import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Membership, listMembers } from '../../services/organizations-api';
import { getEffectivePermissions } from '../../services/roles-api';
import { getSession } from '../../services/session';

export function EffectivePermissions() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [members, setMembers] = useState<Membership[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      if (!session || !organizationId) {
        return;
      }
      setLoading(true);
      try {
        const membersList = await listMembers(session.accessToken, organizationId);
        setMembers(membersList);
        setSelectedUserId(session.user.id);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los miembros.');
      } finally {
        setLoading(false);
      }
    }
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session]);

  useEffect(() => {
    async function loadPermissions() {
      if (!session || !organizationId || !selectedUserId) {
        return;
      }
      setError(null);
      try {
        const result = await getEffectivePermissions(session.accessToken, organizationId, selectedUserId);
        setPermissions(result.permissions);
      } catch (err) {
        setPermissions(null);
        setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los permisos.');
      }
    }
    void loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, selectedUserId, session]);

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando miembros…</p>;
  }

  return (
    <main>
      <h1>Permisos efectivos</h1>
      {error && <p role="alert">{error}</p>}

      <label>
        Miembro
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value={session.user.id}>Yo</option>
          {members
            .filter((member) => member.userId !== session.user.id)
            .map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.userId} ({member.role})
              </option>
            ))}
        </select>
      </label>

      {permissions && (
        <ul>
          {permissions.map((permission) => (
            <li key={permission}>{permission}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
