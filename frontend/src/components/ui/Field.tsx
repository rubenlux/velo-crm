import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const inputClass =
  'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text outline-none transition-colors focus:border-accent focus:bg-surface';

export function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[11.5px] font-bold text-text-2">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  const { label, id, className = '', ...rest } = props;
  return (
    <FormField label={label} htmlFor={id}>
      <input id={id} {...rest} className={`${inputClass} ${className}`} />
    </FormField>
  );
}

export function FormSelect(props: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; children: ReactNode }) {
  const { label, id, className = '', children, ...rest } = props;
  return (
    <FormField label={label} htmlFor={id}>
      <select id={id} {...rest} className={`${inputClass} ${className}`}>
        {children}
      </select>
    </FormField>
  );
}
