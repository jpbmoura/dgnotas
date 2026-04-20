import { AggregateRoot } from '../shared/aggregate-root';
import { CNPJ } from '../value-objects/cnpj';
import { CEP } from '../value-objects/cep';
import { CNAE } from '../value-objects/cnae';

export type RegimeTributario = 'simples' | 'mei' | 'presumido' | 'real';
export type StatusEmpresa = 'ativa' | 'pendente' | 'inativa';
export type Ambiente = 'homologacao' | 'producao';

/**
 * Regimes de tributação especiais usados em NFS-e municipal.
 * `null` significa "sem regime especial".
 */
export type RegimeEspecial =
  | 'microempresa_municipal'
  | 'estimativa'
  | 'sociedade_profissionais'
  | 'cooperativa'
  | 'mei'
  | 'me_epp_simples';

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
  isentoIE: boolean;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: CNAE;
  cnaesSecundarios: CNAE[];
  regimeTributario: RegimeTributario;
  regimeEspecial: RegimeEspecial | null;
  status: StatusEmpresa;
  endereco: Endereco;
  ambiente: Ambiente;
  numeracao: NumeracaoNotas;
  enviarEmailAutomatico: boolean;
  certificado: CertificadoDigital | null;
  email: string | null;
  /** Telefone armazenado como dígitos puros (DDD + número), 10 ou 11 dígitos. */
  telefone: string | null;
  /** Lista de e-mails para envio de relatórios. */
  emailsRelatorios: string[];
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
    isentoIE: boolean;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    cnaePrincipal: CNAE;
    cnaesSecundarios: CNAE[];
    regimeTributario: RegimeTributario;
    regimeEspecial: RegimeEspecial | null;
    endereco: Endereco;
    ambiente: Ambiente;
    numeracao: NumeracaoNotas;
    enviarEmailAutomatico: boolean;
    certificado: CertificadoDigital | null;
    email: string | null;
    telefone: string | null;
    emailsRelatorios: string[];
    now: Date;
  }): Empresa {
    const ieNormalizada = input.isentoIE ? null : normalizeOptional(input.inscricaoEstadual);

    const empresa = new Empresa(
      {
        ownerUserId: input.ownerUserId,
        razaoSocial: input.razaoSocial.trim(),
        nomeFantasia: input.nomeFantasia.trim(),
        cnpj: input.cnpj,
        isentoIE: input.isentoIE,
        inscricaoEstadual: ieNormalizada,
        inscricaoMunicipal: normalizeOptional(input.inscricaoMunicipal),
        cnaePrincipal: input.cnaePrincipal,
        cnaesSecundarios: input.cnaesSecundarios,
        regimeTributario: input.regimeTributario,
        regimeEspecial: input.regimeEspecial,
        status: 'pendente',
        endereco: input.endereco,
        ambiente: input.ambiente,
        numeracao: input.numeracao,
        enviarEmailAutomatico: input.enviarEmailAutomatico,
        certificado: input.certificado,
        email: normalizeOptional(input.email),
        telefone: normalizeTelefone(input.telefone),
        emailsRelatorios: normalizeEmailsList(input.emailsRelatorios),
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
  get isentoIE(): boolean { return this.props.isentoIE; }
  get inscricaoEstadual(): string | null { return this.props.inscricaoEstadual; }
  get inscricaoMunicipal(): string | null { return this.props.inscricaoMunicipal; }
  get cnaePrincipal(): CNAE { return this.props.cnaePrincipal; }
  get cnaesSecundarios(): CNAE[] { return this.props.cnaesSecundarios; }
  get regimeTributario(): RegimeTributario { return this.props.regimeTributario; }
  get regimeEspecial(): RegimeEspecial | null { return this.props.regimeEspecial; }
  get status(): StatusEmpresa { return this.props.status; }
  get endereco(): Endereco { return this.props.endereco; }
  get ambiente(): Ambiente { return this.props.ambiente; }
  get numeracao(): NumeracaoNotas { return this.props.numeracao; }
  get enviarEmailAutomatico(): boolean { return this.props.enviarEmailAutomatico; }
  get certificado(): CertificadoDigital | null { return this.props.certificado; }
  get email(): string | null { return this.props.email; }
  get telefone(): string | null { return this.props.telefone; }
  get emailsRelatorios(): string[] { return this.props.emailsRelatorios; }
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
    isentoIE: boolean;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    cnaePrincipal: CNAE;
    cnaesSecundarios: CNAE[];
    regimeTributario: RegimeTributario;
    regimeEspecial: RegimeEspecial | null;
    endereco: Endereco;
    ambiente: Ambiente;
    numeracao: NumeracaoNotas;
    enviarEmailAutomatico: boolean;
    certificado: CertificadoDigital | null;
    email: string | null;
    telefone: string | null;
    emailsRelatorios: string[];
    now: Date;
  }): void {
    this.props.razaoSocial = input.razaoSocial.trim();
    this.props.nomeFantasia = input.nomeFantasia.trim();
    this.props.cnpj = input.cnpj;
    this.props.isentoIE = input.isentoIE;
    this.props.inscricaoEstadual = input.isentoIE
      ? null
      : normalizeOptional(input.inscricaoEstadual);
    this.props.inscricaoMunicipal = normalizeOptional(input.inscricaoMunicipal);
    this.props.cnaePrincipal = input.cnaePrincipal;
    this.props.cnaesSecundarios = input.cnaesSecundarios;
    this.props.regimeTributario = input.regimeTributario;
    this.props.regimeEspecial = input.regimeEspecial;
    this.props.endereco = input.endereco;
    this.props.ambiente = input.ambiente;
    this.props.numeracao = input.numeracao;
    this.props.enviarEmailAutomatico = input.enviarEmailAutomatico;
    this.props.certificado = input.certificado;
    this.props.email = normalizeOptional(input.email);
    this.props.telefone = normalizeTelefone(input.telefone);
    this.props.emailsRelatorios = normalizeEmailsList(input.emailsRelatorios);
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
    if (this.props.isentoIE && this.props.inscricaoEstadual !== null) {
      throw new Error('empresa isenta de IE não pode ter inscrição estadual preenchida');
    }
    if (this.props.numeracao.nfeProximoNumero < 1 || this.props.numeracao.nfeSerie < 1) {
      throw new Error('numeração NF-e inválida');
    }
    if (this.props.numeracao.nfseProximoNumero < 1 || this.props.numeracao.nfseSerie < 1) {
      throw new Error('numeração NFS-e inválida');
    }
    if (this.props.telefone !== null && !/^[0-9]{10,11}$/.test(this.props.telefone)) {
      throw new Error('telefone deve conter apenas dígitos (10 ou 11)');
    }
    if (this.props.email !== null && !EMAIL_REGEX.test(this.props.email)) {
      throw new Error('e-mail da empresa em formato inválido');
    }
    for (const e of this.props.emailsRelatorios) {
      if (!EMAIL_REGEX.test(e)) {
        throw new Error(`e-mail de relatório em formato inválido: ${e}`);
      }
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptional(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeTelefone(value: string | null): string | null {
  if (value === null) return null;
  const digits = value.replace(/\D/g, '');
  return digits === '' ? null : digits;
}

function normalizeEmailsList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const t = raw.trim();
    if (t === '') continue;
    const lower = t.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(t);
  }
  return out;
}
