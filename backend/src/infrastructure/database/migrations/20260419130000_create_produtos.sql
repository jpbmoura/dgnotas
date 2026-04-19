-- Up Migration

-- Enums do domínio Produto.
CREATE TYPE tipo_item_enum        AS ENUM ('produto', 'servico');
CREATE TYPE status_item_enum      AS ENUM ('ativo', 'inativo');
CREATE TYPE local_incidencia_enum AS ENUM ('prestador', 'tomador');

-- Tabela única com discriminador `tipo`. Campos específicos de cada tipo são nullable;
-- CHECKs de coerência garantem que só os campos do tipo certo estão preenchidos.
CREATE TABLE produtos (
  id                      UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID                   NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,

  -- Comum
  tipo                    tipo_item_enum         NOT NULL,
  codigo                  VARCHAR(50)            NOT NULL,
  nome                    VARCHAR(255)           NOT NULL,
  descricao               TEXT                   NOT NULL DEFAULT '',
  valor                   NUMERIC(15, 2)         NOT NULL,
  status                  status_item_enum       NOT NULL DEFAULT 'ativo',

  -- IBS/CBS (comum aos dois tipos)
  cst_ibs_cbs             VARCHAR(3)             NOT NULL,
  c_class_trib            VARCHAR(10)            NOT NULL,

  -- Só Produto
  unidade                 VARCHAR(10),
  ncm                     VARCHAR(8),
  gtin                    VARCHAR(14),
  sujeito_st              BOOLEAN,
  cest                    VARCHAR(8),
  origem                  VARCHAR(1),
  cfop                    VARCHAR(4),
  cst_or_csosn            VARCHAR(4),
  aliq_icms               NUMERIC(7, 4),
  cst_pis                 VARCHAR(2),
  aliq_pis                NUMERIC(7, 4),
  cst_cofins              VARCHAR(2),
  aliq_cofins             NUMERIC(7, 4),

  -- Só Serviço
  lc116                   VARCHAR(10),
  ctiss                   VARCHAR(10),
  cnae_relacionado        VARCHAR(10),
  aliq_iss                NUMERIC(7, 4),
  iss_retido              BOOLEAN,
  local_incidencia        local_incidencia_enum,
  ret_pis_enabled         BOOLEAN,
  ret_pis_aliq            NUMERIC(7, 4),
  ret_cofins_enabled      BOOLEAN,
  ret_cofins_aliq         NUMERIC(7, 4),
  ret_csll_enabled        BOOLEAN,
  ret_csll_aliq           NUMERIC(7, 4),
  ret_irrf_enabled        BOOLEAN,
  ret_irrf_aliq           NUMERIC(7, 4),
  ret_inss_enabled        BOOLEAN,
  ret_inss_aliq           NUMERIC(7, 4),

  created_at              TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ            NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ,

  CONSTRAINT ck_produtos_valor
    CHECK (valor >= 0),

  CONSTRAINT ck_produtos_ncm_formato
    CHECK (ncm IS NULL OR ncm ~ '^\d{8}$'),

  CONSTRAINT ck_produtos_gtin_formato
    CHECK (gtin IS NULL OR gtin ~ '^(\d{8}|\d{12,14})$'),

  CONSTRAINT ck_produtos_cfop_formato
    CHECK (cfop IS NULL OR cfop ~ '^\d{4}$'),

  CONSTRAINT ck_produtos_cest_formato
    CHECK (cest IS NULL OR cest ~ '^\d{7}$'),

  CONSTRAINT ck_produtos_aliq_icms
    CHECK (aliq_icms IS NULL OR (aliq_icms BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_aliq_pis
    CHECK (aliq_pis IS NULL OR (aliq_pis BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_aliq_cofins
    CHECK (aliq_cofins IS NULL OR (aliq_cofins BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_aliq_iss
    CHECK (aliq_iss IS NULL OR (aliq_iss BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_ret_pis
    CHECK (ret_pis_aliq IS NULL OR (ret_pis_aliq BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_ret_cofins
    CHECK (ret_cofins_aliq IS NULL OR (ret_cofins_aliq BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_ret_csll
    CHECK (ret_csll_aliq IS NULL OR (ret_csll_aliq BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_ret_irrf
    CHECK (ret_irrf_aliq IS NULL OR (ret_irrf_aliq BETWEEN 0 AND 100)),
  CONSTRAINT ck_produtos_ret_inss
    CHECK (ret_inss_aliq IS NULL OR (ret_inss_aliq BETWEEN 0 AND 100)),

  -- Coerência do discriminador: campos de produto só quando tipo='produto'.
  CONSTRAINT ck_produtos_produto_coerencia
    CHECK (
      tipo = 'produto' OR (
        unidade IS NULL AND ncm IS NULL AND gtin IS NULL AND sujeito_st IS NULL
        AND cest IS NULL AND origem IS NULL AND cfop IS NULL AND cst_or_csosn IS NULL
        AND aliq_icms IS NULL AND cst_pis IS NULL AND aliq_pis IS NULL
        AND cst_cofins IS NULL AND aliq_cofins IS NULL
      )
    ),

  CONSTRAINT ck_produtos_servico_coerencia
    CHECK (
      tipo = 'servico' OR (
        lc116 IS NULL AND ctiss IS NULL AND cnae_relacionado IS NULL
        AND aliq_iss IS NULL AND iss_retido IS NULL AND local_incidencia IS NULL
        AND ret_pis_enabled IS NULL AND ret_pis_aliq IS NULL
        AND ret_cofins_enabled IS NULL AND ret_cofins_aliq IS NULL
        AND ret_csll_enabled IS NULL AND ret_csll_aliq IS NULL
        AND ret_irrf_enabled IS NULL AND ret_irrf_aliq IS NULL
        AND ret_inss_enabled IS NULL AND ret_inss_aliq IS NULL
      )
    )
);

-- Não duplica código dentro da mesma empresa (parcial pra permitir recriar após soft delete).
CREATE UNIQUE INDEX uq_produtos_empresa_codigo
  ON produtos (empresa_id, codigo)
  WHERE deleted_at IS NULL;

-- Multi-tenancy: listagem padrão é por empresa, ignorando soft-deletadas.
CREATE INDEX idx_produtos_empresa
  ON produtos (empresa_id)
  WHERE deleted_at IS NULL;

-- Filtros comuns da tela (tipo + status por empresa).
CREATE INDEX idx_produtos_empresa_tipo_status
  ON produtos (empresa_id, tipo, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_produtos_updated_at
BEFORE UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Down Migration

DROP TABLE IF EXISTS produtos;
DROP TYPE  IF EXISTS local_incidencia_enum;
DROP TYPE  IF EXISTS status_item_enum;
DROP TYPE  IF EXISTS tipo_item_enum;
