const PARTNERS = [
  { name: 'Hotmart', style: 'font-serif italic text-3xl' },
  { name: 'Kiwify', style: 'font-mono text-2xl font-medium' },
  { name: 'Eduzz', style: 'font-serif text-3xl' },
  { name: 'MONETIZZE', style: 'font-mono text-2xl font-medium tracking-tight' },
  { name: 'Guru', style: 'font-serif italic text-3xl' },
  { name: 'Green', style: 'font-mono text-2xl font-medium' },
  { name: 'Perfect Pay', style: 'font-serif text-3xl' },
  { name: 'PAGAR.ME', style: 'font-mono text-2xl font-medium tracking-tight' },
  { name: 'Hubla', style: 'font-serif italic text-3xl' },
  { name: 'Braip', style: 'font-mono text-2xl font-medium' },
];

export function Integrations() {
  return (
    <section id="integracoes" className="py-16 border-y border-[var(--line)] bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-10">
        <div className="divider-label text-xs font-mono uppercase tracking-widest">
          Integrado nativamente com
        </div>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div className="marquee-inner flex gap-16 items-center">
          {[0, 1].map((group) => (
            <div key={group} className="flex gap-16 items-center shrink-0">
              {PARTNERS.map((p) => (
                <span key={`${group}-${p.name}`} className={`${p.style} text-[var(--ink-muted)]`}>
                  {p.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
