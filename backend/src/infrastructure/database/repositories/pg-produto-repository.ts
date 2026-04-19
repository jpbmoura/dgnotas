import type { Pool } from 'pg';
import type { ProdutoRepository } from '../../../application/ports/produto-repository';
import type { Produto } from '../../../domain/entities/produto';
import { produtoMapper, type ProdutoRow } from '../mappers/produto-mapper';

const SELECT_ALL = `
  id, empresa_id, tipo, codigo, nome, descricao, valor, status,
  cst_ibs_cbs, c_class_trib,
  unidade, ncm, gtin, sujeito_st, cest, origem, cfop,
  cst_or_csosn, aliq_icms, cst_pis, aliq_pis, cst_cofins, aliq_cofins,
  lc116, ctiss, cnae_relacionado, aliq_iss, iss_retido, local_incidencia,
  ret_pis_enabled, ret_pis_aliq,
  ret_cofins_enabled, ret_cofins_aliq,
  ret_csll_enabled, ret_csll_aliq,
  ret_irrf_enabled, ret_irrf_aliq,
  ret_inss_enabled, ret_inss_aliq,
  created_at, updated_at, deleted_at
`;

export class PgProdutoRepository implements ProdutoRepository {
  constructor(private readonly pool: Pool) {}

  async save(produto: Produto): Promise<void> {
    const p = produto.produtoConfig;
    const s = produto.servicoConfig;

    await this.pool.query(
      `
      INSERT INTO produtos (
        id, empresa_id, tipo, codigo, nome, descricao, valor, status,
        cst_ibs_cbs, c_class_trib,
        unidade, ncm, gtin, sujeito_st, cest, origem, cfop,
        cst_or_csosn, aliq_icms, cst_pis, aliq_pis, cst_cofins, aliq_cofins,
        lc116, ctiss, cnae_relacionado, aliq_iss, iss_retido, local_incidencia,
        ret_pis_enabled, ret_pis_aliq,
        ret_cofins_enabled, ret_cofins_aliq,
        ret_csll_enabled, ret_csll_aliq,
        ret_irrf_enabled, ret_irrf_aliq,
        ret_inss_enabled, ret_inss_aliq,
        created_at, updated_at, deleted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29,
        $30, $31,
        $32, $33,
        $34, $35,
        $36, $37,
        $38, $39,
        $40, $41, $42
      )
      ON CONFLICT (id) DO UPDATE SET
        codigo              = EXCLUDED.codigo,
        nome                = EXCLUDED.nome,
        descricao           = EXCLUDED.descricao,
        valor               = EXCLUDED.valor,
        status              = EXCLUDED.status,
        cst_ibs_cbs         = EXCLUDED.cst_ibs_cbs,
        c_class_trib        = EXCLUDED.c_class_trib,
        unidade             = EXCLUDED.unidade,
        ncm                 = EXCLUDED.ncm,
        gtin                = EXCLUDED.gtin,
        sujeito_st          = EXCLUDED.sujeito_st,
        cest                = EXCLUDED.cest,
        origem              = EXCLUDED.origem,
        cfop                = EXCLUDED.cfop,
        cst_or_csosn        = EXCLUDED.cst_or_csosn,
        aliq_icms           = EXCLUDED.aliq_icms,
        cst_pis             = EXCLUDED.cst_pis,
        aliq_pis            = EXCLUDED.aliq_pis,
        cst_cofins          = EXCLUDED.cst_cofins,
        aliq_cofins         = EXCLUDED.aliq_cofins,
        lc116               = EXCLUDED.lc116,
        ctiss               = EXCLUDED.ctiss,
        cnae_relacionado    = EXCLUDED.cnae_relacionado,
        aliq_iss            = EXCLUDED.aliq_iss,
        iss_retido          = EXCLUDED.iss_retido,
        local_incidencia    = EXCLUDED.local_incidencia,
        ret_pis_enabled     = EXCLUDED.ret_pis_enabled,
        ret_pis_aliq        = EXCLUDED.ret_pis_aliq,
        ret_cofins_enabled  = EXCLUDED.ret_cofins_enabled,
        ret_cofins_aliq     = EXCLUDED.ret_cofins_aliq,
        ret_csll_enabled    = EXCLUDED.ret_csll_enabled,
        ret_csll_aliq       = EXCLUDED.ret_csll_aliq,
        ret_irrf_enabled    = EXCLUDED.ret_irrf_enabled,
        ret_irrf_aliq       = EXCLUDED.ret_irrf_aliq,
        ret_inss_enabled    = EXCLUDED.ret_inss_enabled,
        ret_inss_aliq       = EXCLUDED.ret_inss_aliq,
        deleted_at          = EXCLUDED.deleted_at
      `,
      [
        produto.id,
        produto.empresaId,
        produto.tipo,
        produto.codigo,
        produto.nome,
        produto.descricao,
        produto.valor,
        produto.status,
        produto.ibsCbs.cstIbsCbs,
        produto.ibsCbs.cClassTrib,
        // Produto
        p?.unidade ?? null,
        p?.ncm ? p.ncm.toString() : null,
        p?.gtin ?? null,
        p?.sujeitoST ?? null,
        p?.cest ?? null,
        p?.origem ?? null,
        p?.cfop ?? null,
        p?.cstOrCsosn ?? null,
        p?.aliqIcms ?? null,
        p?.cstPis ?? null,
        p?.aliqPis ?? null,
        p?.cstCofins ?? null,
        p?.aliqCofins ?? null,
        // Serviço
        s?.lc116 ?? null,
        s?.ctiss ?? null,
        s?.cnaeRelacionado ?? null,
        s?.aliqIss ?? null,
        s?.issRetido ?? null,
        s?.localIncidencia ?? null,
        s?.retPis.enabled ?? null,
        s?.retPis.aliq ?? null,
        s?.retCofins.enabled ?? null,
        s?.retCofins.aliq ?? null,
        s?.retCsll.enabled ?? null,
        s?.retCsll.aliq ?? null,
        s?.retIrrf.enabled ?? null,
        s?.retIrrf.aliq ?? null,
        s?.retInss.enabled ?? null,
        s?.retInss.aliq ?? null,
        // Timestamps
        produto.createdAt,
        produto.updatedAt,
        produto.deletedAt,
      ],
    );
  }

