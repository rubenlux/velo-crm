export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-[25px] w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <span
        className="absolute top-[2.5px] h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200"
        style={{ left: checked ? '22px' : '2.5px' }}
      />
    </button>
  );
}
