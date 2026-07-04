import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../services/auth-api';
import { AuthLayout, AuthInput, AuthSubmit } from './AuthLayout';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } finally {
      // The API never reveals whether the email exists, so the UI never should either.
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Revisá tu email" subtitle="Si el email existe, te enviamos un enlace para restablecer tu contraseña.">
        <Link to="/login" className="text-[12.5px] font-bold text-accent">
          Volver a iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Olvidé mi contraseña">
      <form onSubmit={handleSubmit}>
        <AuthInput id="forgot-email" label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <AuthSubmit submitting={submitting}>{submitting ? 'Enviando…' : 'Enviar enlace'}</AuthSubmit>
      </form>
      <Link to="/login" className="mt-5 block text-center text-[12.5px] font-bold text-accent">
        Volver a iniciar sesión
      </Link>
    </AuthLayout>
  );
}
