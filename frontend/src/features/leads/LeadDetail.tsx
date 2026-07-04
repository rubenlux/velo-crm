import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import {
  Lead,
  LeadAttachment,
  LeadNote,
  LeadStatus,
  addLeadAttachment,
  addLeadNote,
  getLead,
  listLeadAttachments,
  listLeadNotes,
  loseLead,
  reactivateLead,
  updateLead,
} from '../../services/leads-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  Nuevo: 'blue',
  Contactado: 'amber',
  Calificado: 'purple',
  EnNegociacion: 'accent',
  Convertido: 'green',
  Perdido: 'red',
  Archivado: 'neutral',
};
const STATUS_LABEL: Record<LeadStatus, string> = {
  Nuevo: 'Nuevo',
  Contactado: 'Contactado',
  Calificado: 'Calificado',
  EnNegociacion: 'En negociación',
  Convertido: 'Convertido',
  Perdido: 'Perdido',
  Archivado: 'Archivado',
};
const WORKING_STATUSES: LeadStatus[] = ['Nuevo', 'Contactado', 'Calificado', 'EnNegociacion'];

export function LeadDetail() {
  const { organizationId, leadId } = useParams<{ organizationId: string; leadId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  async function refresh() {
    if (!session || !organizationId || !leadId) return;
    setLoading(true);
    try {
      const [l, notesResult, attachmentsResult] = await Promise.all([
        getLead(session.accessToken, organizationId, leadId),
        listLeadNotes(session.accessToken, organizationId, leadId),
        listLeadAttachments(session.accessToken, organizationId, leadId),
      ]);
      setLead(l);
      setNotes(notesResult);
      setAttachments(attachmentsResult);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Prospecto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, leadId, session?.accessToken]);

  async function handleStatusChange(status: LeadStatus) {
    if (!session || !organizationId || !leadId || !lead) return;
    setError(null);
    try {
      await updateLead(session.accessToken, organizationId, leadId, { version: lead.version, status });
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar el estado.');
    }
  }

  async function handleScoreChange(score: number) {
    if (!session || !organizationId || !leadId || !lead) return;
    setError(null);
    try {
      await updateLead(session.accessToken, organizationId, leadId, { version: lead.version, score });
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar el Score.');
    }
  }

  async function handleLose() {
    if (!session || !organizationId || !leadId) return;
    setError(null);
    try {
      await loseLead(session.accessToken, organizationId, leadId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo marcar como perdido.');
    }
  }

  async function handleReactivate() {
    if (!session || !organizationId || !leadId) return;
    setError(null);
    try {
      await reactivateLead(session.accessToken, organizationId, leadId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo reactivar el Prospecto.');
    }
  }

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !organizationId || !leadId || !noteText.trim()) return;
    setError(null);
    try {
      await addLeadNote(session.accessToken, organizationId, leadId, noteText.trim());
      setNoteText('');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo agregar la nota.');
    }
  }

  async function handleAddAttachment(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !organizationId || !leadId || !attachmentName.trim() || !attachmentUrl.trim()) return;
    setError(null);
    try {
      await addLeadAttachment(session.accessToken, organizationId, leadId, attachmentName.trim(), attachmentUrl.trim());
      setAttachmentName('');
      setAttachmentUrl('');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo adjuntar el documento.');
    }
  }

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;
  if (!lead) {
    return (
      <p role="alert" className="p-7 font-semibold text-red-text">
        {error ?? 'Prospecto no encontrado.'}
      </p>
    );
  }

  const initials = lead.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full animate-veloFade">
      <div data-scroll className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-8 pt-6">
          <div className="flex flex-wrap items-start gap-[18px]">
            <Avatar initials={initials} tone="purple" size="xl" />
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight">{lead.name}</h1>
                <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                {lead.score !== null && <Badge tone="neutral">Score {lead.score}</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[12.5px] font-semibold text-text-2">
                {lead.company && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="building" size={14} /> {lead.company}
                  </span>
                )}
                {lead.city && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="pin" size={14} /> {lead.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={14} /> Creado el {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.status === 'Convertido' ? (
                <Button variant="secondary" disabled>
                  Ya convertido
                </Button>
              ) : lead.status === 'Perdido' ? (
                <Button variant="primary" onClick={handleReactivate}>
                  Reactivar
                </Button>
              ) : (
                <>
                  <Button variant="primary" onClick={() => navigate(`/organizations/${organizationId}/leads/${lead.id}/convert`)}>
                    Convertir
                  </Button>
                  <Button variant="secondary" onClick={handleLose}>
                    Marcar como perdido
                  </Button>
                </>
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
              onClick={() => navigate(`/organizations/${organizationId}/leads/${lead.id}/timeline`)}
              className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-2 hover:text-text"
            >
              Línea de tiempo
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          {WORKING_STATUSES.includes(lead.status) && (
            <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
              <span className="text-[12px] font-bold uppercase tracking-wide text-text-3">Avanzar estado</span>
              {WORKING_STATUSES.map((status) => (
                <Button key={status} variant={status === lead.status ? 'primary' : 'secondary'} size="sm" onClick={() => handleStatusChange(status)}>
                  {STATUS_LABEL[status]}
                </Button>
              ))}
              <span className="ml-2 flex items-center gap-2">
                <label htmlFor="lead-score" className="text-[12px] font-semibold text-text-2">
                  Score
                </label>
                <input
                  id="lead-score"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={lead.score ?? ''}
                  onBlur={(e) => e.target.value && handleScoreChange(Number(e.target.value))}
                  className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-[12.5px] text-text outline-none"
                />
              </span>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryField label="Cargo" value={lead.jobTitle} />
            <SummaryField label="Origen" value={lead.source} />
            <SummaryField label="Campaña" value={lead.campaign} />
            <SummaryField label="Interés" value={lead.interest} />
            <SummaryField label="Dirección" value={lead.address} />
            <SummaryField label="Próxima acción" value={lead.nextActionNote} />
          </div>
        </div>
      </div>

      <aside data-scroll className="w-[320px] flex-shrink-0 overflow-y-auto border-l border-border bg-surface px-5 py-[22px]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Detalles</div>
        <div className="mb-6 flex flex-col gap-3.5">
          <ContactRow icon="mail" label="Correo" value={lead.email} />
          <ContactRow icon="phone" label="Teléfono" value={lead.phone} />
          <ContactRow icon="phone" label="WhatsApp" value={lead.whatsapp} />
        </div>

        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Notas ({notes.length})</div>
        <div className="mb-3 flex flex-col gap-2">
          {notes.length === 0 && <p className="text-[12px] text-text-3">Sin notas todavía.</p>}
          {notes.map((note) => (
            <Card key={note.id} className="p-2.5 text-[12px]">
              {note.note}
              <div className="mt-1 text-[10.5px] text-text-3">{new Date(note.createdAt).toLocaleString()}</div>
            </Card>
          ))}
        </div>
        <form onSubmit={handleAddNote} className="mb-6 flex gap-1.5">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Agregar nota…"
            className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] outline-none"
          />
          <Button type="submit" variant="secondary" size="sm">
            +
          </Button>
        </form>

        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Adjuntos ({attachments.length})</div>
        <div className="mb-3 flex flex-col gap-1">
          {attachments.length === 0 && <p className="text-[12px] text-text-3">Sin adjuntos todavía.</p>}
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[12.5px] font-semibold text-accent hover:underline"
            >
              <Icon name="file" size={14} /> {attachment.fileName}
            </a>
          ))}
        </div>
        <form onSubmit={handleAddAttachment} className="flex flex-col gap-1.5">
          <input
            value={attachmentName}
            onChange={(e) => setAttachmentName(e.target.value)}
            placeholder="Nombre del archivo"
            className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] outline-none"
          />
          <input
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="URL del archivo"
            className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] outline-none"
          />
          <Button type="submit" variant="secondary" size="sm">
            Adjuntar
          </Button>
        </form>
      </aside>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-text-3">{label}</div>
      <div className="mt-1 text-[13px] font-semibold">{value || '—'}</div>
    </Card>
  );
}

function ContactRow({ icon, label, value }: { icon: 'mail' | 'phone'; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex text-text-3">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold text-text-3">{label}</div>
        <div className="truncate text-[13px] font-semibold">{value || '—'}</div>
      </div>
    </div>
  );
}
