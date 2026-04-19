# DG Notas

Plataforma de emissão de notas fiscais para infoprodutores — com suporte humano de verdade.

## Estrutura

Monorepo com dois workspaces:

- [`backend/`](backend) — API REST em Express + TypeScript
- [`frontend/`](frontend) — SPA em React + Vite + TypeScript + TailwindCSS

## Pré-requisitos

- Node.js >= 18.18
- [pnpm](https://pnpm.io) >= 8 (`npm i -g pnpm`)

## Como rodar

```bash
# Instala dependências de ambos workspaces
pnpm install

# Sobe backend (http://localhost:4000) e frontend (http://localhost:5173) em paralelo
pnpm dev
```

Ou individualmente:

```bash
pnpm dev:backend
pnpm dev:frontend
```

## Build

```bash
pnpm build
```

## Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste conforme necessário.
