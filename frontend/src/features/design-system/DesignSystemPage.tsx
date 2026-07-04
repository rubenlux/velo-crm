import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../lib/icons';

const COLORS = [
  { name: 'Accent', varName: '--accent' },
  { name: 'Verde', varName: '--green' },
  { name: 'Rojo', varName: '--red' },
  { name: 'Ámbar', varName: '--amber' },
  { name: 'Azul', varName: '--blue' },
  { name: 'Púrpura', varName: '--purple' },
  { name: 'Texto', varName: '--text' },
  { name: 'Texto secundario', varName: '--text-2' },
  { name: 'Texto terciario', varName: '--text-3' },
  { name: 'Borde', varName: '--border' },
  { name: 'Superficie', varName: '--surface' },
  { name: 'Fondo', varName: '--bg' },
];

export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-[30px] py-6">
      <div className="mb-[26px]">
        <h1 className="text-2xl font-extrabold tracking-tight">Guía visual VELO</h1>
        <p className="mt-1.5 text-[13.5px] text-text-2">Design tokens y componentes base del Business OS.</p>
      </div>

      <Section title="Color">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map((c) => (
            <Card key={c.varName} className="p-3">
              <div className="mb-2 h-12 rounded-lg" style={{ background: `var(${c.varName})` }} />
              <div className="text-[12px] font-bold">{c.name}</div>
              <div className="font-mono text-[10.5px] text-text-3">{c.varName}</div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <Card className="flex flex-col gap-3 p-6">
          <div className="text-[27px] font-extrabold tracking-tight">Manrope 800 — Títulos principales</div>
          <div className="text-[18px] font-bold">Manrope 700 — Subtítulos</div>
          <div className="text-[14px] font-semibold">Manrope 600 — Texto de énfasis</div>
          <div className="text-[13px] text-text-2">Manrope 400 — Texto de cuerpo</div>
          <div className="font-mono text-[12px] text-text-2">JetBrains Mono — datos, ids, referencias</div>
        </Card>
      </Section>

      <Section title="Botones">
        <Card className="flex flex-wrap gap-3 p-6">
          <Button variant="primary">Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" icon={<Icon name="plus" size={14} />}>
            Con ícono
          </Button>
          <Button variant="secondary" disabled>
            Deshabilitado
          </Button>
        </Card>
      </Section>

      <Section title="Badges">
        <Card className="flex flex-wrap gap-2 p-6">
          <Badge tone="accent">Accent</Badge>
          <Badge tone="green">Green</Badge>
          <Badge tone="red">Red</Badge>
          <Badge tone="amber">Amber</Badge>
          <Badge tone="blue">Blue</Badge>
          <Badge tone="purple">Purple</Badge>
          <Badge tone="neutral">Neutral</Badge>
        </Card>
      </Section>

      <Section title="Avatares">
        <Card className="flex flex-wrap items-center gap-3 p-6">
          <Avatar initials="AB" tone="accent" size="sm" />
          <Avatar initials="CD" tone="blue" size="md" />
          <Avatar initials="EF" tone="purple" size="lg" />
          <Avatar initials="GH" gradient="linear-gradient(140deg,#5B93EA,#7C6BDD)" size="xl" />
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-text-3">{title}</div>
      {children}
    </div>
  );
}
