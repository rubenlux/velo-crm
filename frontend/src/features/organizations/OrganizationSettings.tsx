import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import {
  AuditLogEntry,
  Organization,
  getOrganization,
  listAuditLog,
  updateBranding,
  updateModules,
  updateOrganization,
  updateTaxSettings,
} from '../../services/organizations-api';
import { getSession, setActiveOrganizationId } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/ui/Field';

const AVAILABLE_MODULES = ['crm', 'agenda', 'facturacion', 'inventario', 'rrhh', 'automatizaciones'];

export function OrganizationSettings() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');
  const [language, setLanguage] = useState('');

  const [logoUrl, setLogoUrl] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [taxSettingsText, setTaxSettingsText] = useState('{}');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || !organizationId) {
      return;
    }
    setActiveOrganizationId(organizationId);

    async function load() {
      setLoading(true);
      try {
        const [org, log] = await Promise.all([
          getOrganization(session!.accessToken, organizationId!),
          listAuditLog(session!.accessToken, organizationId!),
        ]);
        setOrganization(org);
        setName(org.name);
        setTimezone(org.timezone);
        setCurrency(org.currency);
        setLanguage(org.language);
        setLogoUrl(org.logoUrl ?? '');
        setCustomDomain(org.customDomain ?? '');
        setTaxSettingsText(JSON.stringify(org.taxSettings ?? {}, null, 2));
        setEnabledModules(org.enabledModules ?? []);
        setAuditLog(log);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudo cargar la organización.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) return;
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const updated = await updateOrganization(session.accessToken, organizationId, { name, timezone, currency, language });
      setOrganization(updated);
      setStatus('Cambios guardados.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar la organización.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBrandingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) return;
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const updated = await updateBranding(session.accessToken, organizationId, { logoUrl: logoUrl || undefined, customDomain: customDomain || undefined });
      setOrganization(updated);
      setStatus('Branding actualizado.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo actualizar el branding.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaxSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) return;
    setError(null);
    setStatus(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(taxSettingsText);
    } catch {
      setError('Los impuestos deben ser un JSON válido.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateTaxSettings(session.accessToken, organizationId, parsed);
      setOrganization(updated);
      setStatus('Impuestos actualizados.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron actualizar los impuestos.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleModule(module: string) {
    setEnabledModules((current) => (current.includes(module) ? current.filter((m) => m !== module) : [...current, module]));
  }

  async function handleModulesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !organizationId) return;
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const updated = await updateModules(session.accessToken, organizationId, enabledModules);
      setOrganization(updated);
      setStatus('Módulos actualizados.');
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudieron actualizar los módulos.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;
  if (loading) return <p className="text-[13px] text-text-2">Cargando organización…</p>;
  if (!organization) {
    return <p className="font-semibold text-red-text">{error ?? 'Organización no encontrada.'}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {(error || status) && (
        <p role={error ? 'alert' : 'status'} className={`text-[12.5px] font-semibold ${error ? 'text-red-text' : 'text-green-text'}`}>
          {error ?? status}
        </p>
      )}

      <Card className="p-6">
        <div className="mb-4 text-[15px] font-extrabold">Datos generales</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput id="settings-name" label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
          <FormInput id="settings-timezone" label="Zona horaria" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <FormInput id="settings-currency" label="Moneda" value={currency} onChange={(event) => setCurrency(event.target.value)} />
          <FormInput id="settings-language" label="Idioma" value={language} onChange={(event) => setLanguage(event.target.value)} />
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-4 text-[15px] font-extrabold">Branding</div>
        <form onSubmit={handleBrandingSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput id="settings-logo" label="Logo (URL)" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
          <FormInput id="settings-domain" label="Dominio personalizado" value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} />
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" disabled={submitting}>
              Guardar branding
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-4 text-[15px] font-extrabold">Impuestos</div>
        <form onSubmit={handleTaxSettingsSubmit}>
          <label htmlFor="settings-tax" className="mb-1.5 block text-[11.5px] font-bold text-text-2">
            Configuración de impuestos (JSON)
          </label>
          <textarea
            id="settings-tax"
            value={taxSettingsText}
            onChange={(event) => setTaxSettingsText(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-accent focus:bg-surface"
          />
          <Button type="submit" variant="secondary" disabled={submitting} className="mt-3">
            Guardar impuestos
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-4 text-[15px] font-extrabold">Módulos habilitados</div>
        <form onSubmit={handleModulesSubmit}>
          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
            {AVAILABLE_MODULES.map((module) => (
              <label key={module} htmlFor={`module-${module}`} className="flex items-center gap-2 text-[13px] font-semibold">
                <input id={`module-${module}`} type="checkbox" checked={enabledModules.includes(module)} onChange={() => toggleModule(module)} />
                {module}
              </label>
            ))}
          </div>
          <Button type="submit" variant="secondary" disabled={submitting}>
            Guardar módulos
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-[15px] font-extrabold">Audit Log</div>
        {auditLog.slice(0, 20).map((entry) => (
          <div key={entry.id} className="border-b border-border px-5 py-2.5 text-[12.5px] last:border-b-0">
            <span className="text-text-3">{new Date(entry.occurredAt).toLocaleString()}</span> — <span className="font-semibold">{entry.action}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
