import type { Pool } from 'pg';
import type { EmpresaRepository } from '../../../application/ports/empresa-repository';
import type { Empresa } from '../../../domain/entities/empresa';
import { empresaMapper, type EmpresaRow } from '../mappers/empresa-mapper';

const SELECT_ALL = `
  id, owner_user_id, razao_social, nome_fantasia, cnpj,
  inscricao_estadual, inscricao_municipal,
  cnae_principal, cnaes_secundarios,
  regime_tributario, status,
  cep, logradouro, numero, complemento, bairro, municipio, uf,
  ambiente, nfe_proximo_numero, nfe_serie, nfse_proximo_numero, nfse_serie,
  enviar_email_automatico,
  certificado_file_name, certificado_issuer, certificado_holder, certificado_valid_until,
  ultima_emissao_em, created_at, updated_at, deleted_at
`;

export class PgEmpresaRepository implements EmpresaRepository {
  constructor(private readonly pool: Pool) {}

  async save(empresa: Empresa): Promise<void> {
    const cert = empresa.certificado;
    const validUntil = cert ? cert.validUntil.toISOString().slice(0, 10) : null;

    await this.pool.query(
      `
      INSERT INTO empresas (
        id, owner_user_id, razao_social, nome_fantasia, cnpj,
        inscricao_estadual, inscricao_municipal,
        cnae_principal, cnaes_secundarios,
        regime_tributario, status,
        cep, logradouro, numero, complemento, bairro, municipio, uf,
        ambiente, nfe_proximo_numero, nfe_serie, nfse_proximo_numero, nfse_serie,
        enviar_email_automatico,
        certificado_file_name, certificado_issuer, certificado_holder, certificado_valid_until,
        ultima_emissao_em, created_at, updated_at, deleted_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23,
        $24,
        $25, $26, $27, $28,
        $29, $30, $31, $32
      )
      ON CONFLICT (id) DO UPDATE SET
        razao_social            = EXCLUDED.razao_social,
        nome_fantasia           = EXCLUDED.nome_fantasia,
        cnpj                    = EXCLUDED.cnpj,
        inscricao_estadual      = EXCLUDED.inscricao_estadual,
        inscricao_municipal     = EXCLUDED.inscricao_municipal,
        cnae_principal          = EXCLUDED.cnae_principal,
        cnaes_secundarios       = EXCLUDED.cnaes_secundarios,
        regime_tributario       = EXCLUDED.regime_tributario,
        status                  = EXCLUDED.status,
        cep                     = EXCLUDED.cep,
        logradouro              = EXCLUDED.logradouro,
        numero                  = EXCLUDED.numero,
        complemento             = EXCLUDED.complemento,
        bairro                  = EXCLUDED.bairro,
        municipio               = EXCLUDED.municipio,
        uf                      = EXCLUDED.uf,
        ambiente                = EXCLUDED.ambiente,
        nfe_proximo_numero      = EXCLUDED.nfe_proximo_numero,
        nfe_serie               = EXCLUDED.nfe_serie,
        nfse_proximo_numero     = EXCLUDED.nfse_proximo_numero,
        nfse_serie              = EXCLUDED.nfse_serie,
        enviar_email_automatico = EXCLUDED.enviar_email_automatico,
        certificado_file_name   = EXCLUDED.certificado_file_name,
        certificado_issuer      = EXCLUDED.certificado_issuer,
        certificado_holder      = EXCLUDED.certificado_holder,
        certificado_valid_until = EXCLUDED.certificado_valid_until,
        ultima_emissao_em       = EXCLUDED.ultima_emissao_em,
        deleted_at              = EXCLUDED.deleted_at
      `,
      [
        empresa.id,
        empresa.ownerUserId,
        empresa.razaoSocial,
        empresa.nomeFantasia,
        empresa.cnpj.toString(),
        empresa.inscricaoEstadual,
        empresa.inscricaoMunicipal,
        empresa.cnaePrincipal.toString(),
        empresa.cnaesSecundarios.map((c) => c.toString()),
        empresa.regimeTributario,
        empresa.status,
        empresa.endereco.cep.toString(),
        empresa.endereco.logradouro,
        empresa.endereco.numero,
        empresa.endereco.complemento,
        empresa.endereco.bairro,
        empresa.endereco.municipio,
        empresa.endereco.uf,
        empresa.ambiente,
        empresa.numeracao.nfeProximoNumero,
        empresa.numeracao.nfeSerie,
        empresa.numeracao.nfseProximoNumero,
        empresa.numeracao.nfseSerie,
        empresa.enviarEmailAutomatico,
        cert?.fileName ?? null,
        cert?.issuer ?? null,
        cert?.holder ?? null,
        validUntil,
        empresa.ultimaEmissaoEm,
        empresa.createdAt,
        empresa.updatedAt,
        empresa.deletedAt,
      ],
    );
  }

  async findByIdForOwner(ownerUserId: string, id: string): Promise<Empresa | null> {
    const { rows } = await this.pool.query<EmpresaRow>(
      `SELECT ${SELECT_ALL} FROM empresas
       WHERE id = $1 AND owner_user_id = $2 AND deleted_at IS NULL`,
      [id, ownerUserId],
    );
    return rows[0] ? empresaMapper.toDomain(rows[0]) : null;
  }

  async findAllByOwner(ownerUserId: string): Promise<Empresa[]> {
    const { rows } = await this.pool.query<EmpresaRow>(
      `SELECT ${SELECT_ALL} FROM empresas
       WHERE owner_user_id = $1 AND deleted_at IS NULL
       ORDER BY nome_fantasia ASC`,
      [ownerUserId],
    );
    return rows.map(empresaMapper.toDomain);
  }

  async existsByOwnerAndCnpj(
    ownerUserId: string,
    cnpjDigits: string,
    excludeId?: string,
  ): Promise<boolean> {
    const params: (string | undefined)[] = [ownerUserId, cnpjDigits];
    let sql = `
      SELECT 1 FROM empresas
      WHERE owner_user_id = $1 AND cnpj = $2 AND deleted_at IS NULL
    `;
    if (excludeId) {
      sql += ' AND id <> $3';
      params.push(excludeId);
    }
    sql += ' LIMIT 1';

    const { rowCount } = await this.pool.query(sql, params);
    return (rowCount ?? 0) > 0;
  }
}
