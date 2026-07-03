import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { getSession } from '../../services/session';

const ROLES: MembershipRole[] = [
  'Propietario',
  'Administrador',
  'Gerente',
  'Ventas',
  'Soporte',
  'Contabilidad',
  'Inventario',
  'RRHH',
  'Lector',
];

export function Members() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('Ventas');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  }, [organizationId, session]);

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

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando miembros…</p>;
  }

  return (
    <main>
      <h1>Miembros</h1>
      {organizationId && (
        <p>
          <Link to={`/organizations/${organizationId}/manage-users`}>Administrar usuarios</Link>
        </p>
      )}

      <section>
        <h2>Miembros activos</h2>
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.userId} — {member.role}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Invitaciones pendientes</h2>
        <ul>
          {invitations.map((invitation) => (
            <li key={invitation.id}>
              {invitation.email} — {invitation.role}
              <button type="button" onClick={() => handleCancel(invitation.id)}>
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={handleInvite}>
        <h2>Invitar</h2>
        <label htmlFor="invite-email">Email</label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="invite-role">Rol</label>
        <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as MembershipRole)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {error && <p role="alert">{error}</p>}
        {issuedToken && (
          <p role="status">
            Invitación enviada. Enlace de aceptación (dev): <code>{issuedToken}</code>
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Invitando…' : 'Invitar'}
        </button>
      </form>
    </main>
  );
}
