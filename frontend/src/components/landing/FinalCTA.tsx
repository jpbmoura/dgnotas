export function FinalCTA() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-soft)]/30 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div className="reveal">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--ink-muted)] mb-8 px-3 py-1.5 rounded-full border border-[var(--line)] bg-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75 pulse-dot" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
            </span>
            Comece hoje
          </div>

          <h2 className="font-serif text-5xl lg:text-7xl leading-[1.02] mb-6">
            Pare de perder sono com<br />
            <span className="italic">nota fiscal.</span>
          </h2>
          <p className="text-xl text-[var(--ink-muted)] mb-10 max-w-2xl mx-auto">
            Em 5 minutos tá tudo configurado. Você volta a focar em vender, a gente cuida da burocracia —
            com um especialista humano no WhatsApp sempre que precisar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#precos" className="btn-primary px-8 py-4 rounded-xl font-medium text-base inline-flex items-center justify-center gap-2">
              Começar agora
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#" className="btn-secondary px-8 py-4 rounded-xl font-medium text-base inline-flex items-center justify-center gap-2">
              Falar com especialista
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-[var(--ink-muted)]">
            {['Sem cartão de crédito', 'Sem taxa de adesão', 'Cancele quando quiser'].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--accent-deep)]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
