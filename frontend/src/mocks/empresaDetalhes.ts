import type {
  Ambiente,
  CompanyStatus,
  RegimeTributario,
} from '../api/empresas';

/**
 * Mock "prestador" usado pela tela de detalhe de nota (que ainda é mock nessa fase).
 * Shape FLAT — intencionalmente diferente da Empresa real (que tem endereço aninhado),
 * pra minimizar churn nos consumidores de Notas enquanto a migração deles não chega.
 *
 * Quando a migração de Notas sair, esse arquivo inteiro some e os consumidores passam
 * a ler a empresa real (via `useCompany().empresaAtiva`) com o shape aninhado.
 */

export type Certificado = {
  fileName: string;
  issuer: string;
  holder: string;
  /** ISO yyyy-mm-dd. */
  validUntil: string;
};

export type EmpresaDetalhes = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  regimeTributario: RegimeTributario;
  status: CompanyStatus;
  /** ISO yyyy-mm-dd. `null` quando a empresa ainda não emitiu nada. */
  ultimaEmissao: string | null;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  certificado: Certificado | null;
  ambiente: Ambiente;
  nfeProximoNumero: number;
  nfeSerie: number;
  nfseProximoNumero: number;
  nfseSerie: number;
  enviarEmailAutomatico: boolean;
};

/**
 * Base embutida: apenas as empresas referenciadas pelo mock de notas.
 * Mantenha em sync com `mocks/notaDetalhes.ts` e `mocks/notas.ts` enquanto eles forem mock.
 */
const empresasBase: Record<string, EmpresaDetalhes> = {
  emp_01: {
    id: 'emp_01',
    razaoSocial: 'Copy Que Converte LTDA',
    nomeFantasia: 'Copy Que Converte',
    cnpj: '32.145.678/0001-98',
    regimeTributario: 'simples',
    status: 'ativa',
    ultimaEmissao: '2026-04-19',
    inscricaoEstadual: '123.456.789.012',
    inscricaoMunicipal: '12.345.678-9',
    cnaePrincipal: '7319-0/04',
    cnaesSecundarios: ['8599-6/04', '7020-4/00'],
    cep: '01310-100',
    logradouro: 'Av. Paulista',
    numero: '1000',
    complemento: 'Sala 42',
    bairro: 'Bela Vista',
    municipio: 'São Paulo',
    uf: 'SP',
    certificado: {
      fileName: 'copy-que-converte.pfx',
      issuer: 'AC Certisign',
      holder: 'Copy Que Converte LTDA',
      validUntil: '2027-01-15',
    },
    ambiente: 'producao',
    nfeProximoNumero: 2119,
    nfeSerie: 1,
    nfseProximoNumero: 3450,
    nfseSerie: 1,
    enviarEmailAutomatico: true,
  },
};

export function getEmpresaDetalhes(id: string): EmpresaDetalhes | null {
  return empresasBase[id] ?? null;
}
