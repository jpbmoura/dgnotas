# COMPONENTS — DGNotas

Padrões canônicos extraídos do manual de marca. Use como ponto de partida para qualquer componente novo. Sempre referencie tokens de [TOKENS.md](TOKENS.md) — nunca hardcode hex ou fonte.

Exemplos em JSX + Tailwind v4. Ajuste a sintaxe se o framework for diferente (HTML puro, Astro, Svelte), mas mantenha as classes.

---

## Botão primário

Ação principal da tela. Sempre Ink no fundo, Accent como highlight secundário, texto claro. Usado em "Começar agora", "Emitir nota", "Salvar".

```jsx
<button
  className="inline-flex items-center justify-center gap-2
             h-12 px-6 rounded-button
             bg-ink text-white font-sans font-medium text-sm
             hover:bg-ink-soft active:bg-ink-soft
             transition-colors"
>
  Começar agora
</button>
```

Variante Accent (CTA de conversão em landing):

```jsx
<button
  className="inline-flex items-center justify-center gap-2
             h-12 px-6 rounded-button
             bg-accent text-white font-sans font-medium text-sm
             hover:bg-accent-deep
             transition-colors"
>
  Emitir minha primeira nota
</button>
```

**Regras invioláveis**

- Altura `48px` (lg) ou `36px` (md). Nada no meio.
- `rounded-button` (8px). Nunca `rounded-full` — isso é pílula, não botão.
- Hover **sempre** vai para a variante `-soft`/`-deep` da mesma família (Ink → Ink Soft, Accent → Accent Deep).

---

## Botão secundário

Ação de apoio ("Ver planos", "Cancelar"). Outline sobre BG.

```jsx
<button
  className="inline-flex items-center justify-center gap-2
             h-12 px-6 rounded-button
             bg-bg-card text-ink font-sans font-medium text-sm
             border border-line
             hover:bg-line-soft
             transition-colors"
>
  Ver planos
</button>
```

**Regras invioláveis**

- Fundo `bg-card` (branco), borda `line`, texto `ink`.
- Mesmo raio e altura do primário — só muda a cor/peso.

---

## Card

Container de feature, métrica ou bloco de conteúdo.

```jsx
<div
  className="bg-bg-card border border-line rounded-card p-6
             transition-transform duration-200
             hover:-translate-y-0.5"
>
  <h3 className="font-sans text-ink font-semibold text-base">Automático</h3>
  <p className="mt-2 font-sans text-ink-muted text-sm leading-relaxed">
    Emissão em segundos.
  </p>
</div>
```

**Regras invioláveis**

- `rounded-card` (16px), `border border-line` de 1px, fundo `bg-card`.
- Hover: `translateY(-2px)` (`-translate-y-0.5`). Sem sombra (sombra é TODO — ver [TOKENS.md](TOKENS.md)).
- Título em Geist semibold + `text-ink`. Subtítulo/corpo em `text-ink-muted`.

---

## Input de formulário

```jsx
<label className="block">
  <span className="font-mono text-caption uppercase tracking-[0.02em] text-ink-muted">
    E-mail
  </span>
  <input
    type="email"
    placeholder="email@exemplo.com.br"
    className="mt-2 block w-full h-12 px-4 rounded-button
               bg-bg-card border border-line
               font-sans text-sm text-ink
               placeholder:text-ink-muted
               focus:outline-none focus:border-ink
               transition-colors"
  />
</label>
```

**Regras invioláveis**

- Mesmo raio (`rounded-button` 8px) e altura (48px) do botão primário — formulários ficam alinhados.
- Label em Geist Mono CAPS + tracking 0.02em, cor `ink-muted`.
- Placeholder em `ink-muted`. Texto digitado em `ink`.
- TODO: o manual não define cor de foco; aqui estou usando `border-ink` como padrão seguro. Confirmar com o João.

---

## Badge / Pílula

Usada para status, categoria, metadado. Sempre Geist Mono CAPS.

