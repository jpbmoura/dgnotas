import { useState } from 'react';

type Billing = 'annual' | 'monthly';

type Plan = {
  tag: string;
  tagColor: string;
  name: string;
  subtitle: string;
  price: { annual: number; monthly: number };
  annualTotal: string;
  volume: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    tag: 'Início',
    tagColor: 'text-[var(--ink-muted)]',
    name: 'Essencial',
    subtitle: 'Para quem tá começando a escalar',
    price: { annual: 102, monthly: 137 },
    annualTotal: 'R$ 1.227 cobrado anualmente',
    volume: '100 notas/mês · R$ 0,77 excedente',
    features: [
      'Integração com todas as plataformas',
      'Emissão automática NF-e e NFS-e',
      'Envio automático ao cliente',
      'Especialista humano no WhatsApp',
      'Split de coprodução',
      'Relatórios XML, PDF e Excel',
    ],
    cta: 'Começar com Essencial',
  },
  {
    tag: 'Escala',
    tagColor: 'text-[var(--accent)]',
    name: 'Controle',
    subtitle: 'Para quem vende todo dia',
    price: { annual: 191, monthly: 247 },
    annualTotal: 'R$ 2.297 cobrado anualmente',
    volume: '1.000 notas/mês · R$ 0,47 excedente',
    features: [
      'Tudo do Essencial',
      'Importação de vendas antigas',
      'Emissão retroativa em lote',
      'Conciliação automática',
      'Suporte por Google Meet',
      'Validação de NFs antigas',
    ],
    cta: 'Começar com Controle →',
    featured: true,
  },
  {
    tag: 'Avançado',
    tagColor: 'text-[var(--ink-muted)]',
    name: 'Plus',
    subtitle: 'Para lançamentos grandes',
    price: { annual: 259, monthly: 337 },
    annualTotal: 'R$ 3.119 cobrado anualmente',
    volume: '2.000 notas/mês · R$ 0,47 excedente',
    features: [
      'Tudo do Controle',
      'Volume dobrado de notas',
      'Suporte prioritário',
      'Configuração assistida',
      'Emissão via planilha',
      'Relatórios customizados',
    ],
    cta: 'Começar com Plus',
  },
];

export function Pricing() {
  const [billing, setBilling] = useState<Billing>('annual');

  return (
    <section id="precos" className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 reveal">
          <div className="badge bg-[var(--blue-soft)] text-[var(--blue)] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--blue)]" />
            Planos
          </div>
          <h2 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
            Escolha o tamanho<br />
            <span className="italic">da sua operação.</span>
          </h2>
          <p className="text-lg text-[var(--ink-muted)] mb-10">
            Sem taxa de adesão. Sem multa de cancelamento. Suporte humano em todos os planos.
          </p>

          <div className="toggle-track">
            <div
              className="toggle-thumb"
              style={
                billing === 'annual'
                  ? { left: 4, width: 'calc(50% - 4px)' }
                  : { left: '50%', width: 'calc(50% - 4px)' }
              }
            />
            <button
              onClick={() => setBilling('annual')}
              className={`relative z-10 px-5 py-2 rounded-full text-sm font-medium transition ${
                billing === 'annual' ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
              }`}
            >
              Anual <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)] ml-1">-25%</span>
            </button>
            <button
              onClick={() => setBilling('monthly')}
              className={`relative z-10 px-5 py-2 rounded-full text-sm font-medium transition ${
                billing === 'monthly' ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
              }`}
            >
              Mensal
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} billing={billing} />
          ))}
        </div>

        <div className="reveal mt-8 max-w-6xl mx-auto bg-gradient-to-r from-[var(--line-soft)] to-white border border-[var(--line)] rounded-2xl p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-serif text-2xl">Enterprise</h3>
              <div className="badge bg-[var(--ink)] text-white">Sob medida</div>
            </div>
            <p className="text-[var(--ink-muted)] text-sm max-w-lg">
              Volume alto, operação complexa, equipe grande? Montamos um plano com CS dedicado, BPO de faturamento e volume acumulativo.
            </p>
          </div>
          <a href="#" className="btn-primary px-6 py-3 rounded-xl font-medium text-sm whitespace-nowrap">
            Falar com vendas →
          </a>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const featured = Boolean(plan.featured);
  const checkColor = featured ? 'text-[var(--accent)]' : 'text-[var(--accent-deep)]';
  const subtitleColor = featured ? 'text-white/60' : 'text-[var(--ink-muted)]';
  const borderColor = featured ? 'border-white/10' : 'border-[var(--line)]';

  return (
    <div className={`plan-card card p-8 reveal relative ${featured ? 'featured md:-translate-y-4' : ''}`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="badge bg-[var(--accent)] text-[var(--ink)] px-3 py-1 font-medium">Mais popular</div>
        </div>
      )}
      <div className="mb-6">
        <div className={`font-mono text-xs uppercase tracking-widest ${plan.tagColor} mb-2`}>{plan.tag}</div>
        <h3 className="font-serif text-3xl mb-1">{plan.name}</h3>
        <p className={`text-sm ${subtitleColor}`}>{plan.subtitle}</p>
      </div>

      <div className={`mb-6 pb-6 border-b ${borderColor}`}>
        <div className="flex items-baseline gap-1">
          <span className="text-sm">R$</span>
          <span className="font-serif text-5xl">{plan.price[billing]}</span>
          <span className={`text-sm ${subtitleColor}`}>/mês</span>
        </div>
        <div className={`text-xs ${subtitleColor} font-mono mt-2`}>
          {billing === 'annual' ? plan.annualTotal : 'Cobrança mensal recorrente'}
        </div>
        <div className="text-sm mt-3 font-medium">{plan.volume}</div>
      </div>

      <ul className="space-y-3 mb-8 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className={`mt-0.5 ${checkColor}`}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {featured ? (
        <a
          href="#"
          className="w-full py-3 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--accent)]/90 transition"
        >
          {plan.cta}
        </a>
      ) : (
        <a href="#" className="btn-secondary w-full py-3 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2">
          {plan.cta}
        </a>
      )}
    </div>
  );
}
