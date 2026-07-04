import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Membership, listMembers } from '../../services/organizations-api';
import { Role, assignRole, grantPermission, listRoles, revokePermission, revokeRole } from '../../services/roles-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormSelect, FormInput } from '../../components/ui/Field';

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
      const [membersList, rolesList] = await Promise.all([listMembers(session.accessToken, organizationId), listRoles(session.accessToken, organizationId)]);
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
  }, [organizationId, session?.accessToken]);

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
    return <p className="text-[13px] text-text-2">Cargando roles y miembros…</p>;
  }

  return (
    <Card className="p-6">
      <div className="mb-4 text-[15px] font-extrabold">Asignar roles y permisos adicionales</div>
      {(error || status) && (
        <p role={error ? 'alert' : 'status'} className={`mb-3 text-[12.5px] font-semibold ${error ? 'text-red-text' : 'text-green-text'}`}>
          {error ?? status}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormSelect id="assign-member" label="Miembro" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value="">Seleccionar…</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.userId} ({member.role})
            </option>
          ))}
        </FormSelect>

        <FormSelect id="assign-role" label="Rol adicional" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
          <option value="">Seleccionar…</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
              {role.organizationId ? ' (personalizado)' : ''}
            </option>
          ))}
        </FormSelect>
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" disabled={!selectedUserId || !selectedRoleId} onClick={() => withFeedback(() => assignRole(session.accessToken, organizationId!, selectedUserId, selectedRoleId))}>
          Asignar rol
        </Button>
        <Button variant="secondary" size="sm" disabled={!selectedUserId || !selectedRoleId} onClick={() => withFeedback(() => revokeRole(session.accessToken, organizationId!, selectedUserId, selectedRoleId))}>
          Revocar rol
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <FormInput id="assign-permission" label="Permiso directo (recurso.acción)" value={permission} onChange={(e) => setPermission(e.target.value)} placeholder="lead.create" className="min-w-[200px] flex-1" />
        <Button variant="secondary" size="sm" disabled={!selectedUserId || !permission} onClick={() => withFeedback(() => grantPermission(session.accessToken, organizationId!, selectedUserId, permission))}>
          Otorgar
        </Button>
        <Button variant="secondary" size="sm" disabled={!selectedUserId || !permission} onClick={() => withFeedback(() => revokePermission(session.accessToken, organizationId!, selectedUserId, permission))}>
          Revocar
        </Button>
      </div>
    </Card>
  );
}
