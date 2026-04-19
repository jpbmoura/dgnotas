-- Up Migration

-- Enums do domínio Empresa.
CREATE TYPE regime_tributario_enum AS ENUM ('simples', 'mei', 'presumido', 'real');
CREATE TYPE status_empresa_enum    AS ENUM ('ativa', 'pendente', 'inativa');
CREATE TYPE ambiente_enum          AS ENUM ('homologacao', 'producao');

-- Trigger genérico de updated_at (reutilizado em outras tabelas depois).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE empresas (
  id                         UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id              TEXT                   NOT NULL,

  -- Identificação
  razao_social               VARCHAR(255)           NOT NULL,
  nome_fantasia              VARCHAR(255)           NOT NULL,
  cnpj                       VARCHAR(14)            NOT NULL,
  inscricao_estadual         VARCHAR(20),
  inscricao_municipal        VARCHAR(20),
  cnae_principal             VARCHAR(10)            NOT NULL,
  cnaes_secundarios          TEXT[]                 NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Regime
  regime_tributario          regime_tributario_enum NOT NULL,
  status                     status_empresa_enum    NOT NULL DEFAULT 'pendente',

  -- Endereço
  cep                        VARCHAR(8)             NOT NULL,
  logradouro                 VARCHAR(255)           NOT NULL,
  numero                     VARCHAR(20)            NOT NULL,
  complemento                VARCHAR(255),
  bairro                     VARCHAR(100)           NOT NULL,
  municipio                  VARCHAR(100)           NOT NULL,
  uf                         CHAR(2)                NOT NULL,

  -- Emissão
  ambiente                   ambiente_enum          NOT NULL DEFAULT 'homologacao',
  nfe_proximo_numero         INTEGER                NOT NULL DEFAULT 1,
  nfe_serie                  INTEGER                NOT NULL DEFAULT 1,
  nfse_proximo_numero        INTEGER                NOT NULL DEFAULT 1,
  nfse_serie                 INTEGER                NOT NULL DEFAULT 1,
  enviar_email_automatico    BOOLEAN                NOT NULL DEFAULT true,

  -- Certificado digital A1 (apenas metadados por enquanto — upload virá em outra fase).
  certificado_file_name      VARCHAR(255),
  certificado_issuer         VARCHAR(255),
  certificado_holder         VARCHAR(255),
  certificado_valid_until    DATE,

  -- Preenchido pelo use case de emissão de nota quando ele existir.
  ultima_emissao_em          TIMESTAMPTZ,

  created_at                 TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ            NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ,

  CONSTRAINT ck_empresas_cnpj_tamanho
    CHECK (char_length(cnpj) = 14),
  CONSTRAINT ck_empresas_cep_tamanho
    CHECK (char_length(cep) = 8),
  CONSTRAINT ck_empresas_uf_formato
    CHECK (uf ~ '^[A-Z]{2}$'),
  CONSTRAINT ck_empresas_nfe_proximo_numero
    CHECK (nfe_proximo_numero >= 1),
  CONSTRAINT ck_empresas_nfe_serie
    CHECK (nfe_serie >= 1),
  CONSTRAINT ck_empresas_nfse_proximo_numero
    CHECK (nfse_proximo_numero >= 1),
  CONSTRAINT ck_empresas_nfse_serie
    CHECK (nfse_serie >= 1),
  CONSTRAINT ck_empresas_certificado_consistente
    CHECK (
      (certificado_file_name IS NULL AND certificado_issuer IS NULL
       AND certificado_holder IS NULL AND certificado_valid_until IS NULL)
      OR
      (certificado_file_name IS NOT NULL AND certificado_issuer IS NOT NULL
       AND certificado_holder IS NOT NULL AND certificado_valid_until IS NOT NULL)
    )
);

-- Multi-tenancy: listagem padrão é sempre por owner, ignorando soft-deletadas.
CREATE INDEX idx_empresas_owner
  ON empresas (owner_user_id)
  WHERE deleted_at IS NULL;

-- Evita que o mesmo dono cadastre o mesmo CNPJ duas vezes; permite recriar após soft delete.
CREATE UNIQUE INDEX uq_empresas_owner_cnpj
  ON empresas (owner_user_id, cnpj)
  WHERE deleted_at IS NULL;

-- Suporte a busca por CNPJ na tela de listagem/filtros.
CREATE INDEX idx_empresas_cnpj
  ON empresas (cnpj)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON empresas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Down Migration

DROP TABLE IF EXISTS empresas;
DROP FUNCTION IF EXISTS set_updated_at();
DROP TYPE IF EXISTS ambiente_enum;
DROP TYPE IF EXISTS status_empresa_enum;
DROP TYPE IF EXISTS regime_tributario_enum;
