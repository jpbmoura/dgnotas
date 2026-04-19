# ROUTES — DGNotas frontend

Mapa da navegação do app. Fonte de verdade: [frontend/src/App.tsx](frontend/src/App.tsx).

## Árvore de navegação

```
/                          LandingPage        público
/entrar                    LoginPage          público
/cadastro                  SignupPage         público

<ProtectedRoute>           ← requer sessão (better-auth); redireciona pra /entrar
  <AppShell>               ← header sticky + seletor de empresa + nav + CompanyProvider
    /app                   Dashboard          (home pós-login)
    /empresas              Empresas/Lista
      /empresas/nova       Empresas/Formulario    (modo criar)
      /empresas/:id/editar Empresas/Formulario    (modo editar)
    /produtos              Produtos/Lista
      /produtos/novo       Itens/Formulario       (modo criar)
      /produtos/:id        Produtos/Detalhes      (read-only)
      /produtos/:id/editar Itens/Formulario       (modo editar)
    /itens/novo            Itens/Formulario       (alias legacy de /produtos/novo)
    /notas                 Notas/Lista
      /notas/nova/nfse     Emissao/NFSe           (emissão de nota de serviço)
      /notas/:id           Notas/Detalhe
```

## Rotas públicas

| Path        | Componente                                                    | Notas                                                                 |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/`         | [LandingPage](frontend/src/pages/LandingPage.tsx)             | Monta as seções em [components/landing/](frontend/src/components/landing/) |
| `/entrar`   | [LoginPage](frontend/src/pages/LoginPage.tsx)                 | Usa [AuthShell](frontend/src/components/AuthShell.tsx) + better-auth  |
| `/cadastro` | [SignupPage](frontend/src/pages/SignupPage.tsx)               | Após sign-up, redireciona pra `/app`                                  |

## Rotas autenticadas

Todas vivem dentro do layout `<ProtectedRoute><AppShell /></ProtectedRoute>`. Renderizam via `<Outlet />` dentro do shell.

### Dashboard

| Path   | Componente                                                | Parâmetros | Observações                                                                                           |
| ------ | --------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `/app` | [Dashboard](frontend/src/pages/Dashboard.tsx)             | —          | Consome `useCompany()` e recarrega dados do mock quando `empresaAtiva` muda (setTimeout 400ms).      |

### Empresas

| Path                     | Componente                                                       | Parâmetros                  | Observações                                                                 |
| ------------------------ | ---------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `/empresas`              | [Empresas/Lista](frontend/src/pages/Empresas/Lista.tsx)          | —                           | Busca, filtros (regime/status), ordenação, paginação 10/pág.               |
| `/empresas/nova`         | [Empresas/Formulario](frontend/src/pages/Empresas/Formulario.tsx) | —                           | 5 abas, cada uma com schema zod independente. Botão "Criar empresa".       |
| `/empresas/:id/editar`   | [Empresas/Formulario](frontend/src/pages/Empresas/Formulario.tsx) | `id`: string (ex. `emp_01`) | Busca via [`getEmpresaDetalhes(id)`](frontend/src/mocks/empresaDetalhes.ts) com delay 400ms; fallback "não encontrada". Botão "Salvar alterações". |

### Produtos

| Path                     | Componente                                                         | Parâmetros                   | Observações                                                                                                              |
| ------------------------ | ------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/produtos`              | [Produtos/Lista](frontend/src/pages/Produtos/Lista.tsx)            | —                            | Lista itens (produtos + serviços). Filtros Tipo/Status. Paginação 10/pág.                                               |
| `/produtos/novo`         | [Itens/Formulario](frontend/src/pages/Itens/Formulario.tsx)        | —                            | Seletor produto/serviço + 5 abas com validação zod. Consome `useCompany()` pra decidir CST × CSOSN.                     |
| `/produtos/:id`          | [Produtos/Detalhes](frontend/src/pages/Produtos/Detalhes.tsx)      | `id`: string (ex. `item_03`) | Read-only. Usa [`getItemDetalhes(id)`](frontend/src/mocks/itemDetalhes.ts).                                              |
| `/produtos/:id/editar`   | [Itens/Formulario](frontend/src/pages/Itens/Formulario.tsx)        | `id`: string                 | Mesmo componente da criação; detecta modo via `useParams`. Oculta o seletor de tipo, pré-preenche via `getItemDetalhes`. |
| `/itens/novo`            | [Itens/Formulario](frontend/src/pages/Itens/Formulario.tsx)        | —                            | Alias legacy; foi a primeira rota criada antes de consolidar "Produtos". Pode ser removida quando o dashboard for atualizado. |

