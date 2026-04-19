import { StarIcon } from './Logo';

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
      <div className="hero-mesh" />
      <div className="absolute inset-0 grid-bg fade-mask-bottom opacity-40" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="reveal inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-8 px-3 py-1.5 rounded-full border border-[var(--line)] bg-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75 pulse-dot" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
            </span>
            Feito para infoprodutores brasileiros
          </div>

          <h1 className="reveal text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.02] mb-8">
            Suas notas fiscais,<br />
            <span className="font-serif italic text-[var(--ink-muted)]">com gente de verdade</span>
            <br />
            <span className="font-serif italic">cuidando.</span>
          </h1>

          <p className="reveal text-xl text-[var(--ink-muted)] leading-relaxed mb-10 max-w-2xl">
            Enquanto os outros te mandam pra um chatbot, aqui você fala com um especialista fiscal.
            Emissão automática de NF-e e NFS-e integrada com as principais plataformas — e um humano no WhatsApp quando você precisa.
          </p>

          <div className="reveal flex flex-col sm:flex-row gap-3 mb-12">
            <a href="#precos" className="btn-primary px-6 py-3.5 rounded-xl font-medium text-base inline-flex items-center justify-center gap-2">
              Começar teste gratuito
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#como-funciona" className="btn-secondary px-6 py-3.5 rounded-xl font-medium text-base inline-flex items-center justify-center gap-2">
              Ver como funciona
            </a>
          </div>

          <div className="reveal flex items-center gap-6 text-sm">
            <div className="flex -space-x-2">
              <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-orange-300 to-pink-400" />
              <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-blue-300 to-indigo-500" />
              <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-emerald-300 to-teal-500" />
              <div className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-purple-300 to-pink-500" />
              <div className="w-9 h-9 rounded-full border-2 border-white bg-[var(--ink)] text-white flex items-center justify-center text-[10px] font-mono">
                +2k
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[var(--warn)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
              <div className="text-[var(--ink-muted)]">
                Mais de <span className="text-[var(--ink)] font-medium">2.000 infoprodutores</span> emitindo com a gente
              </div>
            </div>
          </div>
        </div>

        <HeroDashboardMockup />
      </div>
    </section>
  );
}

