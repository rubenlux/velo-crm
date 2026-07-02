import { FormEvent, useState } from 'react';
import { AuthApiError, enableMfa, enrollMfa } from '../../services/auth-api';

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
      <section>
        <h2>Autenticación en dos pasos activada</h2>
        <p>Guardá tus códigos de recuperación en un lugar seguro:</p>
        <ul>
          {recoveryCodes.map((recoveryCode) => (
            <li key={recoveryCode}>
              <code>{recoveryCode}</code>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (status === 'enrolled' || status === 'error') {
    return (
      <section>
        <h2>Escaneá el código con tu app autenticadora</h2>
        {otpauthUrl && <p>{otpauthUrl}</p>}
        <form onSubmit={handleConfirm}>
          <label htmlFor="mfa-enable-code">Código de verificación</label>
          <input
            id="mfa-enable-code"
            inputMode="numeric"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          {status === 'error' && <p role="alert">Código incorrecto, probá de nuevo.</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Confirmando…' : 'Confirmar'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section>
      <h2>Autenticación en dos pasos</h2>
      <button type="button" onClick={handleEnroll} disabled={submitting}>
        {submitting ? 'Generando…' : 'Activar autenticación en dos pasos'}
      </button>
    </section>
  );
}
