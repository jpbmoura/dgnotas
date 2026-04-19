import type { ReactNode } from 'react';
import { StarIcon } from './Logo';

const ITEMS = [
  {
    quote: (
      <>
        "Antes eu gastava 4 horas por semana conferindo planilha de nota. Hoje gasto{' '}
        <span className="italic text-[var(--accent)]">zero</span>. E quando preciso, a Rafa responde em 2 minutos."
      </>
    ),
    author: 'Camila Rocha',
    role: 'Mentora · 7 dígitos/ano',
    avatar: 'from-purple-400 to-pink-500',
    offset: false,
  },
  {
    quote: (
      <>
        "Fiz lançamento de R$ 1.2M num sábado. Tudo com split de 4 coprodutores. Zero erro. Zero ligação pra contador desesperada no domingo."
      </>
    ),
    author: 'Rafael Monteiro',
    role: 'Coach · 500k seguidores',
    avatar: 'from-blue-400 to-cyan-500',
    offset: true,
  },
  {
    quote: (
      <>
        "Vim de outro sistema onde falava com chatbot. Aqui eu tenho{' '}
        <span className="italic text-[var(--accent)]">nome, rosto e número</span> da pessoa que cuida das minhas notas."
      </>
    ),
    author: 'Diego Fontes',
    role: 'Infoprodutor · Nicho financeiro',
    avatar: 'from-emerald-400 to-teal-500',
    offset: false,
  },
];

export function Testimonials() {
  return (
    <section id="depoimentos" className="py-24 lg:py-32 bg-[var(--ink)] text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--accent)]/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-[var(--blue)]/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <div className="max-w-3xl mb-16 reveal">
          <div className="badge bg-white/10 text-white mb-6 border border-white/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
            Quem usa, indica
          </div>
          <h2 className="font-serif text-5xl lg:text-6xl leading-[1.05] mb-6">
            2.000 infoprodutores<br />
            <span className="italic text-white/60">dormindo em paz.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {ITEMS.map((t) => (
            <Testimonial key={t.author} quote={t.quote} author={t.author} role={t.role} avatar={t.avatar} offset={t.offset} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial({
  quote,
  author,
  role,
  avatar,
  offset,
}: {
  quote: ReactNode;
  author: string;
  role: string;
  avatar: string;
  offset: boolean;
}) {
  return (
    <div
      className={`reveal bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition ${
        offset ? 'md:translate-y-8' : ''
      }`}
    >
      <div className="flex gap-1 text-[var(--warn)] mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} />
        ))}
      </div>
      <p className="font-serif text-xl leading-snug mb-6">{quote}</p>
      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar}`} />
        <div>
          <div className="font-medium text-sm">{author}</div>
          <div className="text-xs text-white/60 font-mono">{role}</div>
        </div>
      </div>
    </div>
  );
}
