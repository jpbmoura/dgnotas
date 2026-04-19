import { AggregateRoot } from '../shared/aggregate-root';
import { CNPJ } from '../value-objects/cnpj';
import { CEP } from '../value-objects/cep';
import { CNAE } from '../value-objects/cnae';

export type RegimeTributario = 'simples' | 'mei' | 'presumido' | 'real';
export type StatusEmpresa = 'ativa' | 'pendente' | 'inativa';
export type Ambiente = 'homologacao' | 'producao';

export interface Endereco {
  cep: CEP;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface CertificadoDigital {
  fileName: string;
  issuer: string;
  holder: string;
  validUntil: Date;
}

export interface NumeracaoNotas {
  nfeProximoNumero: number;
  nfeSerie: number;
  nfseProximoNumero: number;
  nfseSerie: number;
}

export interface EmpresaProps {
  ownerUserId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: CNPJ;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: CNAE;
  cnaesSecundarios: CNAE[];
  regimeTributario: RegimeTributario;
  status: StatusEmpresa;
  endereco: Endereco;
  ambiente: Ambiente;
  numeracao: NumeracaoNotas;
  enviarEmailAutomatico: boolean;
  certificado: CertificadoDigital | null;
  ultimaEmissaoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Empresa — aggregate root.
 *
 * Escopo de dono: cada Empresa pertence a um `ownerUserId` (vindo da sessão better-auth).
 * Essa é a dimensão de multi-tenancy pra tabela `empresas` especificamente.
 * Para tabelas filhas (produtos, notas), o tenant vira `empresaId`.
 *
 * Status não tem setter direto neste fase — é derivado:
 *   - nasce 'pendente'
 *   - vira 'ativa' quando tem certificado + endereço completo (regra simples do MVP)
 *   - 'inativa' só quando o use case de desativar explicitamente seta
 */
export class Empresa extends AggregateRoot<EmpresaProps> {
  private constructor(props: EmpresaProps, id: string) {
    super(props, id);
    this.invariantes();
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: CNPJ;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    cnaePrincipal: CNAE;
    cnaesSecundarios: CNAE[];
    regimeTributario: RegimeTributario;
    endereco: Endereco;
    ambiente: Ambiente;
    numeracao: NumeracaoNotas;
    enviarEmailAutomatico: boolean;
    certificado: CertificadoDigital | null;
    now: Date;
  }): Empresa {
    const empresa = new Empresa(
      {
        ownerUserId: input.ownerUserId,
        razaoSocial: input.razaoSocial.trim(),
        nomeFantasia: input.nomeFantasia.trim(),
        cnpj: input.cnpj,
        inscricaoEstadual: normalizeOptional(input.inscricaoEstadual),
        inscricaoMunicipal: normalizeOptional(input.inscricaoMunicipal),
        cnaePrincipal: input.cnaePrincipal,
        cnaesSecundarios: input.cnaesSecundarios,
        regimeTributario: input.regimeTributario,
        status: 'pendente',
        endereco: input.endereco,
        ambiente: input.ambiente,
        numeracao: input.numeracao,
        enviarEmailAutomatico: input.enviarEmailAutomatico,
        certificado: input.certificado,
        ultimaEmissaoEm: null,
        createdAt: input.now,
        updatedAt: input.now,
        deletedAt: null,
      },
      input.id,
    );
    empresa.recomputeStatus();
    return empresa;
  }

  static reconstitute(props: EmpresaProps & { id: string }): Empresa {
    const { id, ...rest } = props;
    return new Empresa(rest, id);
  }

  // --- getters (campos expostos para mappers/presenters) ---

