import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Lead, convertLead, getLead } from '../../services/leads-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface DuplicateWarning {
  candidateCustomerId?: string;
  candidateContactId?: string;
}

export function ConvertLead() {
  const { organizationId, leadId } = useParams<{ organizationId: string; leadId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId || !leadId) return;
      setLoading(true);
      try {
        setLead(await getLead(session.accessToken, organizationId, leadId));
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Prospecto.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, leadId, session?.accessToken]);

  async function handleConvert(options: { linkToExistingCustomerId?: string; forceCreateNew?: boolean } = {}) {
    if (!session || !organizationId || !leadId) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await convertLead(session.accessToken, organizationId, leadId, options);
      navigate(`/organizations/${organizationId}/customers/${result.customer.id}`);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 409) {
        const payload = err.payload as DuplicateWarning & { message?: string };
        if (payload?.candidateCustomerId || payload?.candidateContactId) {
          setDuplicate(payload);
          setSubmitting(false);
          return;
        }
      }
      setError(err instanceof AuthApiError ? err.message : 'No se pudo convertir el Prospecto.');
      setSubmitting(false);
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

  return (
    <div className="max-w-[640px] p-7">
      <h1 className="mb-2 text-[22px] font-extrabold tracking-tight">Convertir Prospecto</h1>
      <p className="mb-5 text-[13px] text-text-2">
        Se creará un Cliente, un Contacto principal y una Oportunidad a partir de <strong>{lead.name}</strong>, en una única operación.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      {duplicate ? (
        <Card className="p-6">
          <div className="mb-3 text-[15px] font-extrabold">Posible duplicado detectado</div>
          <p className="mb-4 text-[13px] text-text-2">
            Ya existe un Cliente o Contacto en esta Organization con el mismo email o teléfono. ¿Querés vincular el Prospecto a ese registro
            existente, o crear uno nuevo de todas formas?
          </p>
          <div className="flex flex-wrap gap-2">
            {duplicate.candidateCustomerId && (
              <Button variant="primary" disabled={submitting} onClick={() => handleConvert({ linkToExistingCustomerId: duplicate.candidateCustomerId })}>
                Vincular al Cliente existente
              </Button>
            )}
            <Button variant="secondary" disabled={submitting} onClick={() => handleConvert({ forceCreateNew: true })}>
              Crear de todas formas
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <Button variant="primary" disabled={submitting} onClick={() => handleConvert()}>
            {submitting ? 'Convirtiendo…' : 'Confirmar conversión'}
          </Button>
        </Card>
      )}
    </div>
  );
}
