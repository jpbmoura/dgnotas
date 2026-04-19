---
name: dgnotas-backend
description: Guia obrigatório de Clean Architecture do backend do DGNotas (plataforma de emissão de NF-e e NFS-e). Ative SEMPRE que a tarefa envolver backend, API, endpoint, rota, route, controller, service, use case, caso de uso, entity, entidade, value object, aggregate, agregado, repository, repositório, domain, domínio, DDD, application, infrastructure, infra, interface, adapter, gateway, port, middleware, validator, validação, validation, migration, schema, database, banco de dados, PostgreSQL, SQL, multi-tenancy, tenant, companyId, empresaId, erro customizado, domain event, evento de domínio, certificado digital, SEFAZ, prefeitura, NF-e, NFS-e, emissão de nota, cancelamento, contingência. Fonte de verdade das 4 camadas (domain / application / infrastructure / interface), patterns canônicos (entity, VO, use case, repository, event), convenções de PostgreSQL e estratégia de testes do backend.
---

# DGNotas Backend

Guia mandatório para qualquer trabalho de backend do DGNotas. Todo código novo de servidor — entidade, use case, rota, adapter, migration — deve seguir este manual.

O DGNotas é uma plataforma de **emissão de notas fiscais brasileiras** (NF-e de produtos e NFS-e de serviços), com integração direta a SEFAZ estaduais e prefeituras. Domínio inerentemente complexo (regras fiscais, regimes tributários, certificados digitais A1, eventos assíncronos, contingência) e **multi-tenant por empresa** (um mesmo dono opera várias empresas).

## Quando ativar

Ative esta skill sempre que a tarefa envolver:

- Criar/gerar endpoint, rota, controller, middleware ou validator
- Escrever entity, value object, aggregate, use case ou repository
- Modelar regra de negócio fiscal (emissão, cancelamento, carta de correção, contingência)
- Criar/alterar migration, schema ou tabela PostgreSQL
- Implementar adapter de SEFAZ, prefeitura, certificado digital ou e-mail
- Desenhar fluxo multi-tenant (escopo por `companyId` / `empresaId`)
- Definir erro customizado de domínio ou aplicação
- Estruturar testes de backend (unit, integração, e2e)

Ative tanto em português quanto em inglês — o usuário alterna os dois.

## Escopo

**Esta skill guia a criação de código novo.** Só use em refatorações se o usuário pedir explicitamente ("refatore X seguindo a skill", "audite essa camada contra o manual").

Não confundir com a skill [`dgnotas-ui`](../dgnotas-ui/SKILL.md) — essa cobre frontend / design system. Se a tarefa for visual, ative a outra.

## Stack confirmada

- **Runtime**: Node.js + TypeScript (strict)
- **Banco**: PostgreSQL
- **Framework HTTP**: **A decidir** (veja TODOs abaixo)
- **Acesso a dados**: **A decidir** (SQL puro com `pg` vs ORM) — veja [ARCHITECTURE.md](ARCHITECTURE.md) e [DATABASE.md](DATABASE.md)
- **Testes**: Vitest + testcontainers + supertest (recomendado)

## Regras inegociáveis

Em ordem de prioridade. Violar a 1 ou a 2 **invalida toda a arquitetura** — pare e pergunte antes.

1. **Dependências apontam sempre para dentro.**
   `interface → infrastructure → application → domain`.
   Domain nunca importa de application. Application nunca importa de infrastructure. Infrastructure nunca importa de interface. Se precisar ir contra a seta, a resposta é inverter a dependência com uma interface (port).

2. **Domain layer é TypeScript puro.**
   Zero imports de framework HTTP, ORM, driver de banco, logger, SDK de terceiros, `fs`, `crypto` de Node (a menos que wrapped). Se precisa de algo externo, é injeção via interface definida em `application/ports/`.

3. **Regra de negócio vive em entity ou use case — nunca em controller ou repository.**
   Controller só traduz HTTP ↔ DTO e chama o use case. Repository só persiste/recupera. "Pode cancelar essa nota?" é pergunta pra entity, não pra controller.

