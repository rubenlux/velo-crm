import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import {
  Invitation,
  Membership,
  MembershipRole,
  cancelInvitation,
  inviteMember,
  listInvitations,
  listMembers,
} from '../../services/organizations-api';
import { deactivateMember, deleteMember, reactivateMember } from '../../services/users-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FormSelect } from '../../components/ui/Field';
import { Avatar } from '../../components/ui/Avatar';

const ROLES: MembershipRole[] = ['Propietario', 'Administrador', 'Gerente', 'Ventas', 'Soporte', 'Contabilidad', 'Inventario', 'RRHH', 'Lector'];

export function Members() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('Ventas');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!session || !organizationId) {
      return;
    }
    setLoading(true);
    try {
      const [memberList, invitationList] = await Promise.all([
        listMembers(session.accessToken, organizationId),
        listInvitations(session.accessToken, organizationId),
      ]);
      setMembers(memberList);
      setInvitations(invitationList);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los miembros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setIssuedToken(null);
    setSubmitting(true);

    try {
      const issued = await inviteMember(session.accessToken, organizationId, email, role);
      setIssuedToken(issued.invitationToken);
      setEmail('');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo enviar la invitación.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(invitationId: string) {
    if (!session || !organizationId) {
      return;
    }
    await cancelInvitation(session.accessToken, organizationId, invitationId);
    await refresh();
  }

  async function handleMemberAction(action: 'deactivate' | 'reactivate' | 'delete', userId: string) {
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setStatus(null);
    try {
      if (action === 'deactivate') await deactivateMember(session.accessToken, organizationId, userId);
      else if (action === 'reactivate') await reactivateMember(session.accessToken, organizationId, userId);
      else await deleteMember(session.accessToken, organizationId, userId);
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
    return <p className="text-[13px] text-text-2">Cargando miembros…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {(error || status) && (
        <p role={error ? 'alert' : 'status'} className={`text-[12.5px] font-semibold ${error ? 'text-red-text' : 'text-green-text'}`}>
          {error ?? status}
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-[15px] font-extrabold">Miembros del equipo</div>
        </div>
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3.5 border-b border-border px-5 py-3.5 last:border-b-0">
            <Avatar initials={member.userId.slice(0, 2).toUpperCase()} tone="blue" size="md" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{member.userId}</div>
              <div className="text-[11px] font-semibold text-text-3">{member.role}</div>
            </div>
            <Badge tone={member.status === 'active' ? 'green' : 'neutral'}>{member.status}</Badge>
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => handleMemberAction('deactivate', member.userId)}>
                Desactivar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleMemberAction('reactivate', member.userId)}>
                Reactivar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleMemberAction('delete', member.userId)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-[15px] font-extrabold">Invitaciones pendientes</div>
        {invitations.length === 0 && <p className="px-5 py-4 text-[12.5px] text-text-3">Sin invitaciones pendientes.</p>}
        {invitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{invitation.email}</div>
              <div className="text-[11px] font-semibold text-text-3">{invitation.role}</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => handleCancel(invitation.id)}>
              Cancelar
            </Button>
          </div>
        ))}
      </Card>

      <Card className="p-6">
        <div className="mb-4 text-[15px] font-extrabold">Invitar</div>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="invite-email" className="mb-1.5 block text-[11.5px] font-bold text-text-2">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent focus:bg-surface"
            />
          </div>
          <FormSelect id="invite-role" label="Rol" value={role} onChange={(event) => setRole(event.target.value as MembershipRole)} className="w-[180px]">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </FormSelect>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Invitando…' : 'Invitar'}
          </Button>
        </form>
        {issuedToken && (
          <p role="status" className="mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[11px] text-text-2">
            Invitación enviada. Enlace de aceptación (dev): {issuedToken}
          </p>
        )}
      </Card>
    </div>
  );
}
