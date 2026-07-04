import { ChangeEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { ImportCustomersResult, exportCustomers, importCustomers } from '../../services/customers-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../lib/icons';

export function ImportExportCustomers() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportCustomersResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    if (!session || !organizationId) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const csv = await exportCustomers(session.accessToken, organizationId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'customers.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo exportar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!session || !organizationId || !file) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const csv = await file.text();
      setResult(await importCustomers(session.accessToken, organizationId, csv));
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'No se pudo importar.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-[640px] p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">Exportar / Importar Customers</h1>
      {error && (
        <p role="alert" className="mb-4 font-semibold text-red-text">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="mb-3 text-[15px] font-extrabold">Exportar</div>
          <Button variant="secondary" icon={<Icon name="download" size={15} />} onClick={handleExport} disabled={busy}>
            Descargar CSV
          </Button>
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-[15px] font-extrabold">Importar</div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleImport}
            disabled={busy}
            className="text-[12.5px] file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-[12px] file:font-bold"
          />
          {result && (
            <div className="mt-3 text-[12.5px]">
              Creados: <b>{result.created}</b>. Rechazados: <b>{result.rejected.length}</b>
              {result.rejected.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {result.rejected.map((r) => (
                    <li key={r.row} className="text-text-2">
                      Fila {r.row}: {r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
