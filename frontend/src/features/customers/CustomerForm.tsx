import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { Customer, CustomerPriority, CustomerType, createCustomer, getCustomer, updateCustomer } from '../../services/customers-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect } from '../../components/ui/Field';

const emptyForm = {
  name: '',
  legalName: '',
  tradeName: '',
  type: 'company' as CustomerType,
  taxId: '',
  taxCondition: '',
  email: '',
  phone: '',
  website: '',
  country: '',
  state: '',
  city: '',
  address: '',
  source: '',
  category: '',
  tags: '',
  priority: 'medium' as CustomerPriority,
};

export function CustomerForm() {
  const { organizationId, customerId } = useParams<{ organizationId: string; customerId?: string }>();
  const navigate = useNavigate();
  const session = getSession();
  const isEditing = Boolean(customerId);

  const [form, setForm] = useState(emptyForm);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId || !customerId) {
        return;
      }
      setLoading(true);
      try {
        const customer = await getCustomer(session.accessToken, organizationId, customerId);
        applyCustomer(customer);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar el Customer.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, customerId, session?.accessToken]);

  function applyCustomer(customer: Customer) {
    setForm({
      name: customer.name,
      legalName: customer.legalName ?? '',
      tradeName: customer.tradeName ?? '',
      type: customer.type,
      taxId: customer.taxId ?? '',
      taxCondition: customer.taxCondition ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      website: customer.website ?? '',
      country: customer.country ?? '',
      state: customer.state ?? '',
      city: customer.city ?? '',
      address: customer.address ?? '',
      source: customer.source ?? '',
      category: customer.category ?? '',
      tags: customer.tags.join(', '),
      priority: customer.priority,
    });
    setVersion(customer.version);
  }

  function field<K extends keyof typeof emptyForm>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((current) => ({ ...current, [key]: e.target.value })),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const tags = form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const payload = {
        name: form.name,
        legalName: form.legalName || undefined,
        tradeName: form.tradeName || undefined,
        type: form.type,
        taxId: form.taxId || undefined,
        taxCondition: form.taxCondition || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        country: form.country || undefined,
        state: form.state || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        source: form.source || undefined,
        category: form.category || undefined,
        tags,
        priority: form.priority,
      };
      if (isEditing && customerId && version !== null) {
        await updateCustomer(session.accessToken, organizationId, customerId, { ...payload, version });
        navigate(`/organizations/${organizationId}/customers/${customerId}`);
      } else {
        const created = await createCustomer(session.accessToken, organizationId, payload);
        navigate(`/organizations/${organizationId}/customers/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo guardar el Customer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }
  if (loading) {
    return <p className="p-7 text-text-2">Cargando…</p>;
  }

  return (
    <div className="max-w-[760px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">{isEditing ? 'Editar Customer' : 'Nuevo Customer'}</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-soft bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-text">
          {error}
        </p>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput id="customer-name" label="Nombre" required {...field('name')} />
          <FormInput id="customer-legal-name" label="Razón social" {...field('legalName')} />
          <FormInput id="customer-trade-name" label="Nombre comercial" {...field('tradeName')} />
          <FormSelect id="customer-type" label="Tipo" {...field('type')}>
            <option value="company">Empresa</option>
            <option value="person">Persona</option>
          </FormSelect>
          <FormInput id="customer-tax-id" label="CUIT/NIF" {...field('taxId')} />
          <FormInput id="customer-tax-condition" label="Condición fiscal" {...field('taxCondition')} />
          <FormInput id="customer-email" label="Email" type="email" {...field('email')} />
          <FormInput id="customer-phone" label="Teléfono" {...field('phone')} />
          <FormInput id="customer-website" label="Sitio web" {...field('website')} />
          <FormInput id="customer-country" label="País" {...field('country')} />
          <FormInput id="customer-state" label="Provincia" {...field('state')} />
          <FormInput id="customer-city" label="Ciudad" {...field('city')} />
          <FormInput id="customer-address" label="Dirección" className="sm:col-span-2" {...field('address')} />
          <FormInput id="customer-source" label="Fuente" {...field('source')} />
          <FormInput id="customer-category" label="Categoría" {...field('category')} />
          <FormInput id="customer-tags" label="Etiquetas (separadas por coma)" {...field('tags')} />
          <FormSelect id="customer-priority" label="Prioridad" {...field('priority')}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </FormSelect>

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
