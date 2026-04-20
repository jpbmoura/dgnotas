import { http } from '../lib/http';

// ---------- Tipos ----------

export type TipoItem = 'produto' | 'servico';
export type StatusItem = 'ativo' | 'inativo';
export type LocalIncidencia = 'prestador' | 'tomador';

export type Plataforma =
  | 'hotmart'
  | 'eduzz'
  | 'kiwify'
  | 'hubla'
  | 'perfectpay'
  | 'outra';

export type Garantia =
  | 'sem_garantia'
  | 'dias_7'
  | 'dias_15'
  | 'dias_30'
  | 'dias_60'
  | 'dias_90';

export interface Retencao {
  enabled: boolean;
  aliq: number;
}

export interface ProdutoConfig {
  unidade: string;
  ncm: string | null;
  cest: string | null;
  origem: string;
  cfop: string;
  cstOrCsosn: string;
  aliqIcms: number;
  cstIpi: string;
  aliqIpi: number;
  cstPis: string;
  aliqPis: number;
  cstCofins: string;
  aliqCofins: number;
}

export interface ServicoConfig {
  lc116: string;
  ctiss: string | null;
  cnaeRelacionado: string | null;
  aliqIss: number;
  issRetido: boolean;
  localIncidencia: LocalIncidencia;
  retPis: Retencao;
  retCofins: Retencao;
  retCsll: Retencao;
  retIrrf: Retencao;
  retInss: Retencao;
}

interface ProdutoCommon {
  id: string;
  empresaId: string;
  codigo: string;
  nome: string;
  nomeFiscal: string | null;
  descricao: string;
  valor: number;
  status: StatusItem;
  plataforma: Plataforma | null;
  garantia: Garantia | null;
  createdAt: string;
  updatedAt: string;
}

export type ProdutoFisico = ProdutoCommon & {
  tipo: 'produto';
  produtoConfig: ProdutoConfig;
  servicoConfig: null;
};

export type ProdutoServico = ProdutoCommon & {
  tipo: 'servico';
  produtoConfig: null;
  servicoConfig: ServicoConfig;
};

/**
 * Produto — união discriminada pelo campo `tipo`. Dentro de `if (p.tipo === 'produto')`
 * o TS estreita automaticamente pra `ProdutoFisico` e `p.produtoConfig` vira não-null.
 */
export type Produto = ProdutoFisico | ProdutoServico;

// ---------- Payloads ----------

export interface CreateProdutoPayload {
  tipo: TipoItem;
  codigo: string;
  nome: string;
  nomeFiscal: string | null;
  descricao: string;
  valor: number;
  plataforma: Plataforma | null;
  garantia: Garantia | null;
  produtoConfig: ProdutoConfig | null;
  servicoConfig: ServicoConfig | null;
}

export type UpdateProdutoPayload = Omit<CreateProdutoPayload, 'tipo'> & {
  status: StatusItem;
};

// ---------- Labels ----------

export const tipoLabel: Record<TipoItem, string> = {
  produto: 'Produto',
  servico: 'Serviço',
};

export const statusLabel: Record<StatusItem, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
};

export const plataformaLabel: Record<Plataforma, string> = {
  hotmart: 'Hotmart',
  eduzz: 'Eduzz',
  kiwify: 'Kiwify',
  hubla: 'Hubla',
  perfectpay: 'Perfectpay',
  outra: 'Outra',
};

export const garantiaLabel: Record<Garantia, string> = {
  sem_garantia: 'Sem garantia',
  dias_7: '7 dias',
  dias_15: '15 dias',
  dias_30: '30 dias',
  dias_60: '60 dias',
  dias_90: '90 dias',
};

// ---------- Endpoints ----------

type ListResponse = { produtos: Produto[] };

export async function listProdutos(empresaId: string): Promise<Produto[]> {
  const { produtos } = await http.get<ListResponse>(`/empresas/${empresaId}/produtos`);
  return produtos;
}

export async function getProduto(empresaId: string, id: string): Promise<Produto> {
  return http.get<Produto>(`/empresas/${empresaId}/produtos/${id}`);
}

export async function createProduto(
  empresaId: string,
  payload: CreateProdutoPayload,
): Promise<Produto> {
  return http.post<Produto>(`/empresas/${empresaId}/produtos`, payload);
}

export async function updateProduto(
  empresaId: string,
  id: string,
  payload: UpdateProdutoPayload,
): Promise<Produto> {
  return http.put<Produto>(`/empresas/${empresaId}/produtos/${id}`, payload);
}

/**
 * Soft delete. Backend marca `deleted_at`; o produto some da listagem mas fica no banco
 * (dado fiscal). Retorna 204 sem corpo.
 */
export async function deleteProduto(empresaId: string, id: string): Promise<void> {
  await http.delete(`/empresas/${empresaId}/produtos/${id}`);
}
