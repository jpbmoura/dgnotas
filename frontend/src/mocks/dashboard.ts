import type { Company } from '../api/empresas';

export type NotaTipo = 'nfe' | 'nfse';

export type NotaStatus =
  | 'emitida'
  | 'processando'
  | 'rejeitada'
  | 'cancelada'
  | 'rascunho';

export type Nota = {
  id: string;
  numero: string;
  tipo: NotaTipo;
  cliente: string;
  valor: number;
  status: NotaStatus;
  data: string;
};

export type DashboardMetrics = {
  notasEmitidas: { value: number; deltaPct: number };
  faturamento: { value: number; deltaPct: number };
  emProcessamento: number;
  rejeitadas: number;
};

/**
 * Shape atual do dashboard (sem alertas — estes são derivados da empresa real pelo próprio Dashboard).
 * Metrics e últimas notas continuam mock até a migração de Notas sair.
 */
export type DashboardData = {
  isEmpty: boolean;
  metrics: DashboardMetrics;
  ultimasNotas: Nota[];
};

const emptyMetrics: DashboardMetrics = {
  notasEmitidas: { value: 0, deltaPct: 0 },
  faturamento: { value: 0, deltaPct: 0 },
  emProcessamento: 0,
  rejeitadas: 0,
};

const normalMock: DashboardData = {
  isEmpty: false,
  metrics: {
    notasEmitidas: { value: 132, deltaPct: 24 },
    faturamento: { value: 54320.5, deltaPct: 18 },
    emProcessamento: 3,
    rejeitadas: 0,
  },
  ultimasNotas: [
    { id: 'n1', numero: '002.118', tipo: 'nfse', cliente: 'Júlia Medeiros',       valor: 497,   status: 'emitida',      data: '2026-04-19' },
    { id: 'n2', numero: '002.117', tipo: 'nfse', cliente: 'Pedro Henrique Alves', valor: 997,   status: 'emitida',      data: '2026-04-19' },
    { id: 'n3', numero: '002.116', tipo: 'nfe',  cliente: 'Acme Educação LTDA',   valor: 12500, status: 'processando',  data: '2026-04-18' },
    { id: 'n4', numero: '002.115', tipo: 'nfse', cliente: 'Bianca Rocha',         valor: 297,   status: 'emitida',      data: '2026-04-18' },
    { id: 'n5', numero: '002.114', tipo: 'nfse', cliente: 'Daniel Scarpati',      valor: 697,   status: 'emitida',      data: '2026-04-17' },
  ],
};

/**
 * Mock de metrics/últimas notas. Alertas do dashboard são derivados da Empresa real
 * (ver `deriveEmpresaAlerts` em `frontend/src/pages/Dashboard.tsx`).
 * Substitui por endpoints reais quando a migração de Notas sair.
 */
export function getDashboardData(empresa: Company): DashboardData {
  if (!empresa.ultimaEmissaoEm) {
    return { isEmpty: true, metrics: emptyMetrics, ultimasNotas: [] };
  }
  return normalMock;
}
