import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './landing/Logo';

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[var(--bg)]">
      {/* Lado esquerdo — marca + ambiente */}
      <aside className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden border-r border-[var(--line)]">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="hero-mesh" />

        <Link to="/" className="relative z-10 inline-flex items-center gap-2 w-fit">
          <Logo />
          <span className="font-serif text-xl tracking-tight">DGNotas</span>
        </Link>

        <div className="relative z-10">
          <p className="text-3xl leading-tight text-[var(--ink)]">
            Emita suas notas <em className="font-serif italic text-[var(--ink-soft)]">em segundos</em>,
            sem brigar com a prefeitura.
          </p>
          <p className="mt-4 text-sm text-[var(--ink-muted)] max-w-md">
            A Ana e o time cuidam da parte chata. Você cuida do que faz a empresa crescer.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] pulse-dot" />
          <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Ao vivo · 2 mil+ users
          </span>
        </div>
      </aside>

      {/* Lado direito — form */}
      <main className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="md:hidden inline-flex items-center gap-2 mb-8">
            <Logo />
            <span className="font-serif text-xl tracking-tight">DGNotas</span>
          </Link>

          <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            {eyebrow}
          </span>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--ink)] leading-tight">{title}</h1>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-sm text-[var(--ink-muted)]">{footer}</div>
        </div>
      </main>
    </div>
  );
}