  async findByIdForEmpresa(empresaId: string, id: string): Promise<Produto | null> {
    const { rows } = await this.pool.query<ProdutoRow>(
      `SELECT ${SELECT_ALL} FROM produtos
       WHERE id = $1 AND empresa_id = $2 AND deleted_at IS NULL`,
      [id, empresaId],
    );
    return rows[0] ? produtoMapper.toDomain(rows[0]) : null;
  }

  async findAllByEmpresa(empresaId: string): Promise<Produto[]> {
    const { rows } = await this.pool.query<ProdutoRow>(
      `SELECT ${SELECT_ALL} FROM produtos
       WHERE empresa_id = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [empresaId],
    );
    return rows.map(produtoMapper.toDomain);
  }

  async existsByEmpresaAndCodigo(
    empresaId: string,
    codigo: string,
    excludeId?: string,
  ): Promise<boolean> {
    const params: (string | undefined)[] = [empresaId, codigo];
    let sql = `
      SELECT 1 FROM produtos
      WHERE empresa_id = $1 AND codigo = $2 AND deleted_at IS NULL
    `;
    if (excludeId) {
      sql += ' AND id <> $3';
      params.push(excludeId);
    }
    sql += ' LIMIT 1';

    const { rowCount } = await this.pool.query(sql, params);
    return (rowCount ?? 0) > 0;
  }

  async softDelete(empresaId: string, id: string, now: Date): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE produtos
         SET deleted_at = $1
       WHERE id = $2
         AND empresa_id = $3
         AND deleted_at IS NULL`,
      [now, id, empresaId],
    );
    return (rowCount ?? 0) > 0;
  }
}
