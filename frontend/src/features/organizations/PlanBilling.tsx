import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Organization, changePlan, getOrganization } from '../../services/organizations-api';
import { getSession } from '../../services/session';

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
    if (!session || !organizationId) {
      return;
    }
    getOrganization(session.accessToken, organizationId)
      .then(setOrganization)
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el plan.'))
      .finally(() => setLoading(false));
  }, [organizationId, session]);

  async function handleChangePlan(plan: Organization['plan']) {
    if (!session || !organizationId) {
      return;
    }
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

  if (!session) {
    return null;
  }
  if (loading) {
    return <p>Cargando plan…</p>;
  }
  if (!organization) {
    return <p role="alert">{error ?? 'Organización no encontrada.'}</p>;
  }

  return (
    <main>
      <h1>Plan y facturación</h1>
      <p>
        Plan actual: <strong>{organization.plan}</strong>
      </p>

      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      <ul>
        {PLANS.map((plan) => (
          <li key={plan}>
            {plan}
            {plan !== organization.plan && (
              <button type="button" disabled={submitting} onClick={() => handleChangePlan(plan)}>
                Cambiar a {plan}
              </button>
            )}
            {plan === organization.plan && ' (actual)'}
          </li>
        ))}
      </ul>
    </main>
  );
}