### Notas

| Path                 | Componente                                                  | Parâmetros                    | Observações                                                                                                                                    |
| -------------------- | ----------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/notas`             | [Notas/Lista](frontend/src/pages/Notas/Lista.tsx)           | —                             | Busca + filtros Tipo/Status (multisseleção)/Período (presets + custom). Seleção em lote + bulk actions (mock). Paginação 20/pág.              |
| `/notas/nova/nfse`   | [Emissao/NFSe](frontend/src/pages/Emissao/NFSe.tsx)         | —                             | Form em 2/3 + preview sticky 1/3. Atalhos `Ctrl+S` (rascunho) e `Ctrl+Enter` (emitir). Modal de emissão com 10% de rejeição aleatória.         |
| `/notas/:id`         | [Notas/Detalhe](frontend/src/pages/Notas/Detalhe.tsx)       | `id`: string (ex. `nota_003`) | Layout documento oficial (Serif italic nos títulos de seção, Mono em todos os valores). Banners condicionais para rejeitada/cancelada.         |

## Componentes e utilidades compartilhados

### Pré-existentes (reusados sem modificação)

| Arquivo                                                               | Onde é usado                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`components/FormField.tsx`](frontend/src/components/FormField.tsx)   | SignupPage, LoginPage, Onboarding, Empresas/Formulario, Itens/Formulario, NFSe        |
| [`components/AuthShell.tsx`](frontend/src/components/AuthShell.tsx)   | LoginPage, SignupPage                                                                 |
| [`components/ProtectedRoute.tsx`](frontend/src/components/ProtectedRoute.tsx) | Guarda tudo que fica dentro do `AppShell`                                             |
| [`components/landing/Logo.tsx`](frontend/src/components/landing/Logo.tsx) | LandingPage, AppShell (header + drawer), Onboarding                                   |

### Criados durante este ciclo

| Arquivo                                                               | Papel                                                                                                                                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`layouts/AppShell.tsx`](frontend/src/layouts/AppShell.tsx)           | Layout route das páginas autenticadas. Header sticky com logo, `CompanySelector` (dropdown + busca), nav central absoluta (Dashboard/Empresas/Produtos/Notas), sino e `UserMenu`. Drawer mobile. Também contém o `<CompanyProvider>`. |
| [`contexts/CompanyContext.tsx`](frontend/src/contexts/CompanyContext.tsx) | Hook `useCompany()` expõe `empresas`, `empresaAtiva`, `setEmpresaAtiva`, `loading`. Persiste a empresa ativa em `localStorage` sob `dgnotas:empresa-ativa`. Simula fetch com 500ms.                 |

### Mocks (fonte de dados de todas as telas)

Todos em [`src/mocks/`](frontend/src/mocks/). A função `get*Detalhes(id)` retorna `null` quando o id não bate — cada tela trata isso com um estado "não encontrada".

| Arquivo                | Expõe                                                                                                                       | Telas que consomem                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `companies.ts`         | `Company`, `mockCompanies` (12 empresas), `regimeLabel`, `statusLabel`                                                      | CompanyContext, Empresas/Lista, Dashboard, AppShell (selector)       |
| `empresaDetalhes.ts`   | `EmpresaDetalhes`, `getEmpresaDetalhes(id)`                                                                                 | Empresas/Formulario (edição), Notas/Detalhe (prestador), NFSe preview |
| `dashboard.ts`         | `DashboardData`, `getDashboardData(companyId)` — 3 casos (normal, alertas, vazio)                                           | Dashboard                                                            |
| `cnaes.ts`             | 20 CNAEs                                                                                                                    | Empresas/Formulario (CNAE principal + secundários)                   |
| `ibge.ts`              | 27 UFs + ~37 municípios                                                                                                     | Empresas/Formulario (endereço)                                       |
| `viacep.ts`            | `mockViaCEP(cep)` com faixas por região                                                                                     | Empresas/Formulario                                                  |
| `ncm.ts`               | 30 NCMs                                                                                                                     | Itens/Formulario (classificação de produto)                          |
| `servicos.ts`          | 20 códigos LC 116                                                                                                           | Itens/Formulario (serviços), NFSe (ServicoPicker)                    |
| `presets.ts`           | 6 presets tributários (3 produto, 3 serviço)                                                                                | Itens/Formulario (barra de presets)                                  |
| `itens.ts`             | `Item`, `mockItens` (12), `tipoLabel`, `statusLabel`                                                                        | Produtos/Lista, NFSe (ServicoPicker)                                 |
| `itemDetalhes.ts`      | `ItemDetalhes`, `getItemDetalhes(id)`                                                                                       | Produtos/Detalhes, Itens/Formulario (edição), NFSe (tax defaults)    |
| `tomadores.ts`         | 10 tomadores (PF + PJ)                                                                                                      | NFSe (busca de tomador), Notas/Detalhe (fallback de contato)         |
| `notas.ts`             | 50 notas mistas — 8 hand-picked (processando, rejeitadas com motivo, canceladas) + 42 geradas com spread de 90 dias         | Notas/Lista, Notas/Detalhe                                           |
| `notaDetalhes.ts`      | `NotaDetalhes`, `getNotaDetalhes(id)` — sintetiza timeline, impostos e protocolo baseado no status                          | Notas/Detalhe                                                        |

## Duplicação intencional (ainda não extraída)

Cada tela de formulário foi construída com sub-componentes inline. São candidatos a extração pra `src/components/form/` quando valer a pena:

| Padrão               | Aparece em                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `SelectField`        | Onboarding, Empresas/Formulario, Itens/Formulario                                                            |
| `SearchSelect`       | Empresas/Formulario (CNAE), Itens/Formulario (CNAE, LC 116, NCM), NFSe (ServicoPicker), AppShell (seletor de empresa) |
| `MultiSelect`        | Empresas/Formulario (CNAEs secundários)                                                                      |
| `TabStrip` + dots    | Empresas/Formulario, Itens/Formulario (ProdutoForm e ServicoForm)                                            |
| `ToggleSwitch`       | Empresas/Formulario, Itens/Formulario, NFSe                                                                  |
| `Chip` + `FilterRow` | Empresas/Lista, Produtos/Lista, Notas/Lista                                                                  |
| `Pagination`         | Empresas/Lista, Produtos/Lista, Notas/Lista                                                                  |
| `Toast`              | Onboarding (inline), Itens/Formulario, NFSe (ToastHost)                                                      |
| CNPJ helpers         | Onboarding, Empresas/Formulario (duplicados `onlyDigits`/`formatCNPJ`/`isValidCNPJ`)                         |

Quando 3+ telas divergirem em comportamento, a extração passa a valer. Por enquanto a duplicação mantém cada arquivo auto-contido e fácil de ler.

## Referências soltas (links apontando pra rotas não implementadas)

Estas rotas aparecem em links/CTAs pelo app mas ainda não têm `<Route>`:

| Link                    | Origem                                                                                                          | Status       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| `/notas/nova/nfe`       | [Dashboard quick actions](frontend/src/pages/Dashboard.tsx), [Notas/Lista EmitDropdown](frontend/src/pages/Notas/Lista.tsx) | a criar      |
| `/notas/nova`           | [Dashboard EmptyDashboard](frontend/src/pages/Dashboard.tsx)                                                    | a criar      |
| `/integracoes`          | [Dashboard EmptyDashboard](frontend/src/pages/Dashboard.tsx) ("Conectar Hotmart")                               | a criar      |
| `/perfil`               | [AppShell UserMenu](frontend/src/layouts/AppShell.tsx)                                                          | a criar      |
| `/onboarding`           | [Onboarding](frontend/src/pages/Onboarding.tsx) (tela existe, rota não wirada)                                  | órfã         |

## Arquivos órfãos

Telas/componentes que existem em `src/pages/` mas não estão mais plugadas no App:

- [`pages/Onboarding.tsx`](frontend/src/pages/Onboarding.tsx) — wizard de 3 passos criado antes do AppShell; nunca foi wirado em rota. Decisão de uso pendente (pós-signup?).
- [`pages/AppPage.tsx`](frontend/src/pages/AppPage.tsx) — dashboard antigo; `/app` foi repontado pra `Dashboard`. Mantido por enquanto; pode ser deletado com segurança.
- [`components/app/Sidebar.tsx`](frontend/src/components/app/Sidebar.tsx) — sidebar legada; substituída pela nav do `AppShell`. Pode ser deletada.
