import { z } from 'zod';

const regimeSchema = z.enum(['simples', 'mei', 'presumido', 'real']);
const ambienteSchema = z.enum(['homologacao', 'producao']);

const enderecoSchema = z.object({
  cep: z.string(),
  logradouro: z.string().trim().min(1),
  numero: z.string().trim().min(1),
  complemento: z.string().nullable().optional(),
  bairro: z.string().trim().min(1),
  municipio: z.string().trim().min(1),
  uf: z.string().trim().length(2),
});

const numeracaoSchema = z.object({
  nfeProximoNumero: z.number().int().min(1),
  nfeSerie: z.number().int().min(1),
  nfseProximoNumero: z.number().int().min(1),
  nfseSerie: z.number().int().min(1),
});

const certificadoSchema = z
  .object({
    fileName: z.string().trim().min(1),
    issuer: z.string().trim().min(1),
    holder: z.string().trim().min(1),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .nullable();

export const createEmpresaBodySchema = z.object({
  cnpj: z.string(),
  razaoSocial: z.string().trim().min(1),
  nomeFantasia: z.string().trim().min(1),
  inscricaoEstadual: z.string().nullable().optional(),
  inscricaoMunicipal: z.string().nullable().optional(),
  cnaePrincipal: z.string(),
  cnaesSecundarios: z.array(z.string()).default([]),
  regimeTributario: regimeSchema,
  endereco: enderecoSchema,
  ambiente: ambienteSchema,
  numeracao: numeracaoSchema,
  enviarEmailAutomatico: z.boolean(),
  certificado: certificadoSchema,
});

export const updateEmpresaBodySchema = createEmpresaBodySchema;

export type CreateEmpresaBody = z.infer<typeof createEmpresaBodySchema>;
export type UpdateEmpresaBody = z.infer<typeof updateEmpresaBodySchema>;
