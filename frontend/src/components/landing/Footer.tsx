import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <Logo />
              <span className="font-serif text-xl tracking-tight">DGNotas</span>
            </a>
            <p className="text-sm text-[var(--ink-muted)] max-w-xs">
              Emissão de notas fiscais para infoprodutores, com um humano cuidando do que o bot não entende.
            </p>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-4">Produto</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#como-funciona" className="hover:text-[var(--accent-deep)] transition">Como funciona</a></li>
              <li><a href="#integracoes" className="hover:text-[var(--accent-deep)] transition">Integrações</a></li>
              <li><a href="#precos" className="hover:text-[var(--accent-deep)] transition">Planos</a></li>
              <li><a href="#faq" className="hover:text-[var(--accent-deep)] transition">FAQ</a></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-4">Contato</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-[var(--accent-deep)] transition">WhatsApp</a></li>
              <li>
                <a href="mailto:contato@dgnotas.com.br" className="hover:text-[var(--accent-deep)] transition">
                  contato@dgnotas.com.br
                </a>
              </li>
              <li><a href="#" className="hover:text-[var(--accent-deep)] transition">Instagram</a></li>
              <li><a href="#" className="hover:text-[var(--accent-deep)] transition">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--line)] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center text-xs text-[var(--ink-muted)]">
          <div>© {new Date().getFullYear()} DG Notas · Todos os direitos reservados</div>
          <div className="flex gap-6 font-mono">
            <a href="#" className="hover:text-[var(--ink)] transition">Termos de uso</a>
            <a href="#" className="hover:text-[var(--ink)] transition">Política de privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
