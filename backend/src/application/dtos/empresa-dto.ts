import type {
  Ambiente,
  RegimeEspecial,
  RegimeTributario,
  StatusEmpresa,
} from '../../domain/entities/empresa';

/**
 * Input puramente estrutural — já é o payload "limpo" (após validação Zod na borda).
 * VOs são construídos dentro do use case a partir destes strings.
 */
export interface CreateEmpresaInput {
  ownerUserId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  isentoIE: boolean;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  regimeTributario: RegimeTributario;
  regimeEspecial: RegimeEspecial | null;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    municipio: string;
    uf: string;
  };
  ambiente: Ambiente;
  numeracao: {
    nfeProximoNumero: number;
    nfeSerie: number;
    nfseProximoNumero: number;
    nfseSerie: number;
  };
  enviarEmailAutomatico: boolean;
  certificado: {
    fileName: string;
    issuer: string;
    holder: string;
    /** ISO yyyy-mm-dd */
    validUntil: string;
  } | null;
  email: string | null;
  telefone: string | null;
  emailsRelatorios: string[];
}

/**
 * Input de atualização: mesmos campos do create, mas sem `ownerUserId`
 * (vem do contexto da requisição e já foi validado pelo ownership middleware).
 */
export type UpdateEmpresaInput = Omit<CreateEmpresaInput, 'ownerUserId'>;

/**
 * Output normalizado da empresa. É o que o controller entrega pro frontend após `presenter`.
 * CNPJ e CEP em dígitos puros — o frontend formata pra exibir.
 */
export interface EmpresaOutput {
  id: string;
  ownerUserId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  isentoIE: boolean;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  regimeTributario: RegimeTributario;
  regimeEspecial: RegimeEspecial | null;
  status: StatusEmpresa;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    municipio: string;
    uf: string;
  };
  ambiente: Ambiente;
  numeracao: {
    nfeProximoNumero: number;
    nfeSerie: number;
    nfseProximoNumero: number;
    nfseSerie: number;
  };
  enviarEmailAutomatico: boolean;
  certificado: {
    fileName: string;
    issuer: string;
    holder: string;
    validUntil: string;
  } | null;
  email: string | null;
  telefone: string | null;
  emailsRelatorios: string[];
  ultimaEmissaoEm: string | null;
  createdAt: string;
  updatedAt: string;
}
