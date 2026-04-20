import { z } from 'zod';

const regimeSchema = z.enum(['simples', 'mei', 'presumido', 'real']);
const ambienteSchema = z.enum(['homologacao', 'producao']);
const regimeEspecialSchema = z.enum([
  'microempresa_municipal',
  'estimativa',
  'sociedade_profissionais',
  'cooperativa',
  'mei',
  'me_epp_simples',
]);

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

const emailSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'E-mail inválido.')
  .transform((v) => (v === '' ? null : v))
  .nullable();

const telefoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || /^[0-9]{10,11}$/.test(v), 'Telefone deve ter 10 ou 11 dígitos.')
  .transform((v) => (v === '' ? null : v))
  .nullable();

export const createEmpresaBodySchema = z
  .object({
    cnpj: z.string(),
    razaoSocial: z.string().trim().min(1),
    nomeFantasia: z.string().trim().min(1),
    isentoIE: z.boolean().default(false),
    inscricaoEstadual: z.string().nullable().optional(),
    inscricaoMunicipal: z.string().nullable().optional(),
    cnaePrincipal: z.string(),
    cnaesSecundarios: z.array(z.string()).default([]),
    regimeTributario: regimeSchema,
    regimeEspecial: regimeEspecialSchema.nullable().optional(),
    endereco: enderecoSchema,
    ambiente: ambienteSchema,
    numeracao: numeracaoSchema,
    enviarEmailAutomatico: z.boolean(),
    certificado: certificadoSchema,
    email: emailSchema.optional(),
    telefone: telefoneSchema.optional(),
    emailsRelatorios: z.array(z.string()).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.isentoIE && val.inscricaoEstadual && val.inscricaoEstadual.trim() !== '') {
      ctx.addIssue({
        code: 'custom',
        path: ['inscricaoEstadual'],
        message: 'Empresa marcada como isenta não deve ter inscrição estadual.',
      });
    }
  });

export const updateEmpresaBodySchema = createEmpresaBodySchema;

export type CreateEmpresaBody = z.infer<typeof createEmpresaBodySchema>;
export type UpdateEmpresaBody = z.infer<typeof updateEmpresaBodySchema>;
