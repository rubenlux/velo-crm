import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthApiError } from '../../services/auth-api';
import { OpportunityForecast, OpportunityKpis as OpportunityKpisData, getOpportunityForecast, getOpportunityKpis } from '../../services/opportunities-api';
import { getSession } from '../../services/session';
import { Card } from '../../components/ui/Card';

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-2 px-[22px] py-5">
      <span className="text-xs font-semibold text-text-2">{label}</span>
      <span className="text-[22px] font-extrabold leading-none tracking-tight [font-variant-numeric:tabular-nums]">{value}</span>
    </Card>
  );
}

export function OpportunityKpis() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const session = getSession();

  const [kpis, setKpis] = useState<OpportunityKpisData | null>(null);
  const [forecast, setForecast] = useState<OpportunityForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session || !organizationId) return;
      setLoading(true);
      try {
        const [k, f] = await Promise.all([
          getOpportunityKpis(session.accessToken, organizationId),
          getOpportunityForecast(session.accessToken, organizationId),
        ]);
        setKpis(k);
        setForecast(f);
      } catch (err) {
        setError(err instanceof AuthApiError ? err.message : 'No se pudieron cargar los KPIs.');
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, session?.accessToken]);

  if (!session) return null;
  if (loading) return <p className="p-7 text-text-2">Cargando…</p>;
  if (error || !kpis || !forecast) {
    return (
      <p role="alert" className="p-7 font-semibold text-red-text">
        {error ?? 'No se pudieron cargar los KPIs.'}
      </p>
    );
  }

  return (
    <div data-scroll className="h-full overflow-y-auto p-7">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">KPIs y forecast del pipeline</h1>

      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Valor total" value={formatMoney(kpis.totalValue)} />
        <Stat label="Valor ponderado" value={formatMoney(kpis.weightedValue)} />
        <Stat label="Abiertas" value={String(kpis.openCount)} />
        <Stat label="Ganadas" value={String(kpis.wonCount)} />
        <Stat label="Perdidas" value={String(kpis.lostCount)} />
        <Stat label="Tasa de conversión" value={kpis.conversionRate !== null ? `${(kpis.conversionRate * 100).toFixed(0)}%` : '—'} />
        <Stat label="Ticket promedio" value={formatMoney(kpis.averageTicket)} />
        <Stat label="Tiempo promedio de cierre" value={kpis.averageCloseTimeDays !== null ? `${kpis.averageCloseTimeDays.toFixed(0)} días` : '—'} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Stat label="Forecast del mes" value={formatMoney(forecast.month)} />
        <Stat label="Forecast del trimestre" value={formatMoney(forecast.quarter)} />
        <Stat label="Forecast del año" value={formatMoney(forecast.year)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-[13px] font-extrabold">Por etapa</h2>
          {kpis.byStage.length === 0 ? (
            <p className="text-[12.5px] text-text-3">Sin datos todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {kpis.byStage.map((row) => (
                <div key={row.stageId} className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold">{row.stageName}</span>
                  <span className="text-text-2">
                    {row.count} · {formatMoney(row.totalValue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-[13px] font-extrabold">Por vendedor</h2>
          {kpis.byOwner.length === 0 ? (
            <p className="text-[12.5px] text-text-3">Sin datos todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {kpis.byOwner.map((row) => (
                <div key={row.ownerUserId} className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold">{row.ownerUserId === session.user.id ? 'Yo' : row.ownerUserId.slice(0, 8)}</span>
                  <span className="text-text-2">
                    {row.count} · {formatMoney(row.totalValue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
