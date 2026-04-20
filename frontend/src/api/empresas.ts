import { http } from '../lib/http';

// ---------- Tipos ----------

export type RegimeTributario = 'simples' | 'mei' | 'presumido' | 'real';
export type CompanyStatus = 'ativa' | 'pendente' | 'inativa';
export type Ambiente = 'homologacao' | 'producao';

export type RegimeEspecial =
  | 'microempresa_municipal'
  | 'estimativa'
  | 'sociedade_profissionais'
  | 'cooperativa'
  | 'mei'
  | 'me_epp_simples';

export interface CertificadoDigital {
  fileName: string;
  issuer: string;
  holder: string;
  /** ISO yyyy-mm-dd */
  validUntil: string;
}

export interface Endereco {
  /** 8 dígitos, sem máscara. */
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface NumeracaoNotas {
  nfeProximoNumero: number;
  nfeSerie: number;
  nfseProximoNumero: number;
  nfseSerie: number;
}

/**
 * Representação completa de uma empresa — shape retornado pelo backend
 * em GET /empresas, GET /empresas/:id, POST /empresas, PUT /empresas/:id.
 */
export interface Empresa {
  id: string;
  ownerUserId: string;
  razaoSocial: string;
  nomeFantasia: string;
  /** 14 dígitos, sem máscara. Frontend formata para exibir. */
  cnpj: string;
  isentoIE: boolean;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  regimeTributario: RegimeTributario;
  regimeEspecial: RegimeEspecial | null;
  status: CompanyStatus;
  endereco: Endereco;
  ambiente: Ambiente;
  numeracao: NumeracaoNotas;
  enviarEmailAutomatico: boolean;
  certificado: CertificadoDigital | null;
  email: string | null;
  /** Dígitos puros (DDD + número), 10 ou 11 caracteres. Frontend formata. */
  telefone: string | null;
  emailsRelatorios: string[];
  /** ISO timestamp (ou null quando a empresa ainda não emitiu nada). */
  ultimaEmissaoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alias legado — `Company` ainda é usado em partes do código; é a mesma Empresa.
 * Novos módulos devem preferir `Empresa`.
 */
export type Company = Empresa;

// ---------- Payloads ----------

export interface UpsertEmpresaPayload {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  isentoIE: boolean;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
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
}

// ---------- Labels ----------

export const regimeLabel: Record<RegimeTributario, string> = {
  simples: 'Simples Nacional',
  mei: 'MEI',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
};

export const statusLabel: Record<CompanyStatus, string> = {
  ativa: 'Ativa',
  pendente: 'Pendente',
  inativa: 'Inativa',
};

// ---------- Endpoints ----------

type ListResponse = { empresas: Empresa[] };

export async function listEmpresas(): Promise<Empresa[]> {
  const { empresas } = await http.get<ListResponse>('/empresas');
  return empresas;
}

export async function getEmpresa(id: string): Promise<Empresa> {
  return http.get<Empresa>(`/empresas/${id}`);
}

export async function createEmpresa(payload: UpsertEmpresaPayload): Promise<Empresa> {
  return http.post<Empresa>('/empresas', payload);
}

export async function updateEmpresa(
  id: string,
  payload: UpsertEmpresaPayload,
): Promise<Empresa> {
  return http.put<Empresa>(`/empresas/${id}`, payload);
}

// ---------- Formatadores ----------

export function formatCNPJ(digits: string): string {
  const d = digits.replace(/\D/g, '').padEnd(14, '').slice(0, 14);
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatCEP(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 8) return digits;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
