export type ItemTipo = 'produto' | 'servico';
export type ItemStatus = 'ativo' | 'inativo';

export type Item = {
  id: string;
  tipo: ItemTipo;
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  /** Só produto. */
  ncm: string | null;
  /** Só produto. */
  unidade: string | null;
  /** Só serviço — código da LC 116. */
  lc116: string | null;
  status: ItemStatus;
  /** ISO yyyy-mm-dd. */
  atualizadoEm: string;
};

export const tipoLabel: Record<ItemTipo, string> = {
  produto: 'Produto',
  servico: 'Serviço',
};

export const statusLabel: Record<ItemStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
};

export const mockItens: Item[] = [
  {
    id: 'item_01',
    tipo: 'servico',
    codigo: 'SVC-CURSO-001',
    nome: 'Curso online — Copy Que Converte',
    descricao: 'Treinamento completo em copywriting, 8 módulos gravados.',
    valor: 1997,
    ncm: null,
    unidade: null,
    lc116: '8.02',
    status: 'ativo',
    atualizadoEm: '2026-04-18',
  },
  {
    id: 'item_02',
    tipo: 'servico',
    codigo: 'SVC-MENT-001',
    nome: 'Mentoria 1:1 — 4 sessões',
    descricao: 'Acompanhamento individual ao longo de 4 semanas.',
    valor: 5000,
    ncm: null,
    unidade: null,
    lc116: '17.01',
    status: 'ativo',
    atualizadoEm: '2026-04-17',
  },
  {
    id: 'item_03',
    tipo: 'produto',
    codigo: 'PRD-EBOOK-001',
    nome: 'E-book — Storytelling pra vender',
    descricao: 'PDF de 120 páginas com cases e frameworks.',
    valor: 97,
    ncm: '49119900',
    unidade: 'UN',
    lc116: null,
    status: 'ativo',
    atualizadoEm: '2026-04-15',
  },
  {
    id: 'item_04',
    tipo: 'produto',
    codigo: 'PRD-TEMPLATE-001',
    nome: 'Template de landing page',
    descricao: 'Arquivo Figma + HTML estático pronto pra subir.',
    valor: 197,
    ncm: '85234920',
    unidade: 'UN',
    lc116: null,
    status: 'ativo',
    atualizadoEm: '2026-04-10',
  },
  {
    id: 'item_05',
    tipo: 'servico',
    codigo: 'SVC-CONS-001',
    nome: 'Consultoria estratégica',
    descricao: 'Sessão única de 2 horas + relatório escrito.',
    valor: 2500,
    ncm: null,
    unidade: null,
    lc116: '17.01',
    status: 'ativo',
    atualizadoEm: '2026-04-12',
  },
  {
    id: 'item_06',
    tipo: 'servico',
    codigo: 'SVC-CURSO-002',
    nome: 'Curso — Instagram do zero ao topo',
    descricao: 'Programa gravado de 6 semanas, com fórum e lives.',
    valor: 497,
    ncm: null,
    unidade: null,
    lc116: '1.04',
    status: 'ativo',
    atualizadoEm: '2026-03-28',
  },
  {
    id: 'item_07',
    tipo: 'produto',
    codigo: 'PRD-LIVRO-001',
    nome: 'Livro impresso — Storytelling',
    descricao: 'Edição de capa dura, 240 páginas.',
    valor: 69.9,
    ncm: '49019900',
    unidade: 'UN',
    lc116: null,
    status: 'ativo',
    atualizadoEm: '2026-03-20',
  },
  {
    id: 'item_08',
    tipo: 'servico',
    codigo: 'SVC-PACOTE-001',
    nome: 'Pacote de consultoria — 10 horas',
    descricao: 'Consumo flexível em até 90 dias.',
    valor: 15000,
    ncm: null,
    unidade: null,
    lc116: '17.01',
    status: 'ativo',
    atualizadoEm: '2026-04-05',
  },
  {
    id: 'item_09',
    tipo: 'produto',
    codigo: 'PRD-KIT-001',
    nome: 'Kit de materiais digitais',
    descricao: 'Bundle com planilhas, templates e checklists.',
    valor: 247,
    ncm: '49119900',
    unidade: 'UN',
    lc116: null,
    status: 'ativo',
    atualizadoEm: '2026-02-14',
  },
  {
    id: 'item_10',
    tipo: 'servico',
    codigo: 'SVC-ASSIN-001',
    nome: 'Assinatura mensal — Plataforma',
    descricao: 'Acesso recorrente ao conteúdo premium.',
    valor: 97,
    ncm: null,
    unidade: null,
    lc116: '1.09',
    status: 'ativo',
    atualizadoEm: '2026-04-19',
  },
  {
    id: 'item_11',
    tipo: 'servico',
    codigo: 'SVC-WORK-001',
    nome: 'Workshop ao vivo — Branding',
    descricao: 'Encontro de 4 horas ao vivo, com gravação.',
    valor: 397,
    ncm: null,
    unidade: null,
    lc116: '8.02',
    status: 'ativo',
    atualizadoEm: '2026-04-02',
  },
  {
    id: 'item_12',
    tipo: 'produto',
    codigo: 'PRD-PLAN-001',
    nome: 'Planner impresso 2026',
    descricao: 'Planner anual com espiral, 192 páginas.',
    valor: 89,
    ncm: '48201000',
    unidade: 'UN',
    lc116: null,
    status: 'inativo',
    atualizadoEm: '2025-12-10',
  },
];