```jsx
{
  /* Sucesso */
}
<span
  className="inline-flex items-center gap-1.5
                 rounded-pill px-2.5 py-1
                 font-mono text-[12px] uppercase tracking-[0.02em]
                 bg-accent-soft text-accent-deep"
>
  Emitida
</span>;

{
  /* Info */
}
<span
  className="inline-flex items-center gap-1.5
                 rounded-pill px-2.5 py-1
                 font-mono text-[12px] uppercase tracking-[0.02em]
                 bg-blue-soft text-blue"
>
  Novo
</span>;

{
  /* Atenção */
}
<span
  className="inline-flex items-center gap-1.5
                 rounded-pill px-2.5 py-1
                 font-mono text-[12px] uppercase tracking-[0.02em]
                 bg-[var(--color-warn-bg)] text-[var(--color-warn-fg)]"
>
  Pendente
</span>;

{
  /* Erro */
}
<span
  className="inline-flex items-center gap-1.5
                 rounded-pill px-2.5 py-1
                 font-mono text-[12px] uppercase tracking-[0.02em]
                 bg-[var(--color-err-bg)] text-[var(--color-err-fg)]"
>
  Cancelada
</span>;

{
  /* Neutro */
}
<span
  className="inline-flex items-center gap-1.5
                 rounded-pill px-2.5 py-1
                 font-mono text-[12px] uppercase tracking-[0.02em]
                 bg-line-soft text-ink"
>
  Rascunho
</span>;

{
  /* Ink — para destaque forte, ex.: "2 MIL+ USERS" */
}
<span
  className="inline-flex items-center gap-1.5
                 rounded-pill px-2.5 py-1
                 font-mono text-[12px] uppercase tracking-[0.02em]
                 bg-ink text-white"
>
  2 mil+ users
</span>;
```

**Regras invioláveis**

- `rounded-pill` (999px), `px-2.5 py-1` (4px 10px), `font-mono`, `text-[12px]`, uppercase, tracking `0.02em`.
- Cada estado tem par fixo bg + fg — nunca misture (ex.: nunca `bg-accent-soft` com `text-blue`).
- Texto curto. Badge não é parágrafo.

---

## Hero section (landing)

Bloco inicial da landing page. Combina H1 em Geist, uma palavra-chave em Instrument Serif italic, subtítulo em Geist e CTA Ink.

```jsx
<section className="relative overflow-hidden bg-bg">
  {/* Grid background — ver próximo componente */}
  <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />

  <div className="relative mx-auto max-w-[1280px] px-6 md:px-8 py-24 md:py-32">
    <span className="font-mono text-caption uppercase tracking-[0.02em] text-ink-muted">
      Ao vivo · 2K users
    </span>

    <h1 className="mt-6 font-sans font-semibold text-ink text-h1">
      Emita suas notas{" "}
      <em className="font-serif italic text-ink-soft">em segundos</em>.
    </h1>

    <p className="mt-6 max-w-xl font-sans text-ink-muted text-base leading-relaxed">
      Suporte humano real, integração com Hotmart e Kiwify, emissão em segundos.
    </p>

    <div className="mt-8 flex flex-wrap gap-3">
      <button className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-button bg-ink text-white font-sans font-medium text-sm hover:bg-ink-soft transition-colors">
        Começar agora
      </button>
      <button className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-button bg-bg-card text-ink border border-line font-sans font-medium text-sm hover:bg-line-soft transition-colors">
        Ver planos
      </button>
    </div>
  </div>
</section>
```

**Regras invioláveis**

- Container `max-w-[1280px]` + `px-6 md:px-8` (24/32px).
- H1 em Geist semibold. Uma palavra-chave (no máximo) em Instrument Serif italic para dar personalidade.
- Subtítulo em `text-ink-muted`, nunca `text-ink`.
- CTA primário Ink, secundário outline. Ordem sempre: primário → secundário.

---

## Grid background

Textura sutil de malha para hero e seções de destaque.

```jsx
{
  /* Classe utilitária — definir no CSS global */
}
<div className="bg-grid" />;
```

CSS global:

```css
@layer utilities {
  .bg-grid {
    background-image:
      linear-gradient(to right, var(--color-line) 1px, transparent 1px),
      linear-gradient(to bottom, var(--color-line) 1px, transparent 1px);
    background-size: var(--grid-size) var(--grid-size);
    background-color: var(--color-bg);
  }
}
```

**Regras invioláveis**

- Malha `64×64px` (`--grid-size`).
- Cor `var(--color-line)` sobre `var(--color-bg)` — **sempre sutil**. Se aparecer demais, abaixe `opacity`.
- É textura, nunca elemento dominante. Não use em cima de conteúdo já denso.

---

## TODO — componentes que o manual NÃO cobre

Os itens abaixo foram pedidos ou são comuns, mas **não estão no manual**. Não criei exemplo — pergunte ao João antes de usar.

- **Modal / Dialog** — não mencionado.
- **Dropdown / Select** — não mencionado.
- **Tabs** — não mencionado.
- **Tabela** — não mencionado.
- **Toast / Notification** — não mencionado.
- **Tooltip** — não mencionado.
- **Avatar** — mencionado só como aplicação do símbolo, sem spec de componente.
- **Loading / Skeleton** — não mencionado.
