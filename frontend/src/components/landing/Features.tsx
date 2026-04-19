export function Features() {
  return (
    <section className="py-24 lg:py-32 bg-white border-y border-[var(--line)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mb-16 reveal">
          <div className="badge bg-[var(--blue-soft)] text-[var(--blue)] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--blue)]" />
            Recursos
          </div>
          <h2 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
            Tudo que você precisa pra emitir.<br />
            <span className="italic text-[var(--ink-muted)]">Nada que você não precisa.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-8 md:col-span-2 md:row-span-2 relative overflow-hidden group reveal">
            <div className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)] mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
              Automação total
            </div>
            <h3 className="font-serif text-3xl mb-3">Emissão automática e inteligente</h3>
            <p className="text-[var(--ink-muted)] mb-6 max-w-md">
              Assim que a venda cai, a nota sai. NF-e, NFS-e ou híbrido — você define a regra uma vez e o DGNotas roda pra sempre.
            </p>

            <div className="mt-8 grid grid-cols-4 gap-2 items-center">
              <div className="bg-[var(--line-soft)] rounded-xl p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-[var(--ink-muted)] mb-1">01</div>
                <div className="text-xs font-medium">Venda na plataforma</div>
              </div>
              <Arrow />
              <div className="bg-[var(--line-soft)] rounded-xl p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-[var(--ink-muted)] mb-1">02</div>
                <div className="text-xs font-medium">DGNotas captura</div>
              </div>
              <Arrow />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 items-center">
              <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-xl p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-[var(--accent-deep)] mb-1">03</div>
                <div className="text-xs font-medium">Nota emitida ✓</div>
              </div>
              <Arrow />
              <div className="bg-[var(--line-soft)] rounded-xl p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-[var(--ink-muted)] mb-1">04</div>
                <div className="text-xs font-medium">Enviada ao cliente</div>
              </div>
              <div />
            </div>
          </div>

          <FeatureCard
            iconBg="bg-[var(--blue-soft)]"
            iconColor="text-[var(--blue)]"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            }
            title="Split de coprodução"
            text="Divisão automática entre coprodutores, com tributação exata no percentual de cada um."
          />
          <FeatureCard
            iconBg="bg-[var(--accent-soft)]"
            iconColor="text-[var(--accent-deep)]"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            }
            title="Certificado digital"
            text="Emissão e renovação incluídas no plano. Sem dor de cabeça com corretor."
          />
          <FeatureCard
            iconBg="bg-[var(--line-soft)]"
            iconColor=""
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            }
            title="Retroativas em 1 clique"
            text="Importe vendas antigas por planilha e emita em lote. Sem pânico na Receita."
          />
          <FeatureCard
            iconBg="bg-[var(--line-soft)]"
            iconColor=""
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            }
            title="Estorno & cancelamento"
            text="Até fora do prazo. A gente cuida da operação reversa pra você não perder no imposto."
          />

          <div className="card p-6 md:col-span-2 reveal relative overflow-hidden">
            <div className="flex justify-between items-start gap-6">
              <div className="flex-1">
                <div className="w-10 h-10 rounded-lg bg-[var(--blue-soft)] flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[var(--blue)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="font-medium text-lg mb-2">Relatórios e fechamento mensal</h3>
                <p className="text-sm text-[var(--ink-muted)] max-w-md">
                  XML, PDF e Excel. Conciliação entre plataformas e sistema. Seu contador vai te amar.
                </p>
              </div>
              <div className="hidden md:flex flex-col gap-1 mt-2">
                {['.XML', '.PDF', '.XLSX'].map((f) => (
                  <div key={f} className="bg-[var(--line-soft)] rounded-lg px-3 py-2 font-mono text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg className="w-full text-[var(--line)]" viewBox="0 0 40 10" fill="none">
      <path d="M0 5 H36 M32 1 L36 5 L32 9" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function FeatureCard({
  iconBg,
  iconColor,
  icon,
  title,
  text,
}: {
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="card p-6 reveal">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center mb-4`}>
        <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      <p className="text-sm text-[var(--ink-muted)]">{text}</p>
    </div>
  );
}