function HeroDashboardMockup() {
  return (
    <div className="reveal mt-20 lg:mt-24 relative">
      <div className="hidden lg:block absolute -left-8 top-20 float z-10">
        <div className="card px-4 py-3 flex items-center gap-3 shadow-xl">
          <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--accent-deep)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium">NF-e emitida</div>
            <div className="text-xs text-[var(--ink-muted)] font-mono">R$ 497,00 · há 2s</div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute -right-4 top-40 float float-delay-1 z-10">
        <div className="card px-4 py-3 shadow-xl max-w-[260px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] pulse-dot" />
            <div className="text-xs font-mono text-[var(--ink-muted)] uppercase tracking-wider">Ana, sua especialista</div>
          </div>
          <div className="text-sm">"Resolvi seu split de co-produção. Já tá tudo certo 😊"</div>
        </div>
      </div>

      <div className="hidden lg:block absolute right-20 bottom-16 float float-delay-2 z-10">
        <div className="card px-4 py-3 flex items-center gap-3 shadow-xl">
          <div className="w-9 h-9 rounded-lg bg-[var(--blue-soft)] flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-[var(--blue)]">H</span>
          </div>
          <div>
            <div className="text-sm font-medium">Venda capturada</div>
            <div className="text-xs text-[var(--ink-muted)]">Hotmart · Curso Premium</div>
          </div>
        </div>
      </div>

      <div className="card p-2 shadow-2xl shadow-[var(--ink)]/10 relative">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--line)]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <div className="mx-auto text-xs font-mono text-[var(--ink-muted)] bg-[var(--line-soft)] px-3 py-1 rounded-md">
            app.dgnotas.com.br/dashboard
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0 h-[520px]">
          <aside className="col-span-2 border-r border-[var(--line)] py-6 px-3 bg-[var(--line-soft)]/40 hidden md:block">
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow-sm text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M3 12h18M3 6h18M3 18h12" />
                </svg>
                Notas
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--ink-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x={3} y={3} width={18} height={18} rx={2} />
                </svg>
                Integrações
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--ink-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M3 3v18h18M7 14l4-4 4 4 5-5" />
                </svg>
                Relatórios
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--ink-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx={12} cy={12} r={9} />
                  <path strokeLinecap="round" d="M12 7v5l3 2" />
                </svg>
                Retroativas
              </div>
            </div>

            <div className="mt-8 p-3 bg-[var(--ink)] text-white rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-300 to-pink-400" />
                <div className="text-xs">
                  <div className="font-medium">Ana</div>
                  <div className="text-white/60 text-[10px]">Sua especialista</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--accent)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
                Online
              </div>
            </div>
          </aside>

          <main className="col-span-12 md:col-span-10 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-2xl">Notas emitidas hoje</h3>
                <p className="text-xs text-[var(--ink-muted)] font-mono">Atualizado em tempo real</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium border border-[var(--line)] rounded-lg bg-white">Hoje</button>
                <button className="px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)]">Semana</button>
                <button className="px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)]">Mês</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-[var(--line)]">
                <div className="text-xs text-[var(--ink-muted)] font-mono uppercase tracking-wider mb-1">Emitidas</div>
                <div className="text-2xl font-medium">247</div>
                <div className="text-xs text-[var(--accent-deep)] font-mono mt-1">↑ 12%</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--line)]">
                <div className="text-xs text-[var(--ink-muted)] font-mono uppercase tracking-wider mb-1">Faturamento</div>
                <div className="text-2xl font-medium">R$ 84.3k</div>
                <div className="text-xs text-[var(--accent-deep)] font-mono mt-1">↑ 8%</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--accent-soft)]/40">
                <div className="text-xs text-[var(--accent-deep)] font-mono uppercase tracking-wider mb-1">Automação</div>
                <div className="text-2xl font-medium">100%</div>
                <div className="text-xs text-[var(--accent-deep)] font-mono mt-1">Zero erros</div>
              </div>
            </div>

            <div className="mb-6 hidden sm:block">
              <div className="flex items-end gap-2 h-20">
                {[
                  { h: '30%', d: '0.1s', bg: 'bg-[var(--line)]' },
                  { h: '55%', d: '0.2s', bg: 'bg-[var(--line)]' },
                  { h: '45%', d: '0.3s', bg: 'bg-[var(--line)]' },
                  { h: '70%', d: '0.4s', bg: 'bg-[var(--line)]' },
                  { h: '85%', d: '0.5s', bg: 'bg-[var(--accent)]' },
                  { h: '100%', d: '0.6s', bg: 'bg-[var(--ink)]' },
                  { h: '60%', d: '0.7s', bg: 'bg-[var(--line)]' },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`flex-1 bar rounded-t ${b.bg}`}
                    style={{ ['--h' as never]: b.h, animationDelay: b.d }}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--line)] pt-4">
              <div className="space-y-2">
                {[
                  { type: 'NFS-e', acc: true, name: 'João M. · Mentoria Premium', price: 'R$ 1.997,00', delay: '0.8s' },
                  { type: 'NF-e', acc: false, name: 'Marina S. · Curso Completo', price: 'R$ 497,00', delay: '0.9s' },
                  { type: 'NFS-e', acc: true, name: 'Pedro L. · Acesso Anual', price: 'R$ 2.497,00', delay: '1.0s' },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="nota-row flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--line-soft)]"
                    style={{ animationDelay: row.delay }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`badge ${
                          row.acc
                            ? 'bg-[var(--accent-soft)] text-[var(--accent-deep)]'
                            : 'bg-[var(--blue-soft)] text-[var(--blue)]'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${row.acc ? 'bg-[var(--accent)]' : 'bg-[var(--blue)]'}`} />
                        {row.type}
                      </div>
                      <span className="text-sm">{row.name}</span>
                    </div>
                    <div className="font-mono text-sm text-[var(--ink-muted)]">{row.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
