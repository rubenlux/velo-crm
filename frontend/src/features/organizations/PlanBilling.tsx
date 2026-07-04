import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Organization, changePlan, getOrganization } from '../../services/organizations-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const PLANS: Organization['plan'][] = ['Free', 'Pro', 'Enterprise'];

export function PlanBilling() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || !organizationId) return;
    getOrganization(session.accessToken, organizationId)
      .then(setOrganization)
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el plan.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  async function handleChangePlan(plan: Organization['plan']) {
    if (!session || !organizationId) return;
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const updated = await changePlan(session.accessToken, organizationId, plan);
      setOrganization(updated);
      setStatus(`Plan actualizado a ${plan}.`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo cambiar el plan.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;
  if (loading) return <p className="text-[13px] text-text-2">Cargando plan…</p>;
  if (!organization) {
    return <p className="font-semibold text-red-text">{error ?? 'Organización no encontrada.'}</p>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 text-[15px] font-extrabold">Plan y facturación</div>
      {(error || status) && (
        <p role={error ? 'alert' : 'status'} className={`px-5 py-2.5 text-[12.5px] font-semibold ${error ? 'text-red-text' : 'text-green-text'}`}>
          {error ?? status}
        </p>
      )}
      {PLANS.map((plan) => (
        <div key={plan} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
          <div className="flex-1 text-[13.5px] font-bold">{plan}</div>
          {plan === organization.plan ? (
            <Badge tone="accent">Plan actual</Badge>
          ) : (
            <Button variant="secondary" size="sm" disabled={submitting} onClick={() => handleChangePlan(plan)}>
              Cambiar a {plan}
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}
