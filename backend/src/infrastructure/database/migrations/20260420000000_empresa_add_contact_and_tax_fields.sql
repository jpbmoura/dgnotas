-- Up Migration

-- Enum dos regimes tributários especiais de NFS-e municipal.
-- Usado pelo campo `regime_especial` da tabela empresas.
CREATE TYPE regime_especial_enum AS ENUM (
  'microempresa_municipal',
  'estimativa',
  'sociedade_profissionais',
  'cooperativa',
  'mei',
  'me_epp_simples'
);

ALTER TABLE empresas
  ADD COLUMN isento_ie          BOOLEAN              NOT NULL DEFAULT false,
  ADD COLUMN regime_especial    regime_especial_enum,
  ADD COLUMN email              VARCHAR(255),
  ADD COLUMN telefone           VARCHAR(11),
  ADD COLUMN emails_relatorios  TEXT[]               NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Consistência: se a empresa é isenta de IE, a coluna inscricao_estadual precisa ser NULL.
ALTER TABLE empresas
  ADD CONSTRAINT ck_empresas_ie_isento_consistente
    CHECK (
      (isento_ie = true  AND inscricao_estadual IS NULL)
      OR
      (isento_ie = false)
    );

-- Telefone armazenado como dígitos puros (DDD + número), 10 ou 11 caracteres.
ALTER TABLE empresas
  ADD CONSTRAINT ck_empresas_telefone_digitos
    CHECK (
      telefone IS NULL
      OR (telefone ~ '^[0-9]{10,11}$')
    );

-- E-mail com formato mínimo (regex simples — a validação forte fica no domínio).
ALTER TABLE empresas
  ADD CONSTRAINT ck_empresas_email_formato
    CHECK (
      email IS NULL
      OR (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    );


-- Down Migration

ALTER TABLE empresas
  DROP CONSTRAINT IF EXISTS ck_empresas_email_formato,
  DROP CONSTRAINT IF EXISTS ck_empresas_telefone_digitos,
  DROP CONSTRAINT IF EXISTS ck_empresas_ie_isento_consistente,
  DROP COLUMN IF EXISTS emails_relatorios,
  DROP COLUMN IF EXISTS telefone,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS regime_especial,
  DROP COLUMN IF EXISTS isento_ie;

DROP TYPE IF EXISTS regime_especial_enum;
