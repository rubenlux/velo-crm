import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../lib/icons';
import { MODULE_CATALOG, ModuleRow } from './module-catalog';

// Fallback screen for every nav item without a real backend spec yet (Ventas,
// Operación, Workflows, Documentos…). Purely illustrative — see module-catalog.ts.
export function GenericModule() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const definition = moduleId ? MODULE_CATALOG[moduleId] : undefined;

  if (!definition) {
    return <p className="p-7 text-text-2">Módulo no encontrado.</p>;
  }

  const columns: DataTableColumn<ModuleRow>[] = [
    { key: 'name', label: 'Nombre', render: (r) => <span className="font-bold">{r.name}</span> },
    { key: 'ref', label: 'Referencia', render: (r) => <span className="font-mono text-text-2">{r.ref}</span> },
    { key: 'status', label: 'Estado', render: (r) => <Badge tone={r.statusTone}>{r.status}</Badge> },
    { key: 'amount', label: 'Monto', align: 'right', render: (r) => <span className="font-bold [font-variant-numeric:tabular-nums]">{r.amount}</span> },
    { key: 'date', label: 'Fecha', align: 'right', render: (r) => <span className="text-text-2">{r.date}</span> },
  ];

  return (
    <div className="mx-auto max-w-[1300px] px-[30px] py-6">
      <div className="mb-5 flex items-end justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Icon name={definition.icon} size={20} />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight">{definition.title}</h1>
            <p className="mt-0.5 text-[13px] text-text-2">Gestiona {definition.title.toLowerCase()} desde un solo lugar.</p>
          </div>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={15} />}>
          Nuevo registro
        </Button>
      </div>

      <div className="mb-3.5 flex items-center gap-2.5">
        <Button variant="secondary" size="sm" icon={<Icon name="filter" size={14} />}>
          Filtros
        </Button>
        <div className="flex-1" />
        <div className="flex w-[220px] items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-3">
          <Icon name="search" size={14} />
          <input placeholder="Buscar…" className="w-full border-none bg-transparent text-[12.5px] text-text outline-none" />
        </div>
      </div>

      <DataTable columns={columns} rows={definition.rows} getRowId={(r) => r.ref} />

      <p className="mt-4 text-[12px] text-text-3">
        Vista previa — este módulo todavía no tiene una spec implementada en el backend. Los datos de esta pantalla son ilustrativos.
      </p>
    </div>
  );
}
