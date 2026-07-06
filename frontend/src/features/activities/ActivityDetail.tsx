import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import {
  Activity,
  ActivityAttachment,
  ActivityComment,
  ActivityStatus,
  ActivityType,
  addActivityAttachment,
  addActivityComment,
  cancelActivity,
  deleteActivityComment,
  getActivity,
  listActivityAttachments,
  listActivityComments,
  listActivityTypes,
  reactivateActivity,
  scheduleFollowUpActivity,
  updateActivity,
  updateActivityComment,
} from '../../services/activities-api';
import { getSession } from '../../services/session';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { FormInput, FormSelect } from '../../components/ui/Field';
import { Icon } from '../../lib/icons';

const STATUS_TONE: Record<ActivityStatus, BadgeTone> = {
  Pendiente: 'blue',
  EnProceso: 'amber',
  Finalizada: 'green',
  Cancelada: 'neutral',
};
const STATUS_LABEL: Record<ActivityStatus, string> = {
  Pendiente: 'Pendiente',
  EnProceso: 'En proceso',
  Finalizada: 'Finalizada',
  Cancelada: 'Cancelada',
};
const WORKING_STATUSES: ActivityStatus[] = ['Pendiente', 'EnProceso', 'Finalizada'];

export function ActivityDetail() {
  const { organizationId, activityId } = useParams<{ organizationId: string; activityId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [result, setResult] = useState('');
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([]);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpTypeId, setFollowUpTypeId] = useState('');
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpScheduledAt, setFollowUpScheduledAt] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  async function refresh() {
    if (!session || !organizationId || !activityId) return;
    setLoading(true);
    try {
      const [a, types, attachmentsResult, commentsResult] = await Promise.all([
        getActivity(session.accessToken, organizationId, activityId),
        listActivityTypes(session.accessToken, organizationId),
        listActivityAttachments(session.accessToken, organizationId, activityId),
        listActivityComments(session.accessToken, organizationId, activityId),
      ]);
      setActivity(a);
      setResult(a.result ?? '');
      setActivityTypes(types);
      setAttachments(attachmentsResult);
      setComments(commentsResult);
      if (types.length > 0 && !followUpTypeId) setFollowUpTypeId(types[0].id);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la Activity.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, activityId, session?.accessToken]);

  async function handleStatusChange(status: ActivityStatus) {
    if (!session || !organizationId || !activityId || !activity) return;
    setError(null);
    try {
      await updateActivity(session.accessToken, organizationId, activityId, { version: activity.version, status });
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar el estado.');
    }
  }

  async function handleCancel() {
    if (!session || !organizationId || !activityId) return;
    setError(null);
    try {
      await cancelActivity(session.accessToken, organizationId, activityId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cancelar.');
    }
  }

  async function handleReactivate() {
    if (!session || !organizationId || !activityId) return;
    setError(null);
    try {
      await reactivateActivity(session.accessToken, organizationId, activityId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo reactivar.');
    }
  }

  async function handleResultBlur(value: string) {
    if (!session || !organizationId || !activityId || !activity || value === (activity.result ?? '')) return;
    setError(null);
    try {
      await updateActivity(session.accessToken, organizationId, activityId, { version: activity.version, result: value });
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo registrar el resultado.');
    }
  }

  async function handleAddAttachment(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !organizationId || !activityId || !attachmentName.trim() || !attachmentUrl.trim()) return;
    setError(null);
    try {
      await addActivityAttachment(session.accessToken, organizationId, activityId, attachmentName.trim(), attachmentUrl.trim());
      setAttachmentName('');
      setAttachmentUrl('');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo adjuntar el archivo.');
    }
  }

  async function handleAddComment(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !organizationId || !activityId || !commentBody.trim()) return;
    setError(null);
    try {
      await addActivityComment(session.accessToken, organizationId, activityId, commentBody.trim());
      setCommentBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo agregar el comentario.');
    }
  }

  async function handleSaveCommentEdit(commentId: string) {
    if (!session || !organizationId || !activityId || !editingCommentBody.trim()) return;
    setError(null);
    try {
      await updateActivityComment(session.accessToken, organizationId, activityId, commentId, editingCommentBody.trim());
      setEditingCommentId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo editar el comentario.');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!session || !organizationId || !activityId) return;
    setError(null);
    try {
      await deleteActivityComment(session.accessToken, organizationId, activityId, commentId);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo eliminar el comentario.');
    }
  }

  async function handleScheduleFollowUp(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !organizationId || !activityId || !followUpTypeId || !followUpTitle.trim() || !followUpScheduledAt) return;
    setError(null);
    setFollowUpSubmitting(true);
    try {
      const created = await scheduleFollowUpActivity(session.accessToken, organizationId, activityId, {
        activityTypeId: followUpTypeId,
        title: followUpTitle.trim(),
        scheduledAt: new Date(followUpScheduledAt).toISOString(),
      });
      setFollowUpOpen(false);
      navigate(`/organizations/${organizationId}/activities/${created.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo programar la próxima actividad.');
    } finally {
      setFollowUpSubmitting(false);
    }
  }

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;
  if (!activity) {
    return (
      <p role="alert" className="p-7 font-semibold text-red-text">
        {error ?? 'Activity no encontrada.'}
      </p>
    );
  }

  const initials = activity.title
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
                <h1 className="text-2xl font-extrabold tracking-tight">{activity.title}</h1>
                <Badge tone={STATUS_TONE[activity.status]}>{STATUS_LABEL[activity.status]}</Badge>
                <Badge tone="neutral">{activity.activityType.name}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[12.5px] font-semibold text-text-2">
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={14} /> {new Date(activity.scheduledAt).toLocaleString()}
                </span>
                {activity.durationMinutes !== null && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" size={14} /> {activity.durationMinutes} min
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activity.status === 'Finalizada' && (
                <Button variant="primary" onClick={() => setFollowUpOpen(true)}>
                  Programar próxima actividad
                </Button>
              )}
              {activity.status === 'Cancelada' ? (
                <Button variant="primary" onClick={handleReactivate}>
                  Reactivar
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleCancel}>
                  Cancelar
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
              onClick={() => navigate(`/organizations/${organizationId}/activities/${activity.id}/timeline`)}
              className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-2 hover:text-text"
            >
              Línea de tiempo
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          {activity.status !== 'Cancelada' && (
            <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
              <span className="text-[12px] font-bold uppercase tracking-wide text-text-3">Estado</span>
              {WORKING_STATUSES.map((status) => (
                <Button key={status} variant={status === activity.status ? 'primary' : 'secondary'} size="sm" onClick={() => handleStatusChange(status)}>
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryField label="Descripción" value={activity.description} />
            <SummaryField label="Prioridad" value={activity.priority} />
            <SummaryField label="Etiquetas" value={activity.tags.length > 0 ? activity.tags.join(', ') : '—'} />
          </div>

          {activity.status === 'Finalizada' && (
            <Card className="mt-4 p-4">
              <label htmlFor="activity-result" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-text-3">
                Resultado
              </label>
              <textarea
                id="activity-result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                onBlur={(e) => handleResultBlur(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[13px] outline-none"
              />
            </Card>
          )}
        </div>
      </div>

      <aside data-scroll className="w-[320px] flex-shrink-0 overflow-y-auto border-l border-border bg-surface px-5 py-[22px]">
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
        <form onSubmit={handleAddAttachment} className="mb-6 flex flex-col gap-1.5">
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

        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Comentarios ({comments.length})</div>
        <div className="mb-3 flex flex-col gap-2">
          {comments.length === 0 && <p className="text-[12px] text-text-3">Sin comentarios todavía.</p>}
          {comments.map((comment) => {
            const isAuthor = comment.authorUserId === session.user.id;
            return (
              <Card key={comment.id} className="p-2.5 text-[12px]">
                {editingCommentId === comment.id ? (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      value={editingCommentBody}
                      onChange={(e) => setEditingCommentBody(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[12px] outline-none"
                    />
                    <div className="flex gap-1.5">
                      <Button variant="primary" size="sm" onClick={() => handleSaveCommentEdit(comment.id)}>
                        Guardar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {comment.body}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10.5px] text-text-3">{new Date(comment.createdAt).toLocaleString()}</span>
                      {isAuthor && (
                        <span className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentBody(comment.body);
                            }}
                            className="text-[10.5px] font-semibold text-accent hover:underline"
                          >
                            Editar
                          </button>
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-[10.5px] font-semibold text-red-text hover:underline">
                            Eliminar
                          </button>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
        <form onSubmit={handleAddComment} className="flex gap-1.5">
          <input
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Agregar comentario…"
            className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] outline-none"
          />
          <Button type="submit" variant="secondary" size="sm">
            +
          </Button>
        </form>
      </aside>

      <Modal open={followUpOpen} onClose={() => setFollowUpOpen(false)} width={480}>
        <form onSubmit={handleScheduleFollowUp} className="flex flex-col gap-4 p-6">
          <h2 className="text-[15px] font-extrabold">Programar próxima actividad</h2>
          <FormSelect id="follow-up-type" label="Tipo" value={followUpTypeId} onChange={(e) => setFollowUpTypeId(e.target.value)}>
            {activityTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FormSelect>
          <FormInput id="follow-up-title" label="Título" required value={followUpTitle} onChange={(e) => setFollowUpTitle(e.target.value)} />
          <FormInput
            id="follow-up-scheduled-at"
            label="Fecha y hora"
            type="datetime-local"
            required
            value={followUpScheduledAt}
            onChange={(e) => setFollowUpScheduledAt(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFollowUpOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={followUpSubmitting}>
              {followUpSubmitting ? 'Guardando…' : 'Programar'}
            </Button>
          </div>
        </form>
      </Modal>
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
