import { WhatsAppIcon } from './Logo';

export function HumanSupport() {
  return (
    <section className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <div className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)] mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
              O diferencial
            </div>
            <h2 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
              Chatbot não entende
              <br />
              de <span className="italic">co-produção</span>.
            </h2>
            <p className="text-lg text-[var(--ink-muted)] leading-relaxed mb-6">
              Cada cliente do DGNotas tem um <strong className="text-[var(--ink)] font-medium">especialista fiscal humano</strong> dedicado.
              Não é menu de atendimento. Não é "vou transferir para o setor responsável".
              É uma pessoa real, no seu WhatsApp, que conhece seu negócio e resolve.
            </p>
            <p className="text-lg text-[var(--ink-muted)] leading-relaxed mb-8">
              Split entre coprodutores, estorno fora do prazo, emissão retroativa, dúvida de ICMS.
              Você escreve, um humano responde em minutos.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-l-2 border-[var(--accent)] pl-4">
                <div className="font-serif text-3xl mb-1">&lt; 5min</div>
                <div className="text-xs text-[var(--ink-muted)] font-mono uppercase tracking-wider">Tempo médio de resposta</div>
              </div>
              <div className="border-l-2 border-[var(--accent)] pl-4">
                <div className="font-serif text-3xl mb-1">1 pra 1</div>
                <div className="text-xs text-[var(--ink-muted)] font-mono uppercase tracking-wider">Especialista dedicado</div>
              </div>
            </div>
          </div>

          <div className="reveal relative">
            <div className="absolute -inset-8 bg-gradient-to-br from-[var(--accent-soft)] to-transparent rounded-3xl -z-10" />

            <div className="card p-6 shadow-xl max-w-md mx-auto">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--line)] mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-300 to-pink-400 relative">
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--accent)] border-2 border-white" />
                </div>
                <div>
                  <div className="font-medium">Ana Pereira</div>
                  <div className="text-xs text-[var(--ink-muted)] font-mono">Sua especialista · Online</div>
                </div>
                <WhatsAppIcon className="ml-auto w-5 h-5 text-[var(--accent-deep)]" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-[var(--ink)] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                    <p className="text-sm">Ana, preciso fazer split de 3 coprodutores num lançamento gigante. Como faço?</p>
                    <div className="text-[10px] text-white/50 font-mono mt-1">14:32</div>
                  </div>
                </div>

                <div className="flex">
                  <div className="bg-[var(--line-soft)] px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%]">
                    <p className="text-sm">
                      Tranquilo! Já deixei tudo configurado no seu painel. Cada um vai ser tributado no percentual certinho,
                      automaticamente a cada venda ✨
                    </p>
                    <div className="text-[10px] text-[var(--ink-muted)] font-mono mt-1">14:34 · lida</div>
                  </div>
                </div>

                <div className="flex">
                  <div className="bg-[var(--line-soft)] px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%]">
                    <p className="text-sm">Qualquer coisa, me chama aqui 🤝</p>
                    <div className="text-[10px] text-[var(--ink-muted)] font-mono mt-1">14:34</div>
                  </div>
                </div>

                <div className="flex gap-1 items-center pt-2 pl-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)] opacity-40 pulse-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)] opacity-40 pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)] opacity-40 pulse-dot" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
