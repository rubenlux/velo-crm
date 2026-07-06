import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Pipeline, PipelineStage, createPipelineStage, deletePipelineStage, listPipelines, updatePipelineStage } from '../../services/opportunities-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export function PipelineSettings() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState('');
  const [renaming, setRenaming] = useState<Record<string, string>>({});

  async function refresh() {
    if (!session || !organizationId) return;
    setLoading(true);
    try {
      const pipelines = await listPipelines(session.accessToken, organizationId);
      setPipeline(pipelines[0] ?? null);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Pipeline.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  async function handleCreateStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId || !pipeline || !newStageName.trim()) return;
    setError(null);
    try {
      await createPipelineStage(session.accessToken, organizationId, pipeline.id, { name: newStageName.trim() });
      setNewStageName('');
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo crear la etapa. Verificá que tengas el permiso opportunity.manage_pipeline.');
    }
  }

  async function handleRename(stage: PipelineStage) {
    const name = renaming[stage.id];
    if (!session || !organizationId || !pipeline || !name || !name.trim() || name === stage.name) return;
    setError(null);
    try {
      await updatePipelineStage(session.accessToken, organizationId, pipeline.id, stage.id, { name: name.trim() });
      await refresh();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo renombrar la etapa.');
    }
  }

  async function handleDelete(stage: PipelineStage) {
    if (!session || !organizationId || !pipeline) return;
    if (!window.confirm(`¿Eliminar la etapa "${stage.name}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    try {
      await deletePipelineStage(session.accessToken, organizationId, pipeline.id, stage.id);
      await refresh();
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.status === 409
            ? 'No se puede eliminar: todavía tiene Oportunidades abiertas en esta etapa.'
            : err.message
          : 'No se pudo eliminar la etapa.',
      );
    }
  }

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;

  return (
    <div className="max-w-[720px] p-7">
      <h1 className="mb-2 text-[22px] font-extrabold tracking-tight">Configurar etapas del Pipeline</h1>
      <p className="mb-5 text-[13px] text-text-2">Requiere el permiso opportunity.manage_pipeline.</p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      {!pipeline ? (
        <p className="text-text-2">No hay un Pipeline configurado todavía.</p>
      ) : (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-2">
              {pipeline.stages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <input
                      value={renaming[stage.id] ?? stage.name}
                      onChange={(e) => setRenaming((current) => ({ ...current, [stage.id]: e.target.value }))}
                      onBlur={() => handleRename(stage)}
                      className="flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-semibold outline-none focus:border-border focus:bg-surface-2"
                    />
                    {stage.isWonStage && <Badge tone="green">Ganada</Badge>}
                    {stage.isLostStage && <Badge tone="red">Perdida</Badge>}
                    {!stage.isWonStage && !stage.isLostStage && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(stage)}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </Card>

          <Card className="p-4">
            <form onSubmit={handleCreateStage} className="flex gap-1.5">
              <input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Nueva etapa…"
                className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[13px] outline-none"
              />
              <Button type="submit" variant="secondary">
                Agregar
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
