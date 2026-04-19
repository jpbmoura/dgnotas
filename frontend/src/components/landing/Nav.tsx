import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 border-b border-[var(--line)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <Logo />
          <span className="font-serif text-xl tracking-tight">DGNotas</span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-[var(--ink-muted)]">
          <a href="#como-funciona" className="hover:text-[var(--ink)] transition">Como funciona</a>
          <a href="#integracoes" className="hover:text-[var(--ink)] transition">Integrações</a>
          <a href="#precos" className="hover:text-[var(--ink)] transition">Planos</a>
          <a href="#depoimentos" className="hover:text-[var(--ink)] transition">Clientes</a>
          <a href="#faq" className="hover:text-[var(--ink)] transition">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/entrar" className="hidden sm:inline text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition">
            Entrar
          </Link>
          <Link to="/cadastro" className="btn-primary text-sm px-4 py-2 rounded-lg font-medium">
            Começar agora →
          </Link>
        </div>
      </div>
    </nav>
  );
}