  get ownerUserId(): string { return this.props.ownerUserId; }
  get razaoSocial(): string { return this.props.razaoSocial; }
  get nomeFantasia(): string { return this.props.nomeFantasia; }
  get cnpj(): CNPJ { return this.props.cnpj; }
  get inscricaoEstadual(): string | null { return this.props.inscricaoEstadual; }
  get inscricaoMunicipal(): string | null { return this.props.inscricaoMunicipal; }
  get cnaePrincipal(): CNAE { return this.props.cnaePrincipal; }
  get cnaesSecundarios(): CNAE[] { return this.props.cnaesSecundarios; }
  get regimeTributario(): RegimeTributario { return this.props.regimeTributario; }
  get status(): StatusEmpresa { return this.props.status; }
  get endereco(): Endereco { return this.props.endereco; }
  get ambiente(): Ambiente { return this.props.ambiente; }
  get numeracao(): NumeracaoNotas { return this.props.numeracao; }
  get enviarEmailAutomatico(): boolean { return this.props.enviarEmailAutomatico; }
  get certificado(): CertificadoDigital | null { return this.props.certificado; }
  get ultimaEmissaoEm(): Date | null { return this.props.ultimaEmissaoEm; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  // --- operações ---

  /**
   * Atualiza todos os campos editáveis vindos da tela de edição, incluindo CNPJ.
   * A checagem de duplicidade de CNPJ é responsabilidade do use case (usa o repository).
   * Mantém `ownerUserId`, `ultimaEmissaoEm` e timestamps de criação sob controle do domínio.
   */
  atualizar(input: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: CNPJ;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    cnaePrincipal: CNAE;
    cnaesSecundarios: CNAE[];
    regimeTributario: RegimeTributario;
    endereco: Endereco;
    ambiente: Ambiente;
    numeracao: NumeracaoNotas;
    enviarEmailAutomatico: boolean;
    certificado: CertificadoDigital | null;
    now: Date;
  }): void {
    this.props.razaoSocial = input.razaoSocial.trim();
    this.props.nomeFantasia = input.nomeFantasia.trim();
    this.props.cnpj = input.cnpj;
    this.props.inscricaoEstadual = normalizeOptional(input.inscricaoEstadual);
    this.props.inscricaoMunicipal = normalizeOptional(input.inscricaoMunicipal);
    this.props.cnaePrincipal = input.cnaePrincipal;
    this.props.cnaesSecundarios = input.cnaesSecundarios;
    this.props.regimeTributario = input.regimeTributario;
    this.props.endereco = input.endereco;
    this.props.ambiente = input.ambiente;
    this.props.numeracao = input.numeracao;
    this.props.enviarEmailAutomatico = input.enviarEmailAutomatico;
    this.props.certificado = input.certificado;
    this.props.updatedAt = input.now;
    this.recomputeStatus();
    this.invariantes();
  }

  certificadoExpiraEm(agora: Date): number | null {
    if (!this.props.certificado) return null;
    const ms = this.props.certificado.validUntil.getTime() - agora.getTime();
    return Math.ceil(ms / 86_400_000);
  }

  certificadoExpirado(agora: Date): boolean {
    const dias = this.certificadoExpiraEm(agora);
    return dias !== null && dias <= 0;
  }

  // --- invariantes e regras privadas ---

  private invariantes(): void {
    if (!this.props.ownerUserId) {
      throw new Error('empresa sem ownerUserId');
    }
    if (!this.props.razaoSocial) {
      throw new Error('razão social obrigatória');
    }
    if (!this.props.nomeFantasia) {
      throw new Error('nome fantasia obrigatório');
    }
    if (this.props.numeracao.nfeProximoNumero < 1 || this.props.numeracao.nfeSerie < 1) {
      throw new Error('numeração NF-e inválida');
    }
    if (this.props.numeracao.nfseProximoNumero < 1 || this.props.numeracao.nfseSerie < 1) {
      throw new Error('numeração NFS-e inválida');
    }
  }

  /**
   * Regra de status (MVP):
   *   - se soft-deletada: 'inativa'
   *   - se tem certificado metadado + endereço preenchido: 'ativa'
   *   - caso contrário: 'pendente'
   * Quando existir emissão de nota de verdade, o use case de emissão força 'ativa'.
   */
  private recomputeStatus(): void {
    if (this.props.deletedAt) {
      this.props.status = 'inativa';
      return;
    }
    const enderecoCompleto =
      !!this.props.endereco.logradouro &&
      !!this.props.endereco.numero &&
      !!this.props.endereco.bairro &&
      !!this.props.endereco.municipio &&
      !!this.props.endereco.uf;
    if (this.props.certificado && enderecoCompleto) {
      this.props.status = 'ativa';
    } else {
      this.props.status = 'pendente';
    }
  }
}

function normalizeOptional(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
