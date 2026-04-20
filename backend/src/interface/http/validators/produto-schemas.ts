import { z } from 'zod';

const retencaoSchema = z.object({
  enabled: z.boolean(),
  aliq: z.number().min(0).max(100),
});

const produtoConfigSchema = z.object({
  unidade: z.string().trim().min(1),
  ncm: z.string().nullable(),
  cest: z.string().nullable().optional(),
  origem: z.string().trim().min(1),
  cfop: z.string().trim().min(1),
  cstOrCsosn: z.string().trim().min(1),
  aliqIcms: z.number().min(0).max(100),
  cstIpi: z.string().trim().min(1),
  aliqIpi: z.number().min(0).max(100),
  cstPis: z.string().trim().min(1),
  aliqPis: z.number().min(0).max(100),
  cstCofins: z.string().trim().min(1),
  aliqCofins: z.number().min(0).max(100),
});

const servicoConfigSchema = z.object({
  lc116: z.string().trim().min(1),
  ctiss: z.string().nullable().optional(),
  cnaeRelacionado: z.string().nullable().optional(),
  aliqIss: z.number().min(0).max(100),
  issRetido: z.boolean(),
  localIncidencia: z.enum(['prestador', 'tomador']),
  retPis: retencaoSchema,
  retCofins: retencaoSchema,
  retCsll: retencaoSchema,
  retIrrf: retencaoSchema,
  retInss: retencaoSchema,
});

const tipoSchema = z.enum(['produto', 'servico']);
const statusSchema = z.enum(['ativo', 'inativo']);
const plataformaSchema = z
  .enum(['hotmart', 'eduzz', 'kiwify', 'hubla', 'perfectpay', 'outra'])
  .nullable()
  .optional();
const garantiaSchema = z
  .enum(['sem_garantia', 'dias_7', 'dias_15', 'dias_30', 'dias_60', 'dias_90'])
  .nullable()
  .optional();
const nomeFiscalSchema = z
  .string()
  .trim()
  .nullable()
  .optional();

/**
 * Create body. Valida superset e faz refine:
 *   - se tipo='produto', produtoConfig deve estar presente; servicoConfig ignorado
 *   - se tipo='servico', servicoConfig deve estar presente; produtoConfig ignorado
 */
export const createProdutoBodySchema = z
  .object({
    tipo: tipoSchema,
    codigo: z.string().trim().min(1),
    nome: z.string().trim().min(1),
    nomeFiscal: nomeFiscalSchema,
    descricao: z.string().default(''),
    valor: z.number().min(0),
    plataforma: plataformaSchema,
    garantia: garantiaSchema,
    produtoConfig: produtoConfigSchema.nullable().optional(),
    servicoConfig: servicoConfigSchema.nullable().optional(),
  })
  .refine(
    (v) => (v.tipo === 'produto' ? v.produtoConfig != null : true),
    { message: 'produtoConfig é obrigatório quando tipo="produto"', path: ['produtoConfig'] },
  )
  .refine(
    (v) => (v.tipo === 'servico' ? v.servicoConfig != null : true),
    { message: 'servicoConfig é obrigatório quando tipo="servico"', path: ['servicoConfig'] },
  );

/**
 * Update body. `tipo` não é editável (vem do recurso carregado); `status` vira editável.
 */
export const updateProdutoBodySchema = z.object({
  codigo: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  nomeFiscal: nomeFiscalSchema,
  descricao: z.string().default(''),
  valor: z.number().min(0),
  status: statusSchema,
  plataforma: plataformaSchema,
  garantia: garantiaSchema,
  produtoConfig: produtoConfigSchema.nullable().optional(),
  servicoConfig: servicoConfigSchema.nullable().optional(),
});

export type CreateProdutoBody = z.infer<typeof createProdutoBodySchema>;
export type UpdateProdutoBody = z.infer<typeof updateProdutoBodySchema>;
