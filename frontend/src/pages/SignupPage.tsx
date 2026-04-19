import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { FormField } from '../components/FormField';
import { signUp } from '../lib/auth-client';

export function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Senha precisa de pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp.email({ name, email, password });
    setLoading(false);

    if (signUpError) {
      if (signUpError.status === 422 || signUpError.code === 'USER_ALREADY_EXISTS') {
        setError('Já existe uma conta com esse e-mail. Que tal entrar?');
        return;
      }
      setError('Não deu pra criar a conta agora. Tenta de novo em instantes.');
      return;
    }

    navigate('/app', { replace: true });
  }

  return (
    <AuthShell
      eyebrow="Criar conta"
      title={
        <>
          Sua primeira nota sai em <em className="font-serif italic">minutos</em>.
        </>
      }
      subtitle="Cria sua conta e a gente conecta sua plataforma de vendas no próximo passo."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="text-[var(--ink)] font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          label="Nome"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Como a gente te chama?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Use letras, números e símbolos pra dificultar a vida de quem não é você."
          required
          minLength={8}
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
          {loading ? 'Criando sua conta...' : 'Criar conta'}
        </button>

        <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
          Ao criar a conta, você concorda com os Termos e a Política de Privacidade do DGNotas.
        </p>
      </form>
    </AuthShell>
  );
}