4. **Nomes de código em inglês.**
   Classes, arquivos, métodos, variáveis, tabelas e colunas em inglês (`Invoice`, `emitInvoice`, `invoices`, `company_id`). **Exceção deliberada:** termos fiscais brasileiros sem tradução razoável (`Nota`, `NotaFiscal`, `ChaveAcesso`, `CNPJ`, `CPF`, `NCM`, `Cofins`, `ICMS`) podem ficar em português — escolha uma convenção por agregado e mantenha. Comentários, docstrings e mensagens de erro voltadas ao usuário em **português**.

5. **Erros customizados por domínio — nunca `throw new Error("algo")`.**
   Toda exceção herda de `DomainError` ou `ApplicationError`, com `code` e `message`. Controller traduz código em status HTTP.

6. **Todo dado é escopado por `companyId` (multi-tenancy).**
   Todo use case recebe `companyId` no input. Todo método de repository recebe `companyId`. Toda tabela de dado de negócio tem coluna `empresa_id` NOT NULL com index. Vazar dado entre empresas é bug de segurança crítico.

## Quando NÃO aplicar

Não force a arquitetura em:

- Scripts utilitários soltos em `scripts/` (seed, backfill, one-off)
- Migrations SQL (são migrations, não código de aplicação)
- Jobs de manutenção triviais que só rodam SQL
- Código de infra de teste (fixtures, factories, helpers)

Nesses casos, escreva código direto e pragmático. Use o bom senso: se o script vai virar feature, migre pra dentro da arquitetura antes.

## Como usar na prática

1. Antes de criar qualquer arquivo novo, abra [ARCHITECTURE.md](ARCHITECTURE.md) e confirme em **qual camada** ele deve viver.
2. Antes de escrever uma entity, value object, use case ou repository, abra [PATTERNS.md](PATTERNS.md) e copie o esqueleto canônico.
3. Antes de criar migration ou tabela, abra [DATABASE.md](DATABASE.md) — convenções de nomenclatura, colunas obrigatórias e tipos fiscais são inegociáveis.
4. Ao escrever testes, abra [TESTING.md](TESTING.md) — estratégia muda por camada.
5. Se faltar decisão (framework HTTP, ORM, evento síncrono vs assíncrono), **pare e pergunte**. Os `TODO:` deste manual listam o que ainda precisa ser decidido.

## Referências

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — as 4 camadas, o que entra/não entra em cada uma, como testar, exemplo canônico.
- **[PATTERNS.md](PATTERNS.md)** — entity, value object, aggregate, use case, repository, domain event, error handling, Result pattern. Com exemplos do domínio (Nota, CNPJ, Certificado, Empresa) e anti-patterns.
- **[DATABASE.md](DATABASE.md)** — convenções PostgreSQL, tipos fiscais, indexes, constraints, migration de exemplo pra `notas_fiscais`.
- **[TESTING.md](TESTING.md)** — estratégia por camada, convenções, ferramentas.

## TODO — decisões em aberto

Antes de começar a implementar a arquitetura no repositório, o usuário precisa decidir:

- [ ] **Framework HTTP**: Express (já instalado no backend atual), Fastify ou Hono. Skill é agnóstica, mas o adapter muda.
- [ ] **Acesso a dados**: `pg` + SQL puro (mais controle, repositories "honestos") vs Prisma/Drizzle (produtividade, risco de acoplar domain se usado errado). Veja [ARCHITECTURE.md — infrastructure/database](ARCHITECTURE.md).
- [ ] **Estratégia de eventos de domínio**: dispatcher síncrono em memória (simples, bom pro MVP) vs fila externa (Redis Stream / PgBoss / SQS) desde o início.
- [ ] **Biblioteca de validação na borda**: Zod (recomendado) vs class-validator vs Valibot.
- [ ] **Injeção de dependência**: composition root manual (suficiente pro MVP) vs container (tsyringe, awilix).
- [ ] **Certificado digital A1**: biblioteca de assinatura XML (node-forge + xml-crypto, etc.) — escopo de adapter em `infrastructure/certificates/`.
- [ ] **Integração SEFAZ**: usar biblioteca pronta (ex: `node-nfe`) ou implementar adapter próprio. Impacta testes de homologação.
- [ ] **Multi-tenancy no banco**: schema único com `empresa_id` em toda tabela (simples, padrão recomendado aqui) vs schema-per-tenant vs RLS do PostgreSQL.

A skill não faz essas escolhas — guia os patterns depois que elas estiverem tomadas.
