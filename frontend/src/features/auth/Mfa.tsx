import { FormEvent, useState } from 'react';
import { AuthApiError, enableMfa, enrollMfa } from '../../services/auth-api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface MfaProps {
  accessToken: string;
}

export function Mfa({ accessToken }: MfaProps) {
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'enrolled' | 'enabled' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);

  async function handleEnroll() {
    setSubmitting(true);
    try {
      const result = await enrollMfa(accessToken);
      setOtpauthUrl(result.otpauthUrl);
      setRecoveryCodes(result.recoveryCodes);
      setStatus('enrolled');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await enableMfa(accessToken, code);
      setStatus('enabled');
    } catch (err) {
      setStatus('error');
      void (err as AuthApiError);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'enabled') {
    return (
      <Card className="p-5">
        <div className="text-[15px] font-extrabold">Autenticación en dos pasos activada</div>
        <p className="mt-1 text-[12.5px] text-text-2">Guardá tus códigos de recuperación en un lugar seguro:</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {recoveryCodes.map((recoveryCode) => (
            <li key={recoveryCode} className="rounded-md bg-surface-2 px-3 py-1.5 font-mono text-[12.5px]">
              {recoveryCode}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (status === 'enrolled' || status === 'error') {
    return (
      <Card className="p-5">
        <div className="text-[15px] font-extrabold">Escaneá el código con tu app autenticadora</div>
        {otpauthUrl && <p className="mt-2 break-all rounded-md bg-surface-2 px-3 py-2 font-mono text-[11px] text-text-2">{otpauthUrl}</p>}
        <form onSubmit={handleConfirm} className="mt-4">
          <label htmlFor="mfa-enable-code" className="mb-1.5 block text-[12px] font-bold text-text-2">
            Código de verificación
          </label>
          <input
            id="mfa-enable-code"
            inputMode="numeric"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mb-3 w-full max-w-[200px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-accent focus:bg-surface"
          />
          {status === 'error' && <p className="mb-3 text-[12.5px] font-semibold text-red-text">Código incorrecto, probá de nuevo.</p>}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Confirmando…' : 'Confirmar'}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="flex items-center justify-between p-5">
      <div>
        <div className="text-[15px] font-extrabold">Autenticación en dos pasos</div>
        <p className="mt-1 text-[12.5px] text-text-2">Agregá una capa extra de seguridad a tu cuenta.</p>
      </div>
      <Button variant="primary" onClick={handleEnroll} disabled={submitting}>
        {submitting ? 'Generando…' : 'Activar'}
      </Button>
    </Card>
  );
}
