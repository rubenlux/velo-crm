import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Membership, listMembers } from '../../services/organizations-api';
import { getEffectivePermissions } from '../../services/roles-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { FormSelect } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';

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
  }, [organizationId, session?.accessToken]);

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
  }, [organizationId, selectedUserId, session?.accessToken]);

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="text-[13px] text-text-2">Cargando miembros…</p>;
  }

  return (
    <Card className="p-6">
      <div className="mb-4 text-[15px] font-extrabold">Permisos efectivos</div>
      {error && (
        <p role="alert" className="mb-3 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <FormSelect id="effective-member" label="Miembro" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="max-w-[320px]">
        <option value={session.user.id}>Yo</option>
        {members
          .filter((member) => member.userId !== session.user.id)
          .map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.userId} ({member.role})
            </option>
          ))}
      </FormSelect>

      {permissions && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {permissions.map((permission) => (
            <Badge key={permission} tone="neutral">
              {permission}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
