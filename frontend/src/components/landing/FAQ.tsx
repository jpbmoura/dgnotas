import { WhatsAppIcon } from './Logo';

const ITEMS: { q: string; a: string; open?: boolean }[] = [
  {
    q: 'Preciso instalar alguma coisa no meu computador?',
    a: 'Nada. DGNotas é 100% na nuvem. Você acessa de qualquer navegador, em qualquer dispositivo. Seu computador pode até pifar que suas notas continuam sendo emitidas normalmente.',
    open: true,
  },
  {
    q: 'Como integro com minha plataforma de vendas?',
    a: 'Após contratar, você recebe um e-mail com o passo a passo da integração (geralmente leva 5 minutos). Se travar em qualquer parte, seu especialista assume e faz por você via Google Meet. Suporte completo de onboarding, sem custo extra.',
  },
  {
    q: 'E se eu passar do volume de notas do meu plano?',
    a: 'Cobramos uma taxa por nota excedente (R$ 0,47 a R$ 0,77, dependendo do plano). Sem corte de serviço, sem susto. Se você está constantemente excedendo, seu especialista te liga pra conversar sobre upgrade — que geralmente fica mais barato que pagar excedentes.',
  },
  {
    q: 'Preciso de certificado digital? Como faço?',
    a: 'Sim, é exigência da Receita. A boa notícia: ajudamos você a emitir ou renovar. No plano Enterprise, o certificado já vem incluído. Nos outros, indicamos um parceiro com desconto pra clientes DGNotas.',
  },
  {
    q: 'Tem multa se eu cancelar?',
    a: 'Zero multa. Se não for pra você, é só avisar. Acreditamos que ninguém precisa ser preso numa ferramenta — se o DGNotas é bom, você fica. Se não, fica à vontade pra sair.',
  },
  {
    q: 'O que é split de coprodução e como funciona aqui?',
    a: 'Split é a divisão da emissão de notas entre coprodutores — cada um é tributado conforme seu percentual de responsabilidade. No DGNotas, você configura uma vez e a divisão acontece automaticamente a cada venda, sem precisar rodar planilha manualmente ou brigar com contador no fim do mês.',
  },
  {
    q: 'Consigo emitir notas de vendas antigas (retroativas)?',
    a: 'Sim, a partir do plano Controle você pode importar vendas antigas via planilha e emitir em lote. Perfeito pra quem tá regularizando a operação ou migrando de outro sistema.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 lg:py-32 bg-white border-t border-[var(--line)]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="mb-16 reveal">
          <div className="badge bg-[var(--line-soft)] text-[var(--ink-muted)] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)]" />
            Dúvidas frequentes
          </div>
          <h2 className="font-serif text-5xl lg:text-6xl leading-[1.05]">
            Perguntas que todo<br />
            <span className="italic">infoprodutor faz.</span>
          </h2>
        </div>

        <div className="space-y-3">
          {ITEMS.map((item) => (
            <details key={item.q} className="card p-6 reveal group" open={item.open}>
              <summary className="flex items-center justify-between gap-4">
                <span className="font-medium text-lg">{item.q}</span>
                <span className="faq-icon w-8 h-8 rounded-full bg-[var(--line-soft)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <div className="mt-4 text-[var(--ink-muted)] leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>

        <div className="reveal mt-12 text-center p-8 rounded-2xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--blue-soft)]">
          <div className="flex -space-x-2 justify-center mb-4">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-orange-300 to-pink-400" />
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-blue-300 to-indigo-500" />
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-emerald-300 to-teal-500" />
          </div>
          <h3 className="font-serif text-2xl mb-2">Ainda tem dúvida?</h3>
          <p className="text-[var(--ink-muted)] mb-6 max-w-md mx-auto">
            Fala com um especialista humano no WhatsApp. Resposta em minutos, de verdade.
          </p>
          <a href="#" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm">
            <WhatsAppIcon className="w-4 h-4" />
            Conversar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
