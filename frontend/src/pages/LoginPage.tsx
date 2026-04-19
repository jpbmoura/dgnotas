import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { FormField } from '../components/FormField';
import { signIn } from '../lib/auth-client';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn.email({ email, password });

    setLoading(false);

    if (signInError) {
      setError('E-mail ou senha não conferem. Confere os dados e tenta de novo.');
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <AuthShell
      eyebrow="Entrar"
      title={
        <>
          Bem-vindo de <em className="font-serif italic">volta</em>.
        </>
      }
      subtitle="Acessa sua conta pra emitir e acompanhar suas notas."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="text-[var(--ink)] font-medium hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="email@exemplo.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormField
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? (
          <div className="rounded-lg border border-[var(--warn)] bg-[var(--warn)]/10 px-4 py-3 text-sm text-[var(--ink)]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  );
}
