export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({ items, activeId, onChange }: { items: TabItem[]; activeId: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-[13px] transition-colors ${
              active ? 'border-accent font-bold text-text' : 'border-transparent font-semibold text-text-2 hover:text-text'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
