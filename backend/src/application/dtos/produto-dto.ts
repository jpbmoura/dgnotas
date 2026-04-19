import type {
  LocalIncidencia,
  Retencao,
  StatusItem,
  TipoItem,
} from '../../domain/entities/produto';

/**
 * Shapes planos de entrada/saída. Use cases constroem VOs internamente a partir destes dados.
 *
 * Todas as alíquotas estão em PERCENTUAL (0–100). Frontend e backend usam a mesma escala;
 * converter pra fração (0–1) só na hora de calcular imposto (em fase futura, quando emitir nota).
 */

export interface ProdutoConfigInput {
  unidade: string;
  ncm: string | null;
  gtin: string | null;
  sujeitoST: boolean;
  cest: string | null;
  origem: string;
  cfop: string;
  cstOrCsosn: string;
  aliqIcms: number;
  cstPis: string;
  aliqPis: number;
  cstCofins: string;
  aliqCofins: number;
}

export interface ServicoConfigInput {
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

export interface IbsCbsInput {
  cstIbsCbs: string;
  cClassTrib: string;
}

export interface CreateProdutoInput {
  empresaId: string;
  tipo: TipoItem;
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  ibsCbs: IbsCbsInput;
  /** Obrigatório quando tipo='produto'; use case rejeita se ausente. */
  produtoConfig: ProdutoConfigInput | null;
  /** Obrigatório quando tipo='servico'; use case rejeita se ausente. */
  servicoConfig: ServicoConfigInput | null;
}

export type UpdateProdutoInput = Omit<CreateProdutoInput, 'empresaId' | 'tipo'> & {
  status: StatusItem;
};

export interface ProdutoOutput {
  id: string;
  empresaId: string;
  tipo: TipoItem;
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  status: StatusItem;
  ibsCbs: IbsCbsInput;
  produtoConfig: ProdutoConfigInput | null;
  servicoConfig: ServicoConfigInput | null;
  createdAt: string;
  updatedAt: string;
}
