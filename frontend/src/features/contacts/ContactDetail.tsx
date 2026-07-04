import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Contact, archiveContact, getContact, restoreContact, setPrimaryContact } from '../../services/contacts-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<Contact['status'], BadgeTone> = { active: 'green', inactive: 'neutral', archived: 'red' };
const STATUS_LABEL: Record<Contact['status'], string> = { active: 'Activo', inactive: 'Inactivo', archived: 'Archivado' };

export function ContactDetail() {
  const { organizationId, contactId } = useParams<{ organizationId: string; contactId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [contact, setContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!session || !organizationId || !contactId) return;
    setLoading(true);
    try {
      setContact(await getContact(session.accessToken, organizationId, contactId));
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Contact.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, contactId, session?.accessToken]);

  async function handleArchive() {
    if (!session || !organizationId || !contactId) return;
    setError(null);
    try {
      await archiveContact(session.accessToken, organizationId, contactId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo archivar el Contact.');
    }
  }

  async function handleRestore() {
    if (!session || !organizationId || !contactId) return;
    setError(null);
    try {
      await restoreContact(session.accessToken, organizationId, contactId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo restaurar el Contact.');
    }
  }

  async function handleSetPrimary() {
    if (!session || !organizationId || !contactId) return;
    setError(null);
    try {
      await setPrimaryContact(session.accessToken, organizationId, contactId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo marcar como principal.');
    }
  }

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;
  if (!contact) {
    return (
      <p role="alert" className="p-7 font-semibold text-red-text">
        {error ?? 'Contact no encontrado.'}
      </p>
    );
  }

  const initials = `${contact.firstName[0] ?? ''}${contact.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-[820px] p-7">
      <div className="flex flex-wrap items-start gap-[18px]">
        <Avatar initials={initials} tone="blue" size="xl" />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {contact.firstName} {contact.lastName}
            </h1>
            <Badge tone={STATUS_TONE[contact.status]}>{STATUS_LABEL[contact.status]}</Badge>
            {contact.isPrimary && <Badge tone="accent">Contacto principal</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[12.5px] font-semibold text-text-2">
            {contact.jobTitle && <span>{contact.jobTitle}</span>}
            {contact.company && (
              <Link to={`/organizations/${organizationId}/customers/${contact.customerId}`} className="text-accent">
                {contact.company}
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/contacts/${contact.id}/edit`)}>
            Editar
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/organizations/${organizationId}/contacts/${contact.id}/transfer-merge`)}>
            Transferir / Fusionar
          </Button>
          {!contact.isPrimary && (
            <Button variant="secondary" onClick={handleSetPrimary}>
              Marcar como principal
            </Button>
          )}
          {contact.status === 'archived' ? (
            <Button variant="primary" onClick={handleRestore}>
              Restaurar
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleArchive}>
              Archivar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-1 border-b border-border">
        <span className="-mb-px border-b-2 border-accent px-3.5 py-2.5 text-[13px] font-bold text-text">Resumen</span>
        <button
          onClick={() => navigate(`/organizations/${organizationId}/contacts/${contact.id}/timeline`)}
          className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-2 hover:text-text"
        >
          Línea de tiempo
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ContactField icon="mail" label="Email principal" value={contact.primaryEmail} />
        <ContactField icon="mail" label="Emails secundarios" value={contact.secondaryEmails.join(', ') || null} />
        <ContactField icon="phone" label="Teléfono principal" value={contact.primaryPhone} />
        <ContactField icon="phone" label="Teléfonos secundarios" value={contact.secondaryPhones.join(', ') || null} />
        <ContactField icon="phone" label="WhatsApp" value={contact.whatsapp} />
        <ContactField icon="link" label="LinkedIn" value={contact.linkedin} />
        <ContactField icon="globe" label="Sitio web" value={contact.website} />
        <ContactField icon="pin" label="Ciudad" value={contact.city} />
        <ContactField icon="building" label="Departamento" value={contact.department} />
        <ContactField icon="user" label="Nivel de decisión" value={contact.decisionLevel} />
        <ContactField icon="tag" label="Etiquetas" value={contact.tags.join(', ') || null} />
      </div>
    </div>
  );
}

function ContactField({ icon, label, value }: { icon: 'mail' | 'phone' | 'link' | 'globe' | 'pin' | 'building' | 'user' | 'tag'; label: string; value: string | null | undefined }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex flex-shrink-0 text-text-3">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">{label}</div>
        <div className="mt-0.5 truncate text-[13px] font-semibold">{value || '—'}</div>
      </div>
    </Card>
  );
}
