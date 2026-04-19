const STEPS = [
  {
    n: '01',
    title: 'Crie sua conta',
    text: 'Cadastro rápido, sem cartão de crédito. Você recebe um e-mail com código de validação e já tá dentro.',
  },
  {
    n: '02',
    title: 'Conecte sua plataforma',
    text: 'Escolha Hotmart, Kiwify, Eduzz (ou qualquer outra). A integração é em poucos cliques — e se travar, a Ana te chama no WhatsApp.',
  },
  {
    n: '03',
    title: 'Configure as regras',
    text: 'Tipo de nota (NF-e, NFS-e ou híbrido), CNAE, percentuais de tributação. Não sabe como configurar? Seu especialista configura pra você.',
  },
  {
    n: '04',
    title: 'Durma tranquilo',
    text: 'A partir daqui é automático. Venda cai → nota sai → cliente recebe por e-mail. Você foca em vender, a gente cuida do resto.',
    highlight: true,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mb-16 reveal">
          <div className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            Processo
          </div>
          <h2 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
            Em <span className="italic">5 minutos</span>
            <br />
            você tá emitindo.
          </h2>
          <p className="text-lg text-[var(--ink-muted)]">
            Sem burocracia de onboarding, sem semanas de setup. Configurou, começou.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-[var(--line)] via-[var(--accent)] to-[var(--line)] hidden md:block" />

          <div className="space-y-12">
            {STEPS.map((s) => (
              <div key={s.n} className="reveal flex gap-6 md:gap-10">
                <div className="relative shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full border-2 border-[var(--ink)] flex items-center justify-center font-mono font-medium text-lg ${
                      s.highlight ? 'bg-[var(--ink)] text-white' : 'bg-white'
                    }`}
                  >
                    {s.n}
                  </div>
                  {s.highlight && (
                    <div className="absolute -inset-1 rounded-full bg-[var(--accent)]/20 -z-10 pulse-dot" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-serif text-2xl mb-2">{s.title}</h3>
                  <p className="text-[var(--ink-muted)] max-w-xl">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
