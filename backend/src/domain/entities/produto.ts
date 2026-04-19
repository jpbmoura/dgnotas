import { AggregateRoot } from '../shared/aggregate-root';
import type { NCM } from '../value-objects/ncm';

export type TipoItem = 'produto' | 'servico';
export type StatusItem = 'ativo' | 'inativo';
export type LocalIncidencia = 'prestador' | 'tomador';

export interface Retencao {
  enabled: boolean;
  aliq: number;
}

export interface ProdutoConfig {
  unidade: string;
  ncm: NCM | null;
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

export interface IbsCbs {
  cstIbsCbs: string;
  cClassTrib: string;
}

export interface ProdutoProps {
  empresaId: string;
  tipo: TipoItem;
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  status: StatusItem;
  ibsCbs: IbsCbs;
  produtoConfig: ProdutoConfig | null;
  servicoConfig: ServicoConfig | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Produto — aggregate root que cobre tanto produtos (NF-e) quanto serviços (NFS-e).
 *
 * Discriminador: `tipo`. Invariante essencial: `tipo='produto'` exige `produtoConfig` presente
 * e `servicoConfig` ausente; `tipo='servico'` vice-versa. Quebrar isso quebra emissão de nota.
 *
 * Escopo: sempre por `empresaId` (multi-tenancy). Repository também força isso.
 */
export class Produto extends AggregateRoot<ProdutoProps> {
  private constructor(props: ProdutoProps, id: string) {
    super(props, id);
    this.invariantes();
  }

  static create(input: {
    id: string;
    empresaId: string;
    tipo: TipoItem;
    codigo: string;
    nome: string;
    descricao: string;
    valor: number;
    ibsCbs: IbsCbs;
    produtoConfig: ProdutoConfig | null;
    servicoConfig: ServicoConfig | null;
    now: Date;
  }): Produto {
    return new Produto(
      {
        empresaId: input.empresaId,
        tipo: input.tipo,
        codigo: input.codigo.trim(),
        nome: input.nome.trim(),
        descricao: input.descricao,
        valor: input.valor,
        status: 'ativo',
        ibsCbs: input.ibsCbs,
        produtoConfig: input.tipo === 'produto' ? input.produtoConfig : null,
        servicoConfig: input.tipo === 'servico' ? input.servicoConfig : null,
        createdAt: input.now,
        updatedAt: input.now,
        deletedAt: null,
      },
      input.id,
    );
  }

  static reconstitute(props: ProdutoProps & { id: string }): Produto {
    const { id, ...rest } = props;
    return new Produto(rest, id);
  }

  // --- getters ---

  get empresaId(): string { return this.props.empresaId; }
  get tipo(): TipoItem { return this.props.tipo; }
  get codigo(): string { return this.props.codigo; }
  get nome(): string { return this.props.nome; }
  get descricao(): string { return this.props.descricao; }
  get valor(): number { return this.props.valor; }
  get status(): StatusItem { return this.props.status; }
  get ibsCbs(): IbsCbs { return this.props.ibsCbs; }
  get produtoConfig(): ProdutoConfig | null { return this.props.produtoConfig; }
  get servicoConfig(): ServicoConfig | null { return this.props.servicoConfig; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  // --- operações ---

  /**
   * Atualiza todos os campos editáveis. Não permite trocar o `tipo` do produto —
   * se precisasse virar serviço (ou vice-versa), cria um novo e inativa o anterior.
   * Isso respeita a natureza distinta dos dois universos tributários.
   */
  atualizar(input: {
    codigo: string;
    nome: string;
    descricao: string;
    valor: number;
    status: StatusItem;
    ibsCbs: IbsCbs;
    produtoConfig: ProdutoConfig | null;
    servicoConfig: ServicoConfig | null;
    now: Date;
  }): void {
    this.props.codigo = input.codigo.trim();
    this.props.nome = input.nome.trim();
    this.props.descricao = input.descricao;
    this.props.valor = input.valor;
    this.props.status = input.status;
    this.props.ibsCbs = input.ibsCbs;
    // Mantém o tipo atual; ignora o config do outro tipo.
    if (this.props.tipo === 'produto') {
      this.props.produtoConfig = input.produtoConfig;
      this.props.servicoConfig = null;
    } else {
      this.props.produtoConfig = null;
      this.props.servicoConfig = input.servicoConfig;
    }
    this.props.updatedAt = input.now;
    this.invariantes();
  }

  // --- invariantes ---

  private invariantes(): void {
    if (!this.props.empresaId) throw new Error('produto sem empresaId');
    if (!this.props.codigo) throw new Error('código do produto é obrigatório');
    if (!this.props.nome) throw new Error('nome do produto é obrigatório');
    if (this.props.valor < 0) throw new Error('valor não pode ser negativo');

    if (this.props.tipo === 'produto') {
      if (!this.props.produtoConfig) {
        throw new Error('produto sem configuração de produto');
      }
      if (this.props.servicoConfig) {
        throw new Error('produto do tipo "produto" não pode ter configuração de serviço');
      }
      const p = this.props.produtoConfig;
      assertAliquota(p.aliqIcms, 'aliqIcms');
      assertAliquota(p.aliqPis, 'aliqPis');
      assertAliquota(p.aliqCofins, 'aliqCofins');
    } else {
      if (!this.props.servicoConfig) {
        throw new Error('serviço sem configuração de serviço');
      }
      if (this.props.produtoConfig) {
        throw new Error('serviço não pode ter configuração de produto');
      }
      const s = this.props.servicoConfig;
      assertAliquota(s.aliqIss, 'aliqIss');
      for (const [nome, r] of [
        ['retPis', s.retPis],
        ['retCofins', s.retCofins],
        ['retCsll', s.retCsll],
        ['retIrrf', s.retIrrf],
        ['retInss', s.retInss],
      ] as const) {
        assertAliquota(r.aliq, nome);
      }
    }
  }
}

function assertAliquota(v: number, nome: string): void {
  if (v < 0 || v > 100) {
    throw new Error(`${nome} fora da faixa [0, 100]: ${v}`);
  }
}
