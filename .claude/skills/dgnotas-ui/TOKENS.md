# TOKENS — DGNotas

Tokens oficiais do manual (v1.0 / 2026). Copie o bloco `@theme` direto para o seu CSS principal (Tailwind v4).

## @theme — cole no seu CSS global

```css
@import "tailwindcss";

@theme {
  /* ---------- Cores — paleta primária ---------- */
  --color-ink:         #0A2540;  /* texto principal, CTAs, símbolo do logo */
  --color-ink-soft:    #1A3656;  /* hover do Ink */
  --color-ink-muted:   #425466;  /* texto secundário */
  --color-accent:      #00B894;  /* automação, highlights, CTA */
  --color-accent-deep: #00876A;  /* hover do Accent */
  --color-accent-soft: #E6F9F3;  /* fundos de sucesso */
  --color-blue:        #635BFF;  /* secundária, badges info */
  --color-blue-soft:   #EEF0FF;  /* fundos de info */
  --color-warn:        #F6AA1C;  /* alertas, atenção */

  /* ---------- Cores — neutras / estrutura ---------- */
  --color-bg:        #FBFCFE;  /* fundo principal da UI */
  --color-bg-card:   #FFFFFF;  /* fundo de cards e inputs */
  --color-line:      #E6EBF1;  /* bordas padrão */
  --color-line-soft: #F2F5F9;  /* divisores sutis, badge neutro */
  --color-black:     #000000;  /* contraste extremo, uso pontual */

  /* ---------- Cores de badge (estados) ---------- */
  /* Badge sucesso: bg accent-soft / fg accent-deep */
  /* Badge info:    bg blue-soft   / fg blue */
  /* Badge neutro:  bg line-soft   / fg ink */
  /* Badge ink:     bg ink         / fg white */
  --color-warn-bg: #FEF3C7;  /* badge atenção — fundo */
  --color-warn-fg: #92400E;  /* badge atenção — texto */
  --color-err-bg:  #FEE2E2;  /* badge erro — fundo */
  --color-err-fg:  #DC2626;  /* badge erro — texto */

  /* ---------- Fontes ---------- */
  --font-sans:  "Geist", system-ui, -apple-system, sans-serif;
  --font-serif: "Instrument Serif", Georgia, serif;
  --font-mono:  "Geist Mono", ui-monospace, monospace;

  /* ---------- Pesos Geist oficiais ---------- */
  /* 300 (light — uso restrito), 400 (regular), 500 (medium), 600 (semibold) */

  /* ---------- Escala tipográfica ---------- */
  /* H1 / Hero — Geist 56pt */
  --text-h1: 3.5rem;           /* 56px */
  --text-h1--line-height: 1.02;
  --text-h1--letter-spacing: -0.02em;

  /* H2 / Título — Geist 36pt */
  --text-h2: 2.25rem;          /* 36px */
  --text-h2--line-height: 1.1;

  /* H3 / Subtítulo — Instrument Serif Italic 22pt */
  --text-h3: 1.375rem;         /* 22px */
  --text-h3--line-height: 1.3;

  /* Body — Geist 14pt */
  --text-body: 0.875rem;       /* 14px */
  --text-body--line-height: 1.6;

  /* Caption / Label — Geist Mono 10pt uppercase */
  --text-caption: 0.625rem;    /* 10px */
  --text-caption--line-height: 1.2;
  --text-caption--letter-spacing: 0.02em;

  /* ---------- Raios ---------- */
  --radius-card:   16px;   /* cards e containers */
  --radius-button: 8px;    /* botões */
  --radius-pill:   9999px; /* badges, pílulas */

  /* ---------- Alturas de botão ---------- */
  --size-button-lg: 48px;
  --size-button-md: 36px;

  /* ---------- Container ---------- */
  --container-max:  1280px;
  --container-pad:  24px;  /* mobile */
  --container-pad-desktop: 32px;

  /* ---------- Grid background ---------- */
  --grid-size: 64px;       /* malha 64×64 de background */
}
```

## Uso em classes Tailwind

Com o bloco acima, você pode escrever:

```html
<!-- cores -->
<div class="bg-bg text-ink border border-line">...</div>
<button class="bg-accent text-white hover:bg-accent-deep">...</button>

<!-- fontes -->
<h1 class="font-sans text-h1">Emita suas notas</h1>
<em class="font-serif italic">com gente de verdade cuidando</em>
<span class="font-mono text-caption uppercase">NOTA Nº 001.234.567</span>

<!-- raios -->
<div class="rounded-card">...</div>
<button class="rounded-button h-[var(--size-button-lg)]">...</button>
<span class="rounded-pill">...</span>
```

## Regras de aplicação (resumo do manual)

- **Combinação padrão:** Ink + Accent. Tudo que diverge precisa de justificativa.
- **Regra geral de UI:** Ink + BG para base, Accent para ações primárias, Blue para badges informativos.
- **Nunca hex hardcoded em componente.** Sempre via token.
- **Hierarquia tipográfica da página acima** vale para landing, e-mails, posts e documentos. Na UI do produto, escalas são proporcionalmente menores — ver TODO abaixo.

## TODO — lacunas do manual (precisam de decisão)

Os itens abaixo não estão definidos no `dgnotas-brand-manual.pdf`. Não invente — pergunte ao João antes de usar.

- **TODO: escala de spacing** — o manual não documenta spacings (padding/margin/gap). Ficar no sistema padrão do Tailwind ou definir `--spacing-*` próprios?
- **TODO: escala tipográfica para UI do produto** — o manual diz "proporcionalmente menores — veja o design system", mas não traz números. Definir H1/H2/H3/body para dashboard.
- **TODO: sombras (box-shadow)** — manual menciona "hover com translateY(-2px)" em cards mas não define box-shadow. Definir `--shadow-card`, `--shadow-card-hover`?
- **TODO: estados de foco** — cor/estilo de `:focus-visible` em input e botão não estão no manual.
- **TODO: dark mode** — não mencionado no manual. Existe plano?
- **TODO: pesos específicos por nível de heading** — manual lista pesos disponíveis (300/400/500/600) mas não diz qual usar em H1/H2. Assumindo 600 (semibold) para H1/H2 — confirmar.
- **TODO: paddings horizontais de botão** — altura está definida (48px lg, 36px md) mas padding-x não. Assumido `px-6` (lg) e `px-4` (md) em COMPONENTS.md.
- **TODO: Blue hover** — existe `--color-blue-soft` mas não há "Blue Deep" para hover de CTA blue. Definir?
