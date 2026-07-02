import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../services/auth-api';

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
      <main>
        <h1>Revisá tu email</h1>
        <p>Si el email existe, te enviamos un enlace para restablecer tu contraseña.</p>
        <Link to="/login">Volver a iniciar sesión</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Olvidé mi contraseña</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
      <Link to="/login">Volver a iniciar sesión</Link>
    </main>
  );
}
