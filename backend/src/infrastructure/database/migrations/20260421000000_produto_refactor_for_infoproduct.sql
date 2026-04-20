-- Up Migration

-- Enums novos do produto (foco infoprodutor).
CREATE TYPE plataforma_enum AS ENUM (
  'hotmart',
  'eduzz',
  'kiwify',
  'hubla',
  'perfectpay',
  'outra'
);

CREATE TYPE garantia_enum AS ENUM (
  'sem_garantia',
  'dias_7',
  'dias_15',
  'dias_30',
  'dias_60',
  'dias_90'
);

-- Remove constraints antigas que referenciam colunas descontinuadas (gtin, sujeito_st, cst_ibs_cbs, c_class_trib).
ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS ck_produtos_produto_coerencia,
  DROP CONSTRAINT IF EXISTS ck_produtos_gtin_formato;

-- Remove colunas que saíram da tela de cadastro.
-- GTIN e Sujeito a ST não aparecem no form de infoprodutor.
-- IBS/CBS (reforma tributária) foi tirado do MVP; quando voltar, migration separada.
ALTER TABLE produtos
  DROP COLUMN IF EXISTS gtin,
  DROP COLUMN IF EXISTS sujeito_st,
  DROP COLUMN IF EXISTS cst_ibs_cbs,
  DROP COLUMN IF EXISTS c_class_trib;

-- Novos campos de Produto (raiz do aggregate).
ALTER TABLE produtos
  ADD COLUMN nome_fiscal   VARCHAR(255),
  ADD COLUMN plataforma    plataforma_enum,
  ADD COLUMN garantia      garantia_enum;

-- Novos campos tributários do ProdutoConfig (só preenchidos quando tipo='produto').
ALTER TABLE produtos
  ADD COLUMN cst_ipi       VARCHAR(3),
  ADD COLUMN aliq_ipi      NUMERIC(7, 4);

-- Range de IPI igual aos demais impostos.
ALTER TABLE produtos
  ADD CONSTRAINT ck_produtos_aliq_ipi
    CHECK (aliq_ipi IS NULL OR (aliq_ipi BETWEEN 0 AND 100));

-- CST IPI: 2 ou 3 dígitos (mantém tolerante pra CSTs legados de 2 dígitos).
ALTER TABLE produtos
  ADD CONSTRAINT ck_produtos_cst_ipi_formato
    CHECK (cst_ipi IS NULL OR cst_ipi ~ '^\d{2,3}$');

-- Nova coerência do discriminador: campos de produto só quando tipo='produto'.
-- Inclui os novos cst_ipi/aliq_ipi; removidos gtin/sujeito_st.
ALTER TABLE produtos
  ADD CONSTRAINT ck_produtos_produto_coerencia
    CHECK (
      tipo = 'produto' OR (
        unidade IS NULL AND ncm IS NULL
        AND cest IS NULL AND origem IS NULL AND cfop IS NULL AND cst_or_csosn IS NULL
        AND aliq_icms IS NULL AND cst_ipi IS NULL AND aliq_ipi IS NULL
        AND cst_pis IS NULL AND aliq_pis IS NULL
        AND cst_cofins IS NULL AND aliq_cofins IS NULL
      )
    );


-- Down Migration

ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS ck_produtos_produto_coerencia,
  DROP CONSTRAINT IF EXISTS ck_produtos_cst_ipi_formato,
  DROP CONSTRAINT IF EXISTS ck_produtos_aliq_ipi;

ALTER TABLE produtos
  DROP COLUMN IF EXISTS aliq_ipi,
  DROP COLUMN IF EXISTS cst_ipi,
  DROP COLUMN IF EXISTS garantia,
  DROP COLUMN IF EXISTS plataforma,
  DROP COLUMN IF EXISTS nome_fiscal;

ALTER TABLE produtos
  ADD COLUMN gtin         VARCHAR(14),
  ADD COLUMN sujeito_st   BOOLEAN,
  ADD COLUMN cst_ibs_cbs  VARCHAR(3)   NOT NULL DEFAULT '',
  ADD COLUMN c_class_trib VARCHAR(10)  NOT NULL DEFAULT '';

ALTER TABLE produtos
  ADD CONSTRAINT ck_produtos_gtin_formato
    CHECK (gtin IS NULL OR gtin ~ '^(\d{8}|\d{12,14})$');

ALTER TABLE produtos
  ADD CONSTRAINT ck_produtos_produto_coerencia
    CHECK (
      tipo = 'produto' OR (
        unidade IS NULL AND ncm IS NULL AND gtin IS NULL AND sujeito_st IS NULL
        AND cest IS NULL AND origem IS NULL AND cfop IS NULL AND cst_or_csosn IS NULL
        AND aliq_icms IS NULL AND cst_pis IS NULL AND aliq_pis IS NULL
        AND cst_cofins IS NULL AND aliq_cofins IS NULL
      )
    );

DROP TYPE IF EXISTS garantia_enum;
DROP TYPE IF EXISTS plataforma_enum;
