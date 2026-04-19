---
name: dgnotas-ui
description: Guia de marca e UI do DGNotas. Ative SEMPRE que a tarefa envolver criação de qualquer coisa visual no produto ou marketing — componente, página, landing, hero, seção, tela, layout, form, botão, card, badge, input, dashboard, copy de interface, microcopy, cor, fonte, tipografia, tema, tokens, design system, estilo, CSS, Tailwind, responsivo. Também ative para termos em inglês: UI, component, page, landing, hero, section, screen, layout, form, button, card, badge, input, dashboard, color, font, typography, theme, tokens, design system, style, CSS, Tailwind, responsive. Fonte de verdade dos tokens (@theme Tailwind v4), componentes canônicos e tom de voz da DGNotas.
---

# DGNotas UI

Guia mandatório para qualquer trabalho de frontend do DGNotas. Todo código visual novo — landing page, UI do produto, e-mails, microcopy — deve seguir este manual.

## Quando ativar

Ative esta skill sempre que a tarefa envolver:

- Criar/gerar um componente, seção, página, tela, layout, modal, form ou qualquer elemento visual
- Landing page, hero, features, pricing, CTA, rodapé
- Dashboard, cards, badges, pílulas, botões, inputs, tabelas
- Estilização (CSS, Tailwind, cores, fontes, espaçamentos, raios)
- Copy de interface: textos de botão, placeholder, erro, empty state, notificação, e-mail
- Definir/revisar tokens, paleta, tipografia, tema

Ative tanto em português quanto em inglês — o usuário alterna os dois.

## Escopo

**Esta skill guia a criação de código novo.** Não use para revisar ou refatorar código existente a menos que o usuário peça explicitamente ("refatore X seguindo a skill", "audite essa tela contra o manual").

## Stack confirmada

- **Tailwind CSS v4** com bloco `@theme` (veja [TOKENS.md](TOKENS.md))
- Fontes: Geist (sans), Instrument Serif (destaque, italic), Geist Mono (técnico/labels)
- Sem CSS hex hardcoded em componentes — sempre via token

## Princípios inegociáveis

1. **Zero hex hardcoded.** Toda cor vem de um token de `@theme`. Se a cor que você quer usar não existe como token, pare e avise o usuário antes de inventar.
2. **Só três fontes oficiais:** Geist, Instrument Serif, Geist Mono. Nada fora disso.
3. **Instrument Serif nunca em parágrafos longos nem em UI do produto.** Só em pequenas doses (títulos de destaque, uma palavra em italic, frases de efeito, wordmark do logo).
4. **Border-radius só nos valores do sistema:** `16px` (cards), `8px` (botões), `999px` (pílulas/badges). Nada de `rounded-xl` arbitrário fora disso.
5. **Geist Mono em labels/badges sempre em CAPS com `letter-spacing: 0.02em`.**
6. **Logo:** nunca rotacionar, mudar cor, esticar, usar em outline, adicionar sombra ou trocar o ícone. Símbolo mínimo 24px; logo completo mínimo 140px. Área de proteção = altura do símbolo.
7. **Tom de voz:** direto, humano, honesto, técnico quando precisa. Zero jargão corporativo. Veja [VOICE.md](VOICE.md).

## Referências

- **[TOKENS.md](TOKENS.md)** — bloco `@theme` completo (cores, fontes, raios, escala tipográfica). Copie daqui.
- **[COMPONENTS.md](COMPONENTS.md)** — padrões canônicos de botão, card, input, badge, hero, grid. Use como base.
- **[VOICE.md](VOICE.md)** — princípios de escrita, tabela faça/evite, palavras banidas, microcopy.

## Como usar na prática

1. Antes de escrever qualquer classe Tailwind, abra [TOKENS.md](TOKENS.md) e confirme que os tokens que você precisa existem.
2. Antes de escrever um componente do zero, abra [COMPONENTS.md](COMPONENTS.md) — provavelmente já tem o padrão.
3. Antes de escrever qualquer texto de UI, abra [VOICE.md](VOICE.md) e passe a copy pelo filtro faça/evite.
4. Se faltar informação (token, escala, estado), **pare e pergunte** em vez de inventar. Os `TODO:` no [TOKENS.md](TOKENS.md) listam as lacunas conhecidas do manual.
