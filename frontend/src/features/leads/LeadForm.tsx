import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { LeadSource, createLead } from '../../services/leads-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect } from '../../components/ui/Field';

const SOURCE_LABEL: Record<LeadSource, string> = {
  SitioWeb: 'Sitio web',
  Formulario: 'Formulario',
  RedesSociales: 'Redes sociales',
  Referido: 'Referido',
  Llamada: 'Llamada',
  Email: 'Email',
  Importacion: 'Importación',
  Evento: 'Evento',
  CargaManual: 'Carga manual',
  Api: 'API',
};

const emptyForm = {
  name: '',
  company: '',
  jobTitle: '',
  email: '',
  phone: '',
  whatsapp: '',
  country: '',
  state: '',
  city: '',
  address: '',
  source: 'CargaManual' as LeadSource,
  campaign: '',
  interest: '',
};

export function LeadForm() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const session = getSession();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function field<K extends keyof typeof emptyForm>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: e.target.value })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await createLead(session.accessToken, organizationId, {
        name: form.name,
        company: form.company || undefined,
        jobTitle: form.jobTitle || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        country: form.country || undefined,
        state: form.state || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        source: form.source,
        campaign: form.campaign || undefined,
        interest: form.interest || undefined,
      });
      navigate(`/organizations/${organizationId}/leads/${created.id}`);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo guardar el Prospecto.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <div className="max-w-[760px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Nuevo Prospecto</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput id="lead-name" label="Nombre" required {...field('name')} />
          <FormInput id="lead-company" label="Empresa" {...field('company')} />
          <FormInput id="lead-job-title" label="Cargo" {...field('jobTitle')} />
          <FormSelect id="lead-source" label="Origen" {...field('source')}>
            {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </FormSelect>
          <FormInput id="lead-email" label="Email" type="email" {...field('email')} />
          <FormInput id="lead-phone" label="Teléfono" {...field('phone')} />
          <FormInput id="lead-whatsapp" label="WhatsApp" {...field('whatsapp')} />
          <FormInput id="lead-campaign" label="Campaña" {...field('campaign')} />
          <FormInput id="lead-interest" label="Interés" {...field('interest')} />
          <FormInput id="lead-country" label="País" {...field('country')} />
          <FormInput id="lead-state" label="Provincia" {...field('state')} />
          <FormInput id="lead-city" label="Ciudad" {...field('city')} />
          <FormInput id="lead-address" label="Dirección" className="sm:col-span-2" {...field('address')} />

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
