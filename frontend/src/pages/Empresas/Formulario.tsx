import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { FormField } from '../../components/FormField';
import { mockCnaes } from '../../mocks/cnaes';
import { ufs, municipios } from '../../mocks/ibge';
import { mockViaCEP } from '../../mocks/viacep';
import {
  createEmpresa,
  getEmpresa,
  updateEmpresa,
  type RegimeTributario,
  type UpsertEmpresaPayload,
} from '../../api/empresas';
import { useCompany } from '../../contexts/CompanyContext';
import { HttpError } from '../../lib/http';

// ---------- CNPJ helpers ----------

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let out = parts[0];
  if (parts[1]) out += '.' + parts[1];
  if (parts[2]) out += '.' + parts[2];
  if (parts[3]) out += '/' + parts[3];
  if (parts[4]) out += '-' + parts[4];
  return out;
}

function formatCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function isValidCNPJ(raw: string) {
  const d = onlyDigits(raw);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return calc(d.slice(0, 12), w1) === Number(d[12]) && calc(d.slice(0, 13), w2) === Number(d[13]);
}

// ---------- Types ----------

type Identificacao = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
};

type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
};

type RegimeValue = '' | 'simples' | 'mei' | 'presumido' | 'real';

type Regime = {
  regime: RegimeValue;
};

type Certificado = {
  fileName: string;
  password: string;
  issuer: string;
  holder: string;
  validUntil: string;
};

type Emissao = {
  ambiente: 'homologacao' | 'producao';
  nfeProximoNumero: number;
  nfeSerie: number;
  nfseProximoNumero: number;
  nfseSerie: number;
  enviarEmailAutomatico: boolean;
};

type FormData = {
  identificacao: Identificacao;
  endereco: Endereco;
  regime: Regime;
  certificado: Certificado;
  emissao: Emissao;
};

const emptyData: FormData = {
  identificacao: {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    cnaePrincipal: '',
    cnaesSecundarios: [],
  },
  endereco: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
  },
  regime: { regime: '' },
  certificado: {
    fileName: '',
    password: '',
    issuer: '',
    holder: '',
    validUntil: '',
  },
  emissao: {
    ambiente: 'homologacao',
    nfeProximoNumero: 1,
    nfeSerie: 1,
    nfseProximoNumero: 1,
    nfseSerie: 1,
    enviarEmailAutomatico: true,
  },
};

// ---------- Schemas ----------

const identificacaoSchema = z.object({
  cnpj: z.string().refine(isValidCNPJ, 'CNPJ não bate. Confere os números?'),
  razaoSocial: z.string().trim().min(1, 'Razão social é obrigatória.'),
  nomeFantasia: z.string().trim().min(1, 'Nome fantasia é obrigatório.'),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  cnaePrincipal: z.string().min(1, 'Escolhe o CNAE principal.'),
  cnaesSecundarios: z.array(z.string()),
});

const enderecoSchema = z.object({
  cep: z.string().refine((v) => onlyDigits(v).length === 8, 'CEP precisa de 8 dígitos.'),
  logradouro: z.string().trim().min(1, 'Preenche o logradouro.'),
  numero: z.string().trim().min(1, 'Número do endereço.'),
  complemento: z.string().optional(),
  bairro: z.string().trim().min(1, 'Preenche o bairro.'),
  municipio: z.string().trim().min(1, 'Escolhe o município.'),
  uf: z.string().length(2, 'UF com 2 letras.'),
});

const regimeSchema = z.object({
  regime: z.enum(['simples', 'mei', 'presumido', 'real'], {
    message: 'Escolhe um regime tributário.',
  }),
});

const certificadoSchema = z.object({
  fileName: z.string().min(1, 'Sobe o arquivo do certificado.'),
  password: z.string().min(1, 'Senha do certificado é obrigatória.'),
  issuer: z.string(),
  holder: z.string(),
  validUntil: z.string(),
});

const emissaoSchema = z.object({
  ambiente: z.enum(['homologacao', 'producao']),
  nfeProximoNumero: z.number().int().min(1, 'Deve ser 1 ou mais.'),
  nfeSerie: z.number().int().min(1, 'Deve ser 1 ou mais.'),
  nfseProximoNumero: z.number().int().min(1, 'Deve ser 1 ou mais.'),
  nfseSerie: z.number().int().min(1, 'Deve ser 1 ou mais.'),
  enviarEmailAutomatico: z.boolean(),
});

type Issues = Record<string, string>;

function collectIssues(error: z.ZodError): Issues {
  const out: Issues = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------- Page ----------

type TabKey = 'identificacao' | 'endereco' | 'regime' | 'certificado' | 'emissao';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'identificacao', label: 'Identificação' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'regime', label: 'Regime tributário' },
  { key: 'certificado', label: 'Certificado digital' },
  { key: 'emissao', label: 'Configurações de emissão' },
];

export function Formulario() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { refresh } = useCompany();
  const isEdit = Boolean(id);

  const [data, setData] = useState<FormData>(emptyData);
  const [activeTab, setActiveTab] = useState<TabKey>('identificacao');
  const [touched, setTouched] = useState<Record<TabKey, boolean>>({
    identificacao: false,
    endereco: false,
    regime: false,
    certificado: false,
    emissao: false,
  });
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load empresa em modo edição.
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    getEmpresa(id)
      .then((empresa) => {
        if (cancelled) return;
        setData({
          identificacao: {
            cnpj: formatCNPJ(empresa.cnpj),
            razaoSocial: empresa.razaoSocial,
            nomeFantasia: empresa.nomeFantasia,
            inscricaoEstadual: empresa.inscricaoEstadual ?? '',
            inscricaoMunicipal: empresa.inscricaoMunicipal ?? '',
            cnaePrincipal: empresa.cnaePrincipal,
            cnaesSecundarios: empresa.cnaesSecundarios,
          },
          endereco: {
            cep: formatCEP(empresa.endereco.cep),
            logradouro: empresa.endereco.logradouro,
            numero: empresa.endereco.numero,
            complemento: empresa.endereco.complemento ?? '',
            bairro: empresa.endereco.bairro,
            municipio: empresa.endereco.municipio,
            uf: empresa.endereco.uf,
          },
          regime: { regime: empresa.regimeTributario },
          certificado: empresa.certificado
            ? {
                fileName: empresa.certificado.fileName,
                // Senha do certificado não é persistida; placeholder só pra o schema de validação não reclamar.
                password: '••••••••',
                issuer: empresa.certificado.issuer,
                holder: empresa.certificado.holder,
                validUntil: empresa.certificado.validUntil,
              }
            : { fileName: '', password: '', issuer: '', holder: '', validUntil: '' },
          emissao: {
            ambiente: empresa.ambiente,
            nfeProximoNumero: empresa.numeracao.nfeProximoNumero,
            nfeSerie: empresa.numeracao.nfeSerie,
            nfseProximoNumero: empresa.numeracao.nfseProximoNumero,
            nfseSerie: empresa.numeracao.nfseSerie,
            enviarEmailAutomatico: empresa.enviarEmailAutomatico,
          },
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof HttpError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof HttpError ? err.message : 'Não foi possível carregar a empresa.',
          );
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const tabValidity = useMemo<Record<TabKey, boolean>>(
    () => ({
      identificacao: identificacaoSchema.safeParse(data.identificacao).success,
      endereco: enderecoSchema.safeParse(data.endereco).success,
      regime: regimeSchema.safeParse(data.regime).success,
      certificado: certificadoSchema.safeParse(data.certificado).success,
      emissao: emissaoSchema.safeParse(data.emissao).success,
    }),
    [data],
  );

  const tabIssues = useMemo<Record<TabKey, Issues>>(() => {
    const get = <T,>(schema: z.ZodType<T>, value: unknown) => {
      const r = schema.safeParse(value);
      return r.success ? {} : collectIssues(r.error);
    };
    return {
      identificacao: get(identificacaoSchema, data.identificacao),
      endereco: get(enderecoSchema, data.endereco),
      regime: get(regimeSchema, data.regime),
      certificado: get(certificadoSchema, data.certificado),
      emissao: get(emissaoSchema, data.emissao),
    };
  }, [data]);

  const allValid = Object.values(tabValidity).every(Boolean);

  function updateSection<K extends keyof FormData>(
    section: K,
    patch: Partial<FormData[K]>,
  ) {
    setData((d) => ({ ...d, [section]: { ...d[section], ...patch } }));
  }

  function selectTab(key: TabKey) {
    setTouched((t) => ({ ...t, [activeTab]: true }));
    setActiveTab(key);
  }

  function handleCancel() {
    navigate('/empresas');
  }

  async function handleSave() {
    setSaveAttempted(true);
    setTouched({
      identificacao: true,
      endereco: true,
      regime: true,
      certificado: true,
      emissao: true,
    });

    if (!allValid) {
      const firstInvalid = tabs.find((t) => !tabValidity[t.key]);
      if (firstInvalid) setActiveTab(firstInvalid.key);
      return;
    }

    const payload: UpsertEmpresaPayload = {
      cnpj: onlyDigits(data.identificacao.cnpj),
      razaoSocial: data.identificacao.razaoSocial.trim(),
      nomeFantasia: data.identificacao.nomeFantasia.trim(),
      inscricaoEstadual: data.identificacao.inscricaoEstadual.trim() || null,
      inscricaoMunicipal: data.identificacao.inscricaoMunicipal.trim() || null,
      cnaePrincipal: data.identificacao.cnaePrincipal,
      cnaesSecundarios: data.identificacao.cnaesSecundarios,
      regimeTributario: data.regime.regime as RegimeTributario,
      endereco: {
        cep: onlyDigits(data.endereco.cep),
        logradouro: data.endereco.logradouro.trim(),
        numero: data.endereco.numero.trim(),
        complemento: data.endereco.complemento.trim() || null,
        bairro: data.endereco.bairro.trim(),
        municipio: data.endereco.municipio.trim(),
        uf: data.endereco.uf.toUpperCase(),
      },
      ambiente: data.emissao.ambiente,
      numeracao: {
        nfeProximoNumero: data.emissao.nfeProximoNumero,
        nfeSerie: data.emissao.nfeSerie,
        nfseProximoNumero: data.emissao.nfseProximoNumero,
        nfseSerie: data.emissao.nfseSerie,
      },
      enviarEmailAutomatico: data.emissao.enviarEmailAutomatico,
      certificado: data.certificado.fileName
        ? {
            fileName: data.certificado.fileName,
            issuer: data.certificado.issuer,
            holder: data.certificado.holder,
            validUntil: data.certificado.validUntil,
          }
        : null,
    };

    setSaving(true);
    setSubmitError(null);
    try {
      if (isEdit && id) {
        await updateEmpresa(id, payload);
      } else {
        await createEmpresa(payload);
      }
      await refresh();
      navigate('/empresas');
    } catch (err) {
      setSubmitError(
        err instanceof HttpError
          ? err.message
          : 'Não foi possível salvar a empresa. Tenta de novo?',
      );
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (notFound) {
    return <NotFoundState />;
  }

  if (loadError) {
    return <LoadErrorState message={loadError} />;
  }

  const titulo = isEdit
    ? `Editar ${data.identificacao.nomeFantasia || 'empresa'}`
    : 'Nova empresa';

  return (
    <div className="pb-24">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.02em]">
          <li>
            <Link
              to="/empresas"
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              Empresas
            </Link>
          </li>
          <li aria-hidden className="text-[var(--ink-muted)]">/</li>
          <li className="text-[var(--ink)]">
            {isEdit
              ? data.identificacao.nomeFantasia || 'Editar'
              : 'Nova empresa'}
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
          {titulo}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
          Preencha as 5 abas abaixo. A gente salva tudo junto quando você
          clicar em <em className="font-serif italic">Salvar</em>.
        </p>
      </header>

      <TabStrip
        activeTab={activeTab}
        onSelect={selectTab}
        validity={tabValidity}
        touched={touched}
        saveAttempted={saveAttempted}
      />

      <section className="card mt-6 p-6 md:p-8">
        {activeTab === 'identificacao' && (
          <IdentificacaoTab
            data={data.identificacao}
            issues={touched.identificacao || saveAttempted ? tabIssues.identificacao : {}}
            onChange={(patch) => updateSection('identificacao', patch)}
          />
        )}
        {activeTab === 'endereco' && (
          <EnderecoTab
            data={data.endereco}
            issues={touched.endereco || saveAttempted ? tabIssues.endereco : {}}
            onChange={(patch) => updateSection('endereco', patch)}
          />
        )}
        {activeTab === 'regime' && (
          <RegimeTab
            data={data.regime}
            issues={touched.regime || saveAttempted ? tabIssues.regime : {}}
            onChange={(patch) => updateSection('regime', patch)}
          />
        )}
        {activeTab === 'certificado' && (
          <CertificadoTab
            data={data.certificado}
            issues={touched.certificado || saveAttempted ? tabIssues.certificado : {}}
            onChange={(patch) => updateSection('certificado', patch)}
          />
        )}
        {activeTab === 'emissao' && (
          <EmissaoTab
            data={data.emissao}
            issues={touched.emissao || saveAttempted ? tabIssues.emissao : {}}
            onChange={(patch) => updateSection('emissao', patch)}
          />
        )}
      </section>

      {submitError && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border p-4 text-sm"
          style={{
            background: 'var(--color-err-bg, #FEE2E2)',
            borderColor: 'var(--color-err-fg, #DC2626)',
            color: 'var(--color-err-fg, #DC2626)',
          }}
        >
          {submitError}
        </div>
      )}

      <footer className="sticky bottom-6 mt-6 z-20">
        <div className="card p-4 md:p-5 flex items-center justify-between gap-3 shadow-lg">
          <span className="text-xs text-[var(--ink-muted)] hidden sm:block">
            {allValid
              ? 'Tudo pronto pra salvar.'
              : 'Preenche as abas com ponto em laranja antes de salvar.'}
          </span>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary h-12 px-6 rounded-lg font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (saveAttempted && !allValid)}
              className="btn-primary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar empresa'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Formulario;

// ---------- Tab strip ----------

function TabStrip({
  activeTab,
  onSelect,
  validity,
  touched,
  saveAttempted,
}: {
  activeTab: TabKey;
  onSelect: (k: TabKey) => void;
  validity: Record<TabKey, boolean>;
  touched: Record<TabKey, boolean>;
  saveAttempted: boolean;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-[var(--line)]"
      role="tablist"
    >
      {tabs.map((tab, i) => {
        const isActive = activeTab === tab.key;
        const complete = validity[tab.key];
        const showError =
          !complete && (touched[tab.key] || saveAttempted);
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              isActive
                ? 'text-[var(--ink)] border-[var(--ink)]'
                : 'text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              0{i + 1}
            </span>
            <span>{tab.label}</span>
            <TabDot complete={complete} error={showError} />
          </button>
        );
      })}
    </div>
  );
}

function TabDot({ complete, error }: { complete: boolean; error: boolean }) {
  if (error) {
    return (
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--color-err-fg, #DC2626)' }}
      />
    );
  }
  if (complete) {
    return (
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
      />
    );
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-[var(--line)]" />;
}

// ---------- Tab 1: Identificação ----------

function IdentificacaoTab({
  data,
  issues,
  onChange,
}: {
  data: Identificacao;
  issues: Issues;
  onChange: (patch: Partial<Identificacao>) => void;
}) {
  const [lookingUp, setLookingUp] = useState(false);
  const cnpjValid = isValidCNPJ(data.cnpj);

  function buscarNaReceita() {
    if (!cnpjValid) return;
    setLookingUp(true);
    setTimeout(() => {
      onChange({
        razaoSocial: data.razaoSocial || 'Empresa Exemplo LTDA',
        nomeFantasia: data.nomeFantasia || 'Exemplo',
      });
      setLookingUp(false);
    }, 700);
  }

  return (
    <div>
      <TabHeading
        title={
          <>
            Quem é a empresa{' '}
            <em className="font-serif italic">emitindo</em>?
          </>
        }
        subtitle="CNPJ, razão social e CNAEs que constam no cartão da Receita."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <FormField
              label="CNPJ"
              name="cnpj"
              placeholder="00.000.000/0000-00"
              value={data.cnpj}
              onChange={(e) => onChange({ cnpj: formatCNPJ(e.target.value) })}
              inputMode="numeric"
              maxLength={18}
              error={issues.cnpj}
              required
            />
            <button
              type="button"
              onClick={buscarNaReceita}
              disabled={!cnpjValid || lookingUp}
              className="btn-secondary h-12 px-5 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {lookingUp ? 'Buscando...' : 'Buscar na Receita'}
            </button>
          </div>
        </div>

        <FormField
          label="Razão social"
          name="razaoSocial"
          placeholder="Empresa Exemplo LTDA"
          value={data.razaoSocial}
          onChange={(e) => onChange({ razaoSocial: e.target.value })}
          error={issues.razaoSocial}
          required
        />
        <FormField
          label="Nome fantasia"
          name="nomeFantasia"
          placeholder="Exemplo"
          value={data.nomeFantasia}
          onChange={(e) => onChange({ nomeFantasia: e.target.value })}
          error={issues.nomeFantasia}
          required
        />
        <FormField
          label="Inscrição estadual"
          name="ie"
          placeholder="Opcional"
          value={data.inscricaoEstadual}
          onChange={(e) => onChange({ inscricaoEstadual: e.target.value })}
          hint="Deixa em branco se isenta."
        />
        <FormField
          label="Inscrição municipal"
          name="im"
          placeholder="Opcional"
          value={data.inscricaoMunicipal}
          onChange={(e) => onChange({ inscricaoMunicipal: e.target.value })}
          hint="Pra NFS-e a maioria das prefeituras pede."
        />

        <div className="md:col-span-2">
          <SearchSelect
            label="CNAE principal"
            placeholder="Buscar por código ou atividade"
            value={data.cnaePrincipal}
            onChange={(v) => onChange({ cnaePrincipal: v })}
            options={mockCnaes.map((c) => ({
              value: c.codigo,
              label: c.codigo,
              description: c.descricao,
            }))}
            error={issues.cnaePrincipal}
            required
          />
        </div>

        <div className="md:col-span-2">
          <MultiSelect
            label="CNAEs secundários"
            placeholder="Adicionar CNAE secundário"
            values={data.cnaesSecundarios}
            onChange={(vs) => onChange({ cnaesSecundarios: vs })}
            options={mockCnaes.map((c) => ({
              value: c.codigo,
              label: c.codigo,
              description: c.descricao,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Tab 2: Endereço ----------

function EnderecoTab({
  data,
  issues,
  onChange,
}: {
  data: Endereco;
  issues: Issues;
  onChange: (patch: Partial<Endereco>) => void;
}) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMiss, setCepMiss] = useState(false);
  const lastLookup = useRef<string>('');

  useEffect(() => {
    const digits = onlyDigits(data.cep);
    if (digits.length !== 8) {
      setCepMiss(false);
      return;
    }
    if (lastLookup.current === digits) return;
    lastLookup.current = digits;
    setCepLoading(true);
    const timer = setTimeout(() => {
      const hit = mockViaCEP(data.cep);
      setCepLoading(false);
      if (!hit) {
        setCepMiss(true);
        return;
      }
      setCepMiss(false);
      onChange({
        logradouro: data.logradouro || hit.logradouro,
        bairro: data.bairro || hit.bairro,
        municipio: data.municipio || hit.municipio,
        uf: data.uf || hit.uf,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.cep]);

  return (
    <div>
      <TabHeading
        title={<>Endereço da <em className="font-serif italic">sede</em></>}
        subtitle="Informa o CEP e a gente tenta preencher o resto. Edita se estiver fora."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-6 gap-5">
        <div className="md:col-span-2">
          <FormField
            label="CEP"
            name="cep"
            placeholder="00000-000"
            value={data.cep}
            onChange={(e) => onChange({ cep: formatCEP(e.target.value) })}
            inputMode="numeric"
            maxLength={9}
            error={issues.cep}
            hint={
              cepLoading
                ? 'Buscando CEP...'
                : cepMiss
                ? 'CEP não encontrado. Preenche os campos à mão.'
                : undefined
            }
            required
          />
        </div>

        <div className="md:col-span-4">
          <FormField
            label="Logradouro"
            name="logradouro"
            placeholder="Av. Paulista"
            value={data.logradouro}
            onChange={(e) => onChange({ logradouro: e.target.value })}
            error={issues.logradouro}
            required
          />
        </div>

        <div className="md:col-span-1">
          <FormField
            label="Número"
            name="numero"
            placeholder="1000"
            value={data.numero}
            onChange={(e) => onChange({ numero: e.target.value })}
            error={issues.numero}
            required
          />
        </div>

        <div className="md:col-span-2">
          <FormField
            label="Complemento"
            name="complemento"
            placeholder="Sala 42"
            value={data.complemento}
            onChange={(e) => onChange({ complemento: e.target.value })}
          />
        </div>

        <div className="md:col-span-3">
          <FormField
            label="Bairro"
            name="bairro"
            placeholder="Bela Vista"
            value={data.bairro}
            onChange={(e) => onChange({ bairro: e.target.value })}
            error={issues.bairro}
            required
          />
        </div>

        <div className="md:col-span-4">
          <SelectField
            label="Município"
            name="municipio"
            value={data.municipio}
            onChange={(e) => onChange({ municipio: e.target.value })}
            error={issues.municipio}
          >
            <option value="">Escolhe o município</option>
            {[...new Set([data.municipio, ...municipios].filter(Boolean))]
              .sort((a, b) => a.localeCompare(b, 'pt-BR'))
              .map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </SelectField>
        </div>

        <div className="md:col-span-2">
          <SelectField
            label="UF"
            name="uf"
            value={data.uf}
            onChange={(e) => onChange({ uf: e.target.value.toUpperCase() })}
            error={issues.uf}
          >
            <option value="">—</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </div>
  );
}

// ---------- Tab 3: Regime ----------

const regimeOptions: {
  value: Exclude<RegimeValue, ''>;
  label: string;
  hint: string;
}[] = [
  {
    value: 'simples',
    label: 'Simples Nacional',
    hint: 'Uma guia só (DAS) por mês. Alíquotas variam por faixa.',
  },
  {
    value: 'mei',
    label: 'MEI',
    hint: 'Microempreendedor Individual. Faturamento anual até R$ 81 mil.',
  },
  {
    value: 'presumido',
    label: 'Lucro Presumido',
    hint: 'Receita Federal presume uma margem fixa. Bom até R$ 78 mi/ano.',
  },
  {
    value: 'real',
    label: 'Lucro Real',
    hint: 'Imposto sobre o lucro apurado. Obrigatório acima de R$ 78 mi/ano.',
  },
];

function RegimeTab({
  data,
  issues,
  onChange,
}: {
  data: Regime;
  issues: Issues;
  onChange: (patch: Partial<Regime>) => void;
}) {
  const regimeInfo: Record<Exclude<RegimeValue, ''>, string> = {
    simples: 'A gente calcula ISS/ICMS/PIS/Cofins/CSLL/IRPJ juntos no DAS.',
    mei: 'CRT 4 é obrigatório em toda nota. ISS é fixo no DAS-SIMEI.',
    presumido: 'Retenções de PIS/Cofins aparecem nas notas conforme o caso.',
    real: 'Cálculo de PIS/Cofins não cumulativo. A gente segue o CST configurado.',
  };

  return (
    <div>
      <TabHeading
        title={<>Como a empresa <em className="font-serif italic">tributa</em>?</>}
        subtitle="Isso define os campos que a gente preenche em cada nota."
      />

      <fieldset className="mt-8 space-y-3">
        <legend className="sr-only">Regime tributário</legend>
        {regimeOptions.map((opt) => {
          const selected = data.regime === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-colors ${
                selected
                  ? 'border-[var(--ink)] bg-[var(--line-soft)]/60'
                  : 'border-[var(--line)] bg-white hover:border-[var(--ink)]'
              }`}
            >
              <input
                type="radio"
                name="regime"
                value={opt.value}
                checked={selected}
                onChange={() => onChange({ regime: opt.value })}
                className="mt-1 w-4 h-4 accent-[var(--ink)]"
              />
              <div>
                <div className="text-sm font-semibold text-[var(--ink)]">
                  {opt.label}
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
                  {opt.hint}
                </p>
              </div>
            </label>
          );
        })}
      </fieldset>

      {issues.regime && (
        <p className="mt-3 text-xs text-[var(--warn)]">{issues.regime}</p>
      )}

      {data.regime && (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--blue-soft)] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--blue)]">
            O que muda
          </div>
          <p className="mt-2 text-sm text-[var(--ink)] leading-relaxed">
            {regimeInfo[data.regime as Exclude<RegimeValue, ''>]}
          </p>
        </div>
      )}

      {data.regime === 'mei' && (
        <div
          className="mt-4 rounded-2xl p-5 border"
          style={{
            background: 'var(--color-warn-bg, #FEF3C7)',
            borderColor: 'var(--color-warn-fg, #92400E)',
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-[0.02em]"
            style={{ color: 'var(--color-warn-fg, #92400E)' }}
          >
            Atenção — MEI
          </div>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: 'var(--color-warn-fg, #92400E)' }}
          >
            CRT 4 é obrigatório em toda nota emitida por MEI. A gente preenche
            automático — mas fica de olho se sua prefeitura tiver exceção.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Tab 4: Certificado ----------

function CertificadoTab({
  data,
  issues,
  onChange,
}: {
  data: Certificado;
  issues: Issues;
  onChange: (patch: Partial<Certificado>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function acceptFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pfx') && !name.endsWith('.p12')) return;
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 11);
    onChange({
      fileName: file.name,
      issuer: 'AC Certisign',
      holder: 'Titular do certificado',
      validUntil: validUntil.toISOString().slice(0, 10),
    });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  }

  const hasFile = data.fileName.length > 0;
  const diasAteExpirar = data.validUntil
    ? Math.max(
        0,
        Math.ceil(
          (new Date(data.validUntil + 'T00:00:00').getTime() - Date.now()) /
            86400000,
        ),
      )
    : null;

  return (
    <div>
      <TabHeading
        title={<>Sobe o certificado <em className="font-serif italic">A1</em></>}
        subtitle="Arquivo .pfx ou .p12 com senha. Ele é usado pra assinar toda nota."
      />

      <div className="mt-8 space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Subir certificado digital"
          className={`rounded-2xl border border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[var(--ink)] bg-[var(--line-soft)]'
              : 'border-[var(--line)] bg-white hover:border-[var(--ink)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pfx,.p12"
            onChange={handlePick}
            className="hidden"
          />
          {!hasFile ? (
            <>
              <div className="mx-auto w-10 h-10 rounded-full bg-[var(--line-soft)] flex items-center justify-center text-[var(--ink-muted)]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path
                    d="M9 12V3m0 0L5 7m4-4l4 4M3 13v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm text-[var(--ink)] font-medium">
                Arrasta o arquivo aqui ou clica pra escolher
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Aceita .pfx e .p12 — até 5 MB
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 8.5l3 3 7-8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--ink)] truncate">
                    {data.fileName}
                  </div>
                  <div className="text-xs text-[var(--ink-muted)]">
                    Arraste outro arquivo aqui pra substituir.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
              >
                Substituir certificado
              </button>
            </div>
          )}
        </div>

        {issues.fileName && !hasFile && (
          <p className="text-xs text-[var(--warn)]">{issues.fileName}</p>
        )}

        <FormField
          label="Senha do certificado"
          name="certPassword"
          type="password"
          autoComplete="off"
          placeholder="A mesma que você usa na e-CAC"
          value={data.password}
          onChange={(e) => onChange({ password: e.target.value })}
          error={issues.password}
          required
        />

        {hasFile && (
          <div className="card p-5 !rounded-2xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
                Detalhes do certificado
              </div>
              {diasAteExpirar !== null && (
                <CertValidityBadge dias={diasAteExpirar} />
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow label="Emissor" value={data.issuer} />
              <InfoRow label="Titular" value={data.holder} />
              <InfoRow
                label="Válido até"
                value={
                  data.validUntil
                    ? new Date(data.validUntil + 'T00:00:00').toLocaleDateString('pt-BR')
                    : '—'
                }
              />
              <InfoRow
                label="Expira em"
                value={
                  diasAteExpirar !== null
                    ? `${diasAteExpirar} ${diasAteExpirar === 1 ? 'dia' : 'dias'}`
                    : '—'
                }
              />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function CertValidityBadge({ dias }: { dias: number }) {
  if (dias <= 30) {
    return (
      <span
        className="badge"
        style={{
          background: 'var(--color-warn-bg, #FEF3C7)',
          color: 'var(--color-warn-fg, #92400E)',
        }}
      >
        Expira em breve
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
      Válido
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[var(--ink)] break-words">
        {value || '—'}
      </dd>
    </div>
  );
}

// ---------- Tab 5: Emissão ----------

function EmissaoTab({
  data,
  issues,
  onChange,
}: {
  data: Emissao;
  issues: Issues;
  onChange: (patch: Partial<Emissao>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>Como essas notas vão <em className="font-serif italic">nascer</em></>}
        subtitle="Ambiente, numeração inicial e notificações. Dá pra mexer depois."
      />

      <div className="mt-8 space-y-8">
        <div>
          <SectionLabel>Ambiente</SectionLabel>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <AmbienteOption
              value="homologacao"
              selected={data.ambiente === 'homologacao'}
              onChange={() => onChange({ ambiente: 'homologacao' })}
              label="Homologação"
              hint="Ambiente de teste. As notas não valem fiscalmente, mas servem pra validar configuração."
            />
            <AmbienteOption
              value="producao"
              selected={data.ambiente === 'producao'}
              onChange={() => onChange({ ambiente: 'producao' })}
              label="Produção"
              hint="Ambiente real. Toda nota emitida daqui vai pro Sefaz e vira fiscal."
            />
          </div>
        </div>

        <div>
          <SectionLabel>Numeração de NF-e</SectionLabel>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Próximo número"
              name="nfeProximoNumero"
              type="number"
              min={1}
              value={data.nfeProximoNumero}
              onChange={(e) =>
                onChange({ nfeProximoNumero: Number(e.target.value) || 0 })
              }
              error={issues.nfeProximoNumero}
            />
            <FormField
              label="Série"
              name="nfeSerie"
              type="number"
              min={1}
              value={data.nfeSerie}
              onChange={(e) =>
                onChange({ nfeSerie: Number(e.target.value) || 0 })
              }
              error={issues.nfeSerie}
            />
          </div>
        </div>

        <div>
          <SectionLabel>Numeração de NFS-e</SectionLabel>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              label="Próximo número"
              name="nfseProximoNumero"
              type="number"
              min={1}
              value={data.nfseProximoNumero}
              onChange={(e) =>
                onChange({ nfseProximoNumero: Number(e.target.value) || 0 })
              }
              error={issues.nfseProximoNumero}
            />
            <FormField
              label="Série"
              name="nfseSerie"
              type="number"
              min={1}
              value={data.nfseSerie}
              onChange={(e) =>
                onChange({ nfseSerie: Number(e.target.value) || 0 })
              }
              error={issues.nfseSerie}
            />
          </div>
        </div>

        <Toggle
          label="Enviar nota por e-mail automaticamente"
          hint="Assim que a nota é emitida, a gente manda o PDF + XML pro tomador."
          checked={data.enviarEmailAutomatico}
          onChange={(v) => onChange({ enviarEmailAutomatico: v })}
        />
      </div>
    </div>
  );
}

function AmbienteOption({
  value,
  selected,
  onChange,
  label,
  hint,
}: {
  value: string;
  selected: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
        selected
          ? 'border-[var(--ink)] bg-[var(--line-soft)]/60'
          : 'border-[var(--line)] bg-white hover:border-[var(--ink)]'
      }`}
    >
      <input
        type="radio"
        name="ambiente"
        value={value}
        checked={selected}
        onChange={onChange}
        className="mt-0.5 w-4 h-4 accent-[var(--ink)]"
      />
      <div>
        <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
        <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
          {hint}
        </p>
      </div>
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-[var(--line)] bg-white cursor-pointer">
      <div>
        <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
        {hint && (
          <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
            {hint}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex-none w-10 h-6 rounded-full relative transition-colors ${
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// ---------- Primitives ----------

function TabHeading({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold text-[var(--ink)] leading-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
      {children}
    </h3>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  error,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </span>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`mt-2 block w-full h-12 px-4 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] transition-colors focus:outline-none appearance-none ${
          error
            ? 'border-[var(--warn)] focus:border-[var(--warn)]'
            : 'border-[var(--line)] focus:border-[var(--ink)]'
        }`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%23425466' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 16px center',
          paddingRight: '40px',
        }}
      >
        {children}
      </select>
      {error && (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      )}
    </label>
  );
}

// ---------- SearchSelect / MultiSelect ----------

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <label className="block" ref={rootRef}>
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
        {required && <span className="text-[var(--warn)]"> *</span>}
      </span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex items-center justify-between gap-3 w-full h-12 px-4 rounded-lg bg-white border text-left transition-colors ${
            error
              ? 'border-[var(--warn)]'
              : 'border-[var(--line)] hover:border-[var(--ink)]'
          }`}
        >
          {selected ? (
            <span className="min-w-0 flex items-center gap-2">
              <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink)]">
                {selected.label}
              </span>
              {selected.description && (
                <span className="text-sm text-[var(--ink-muted)] truncate">
                  — {selected.description}
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm text-[var(--ink-muted)]">
              {placeholder ?? 'Escolha uma opção'}
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`flex-none text-[var(--ink-muted)] transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          >
            <path
              d="M2 4.5L6 8.5L10 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-10">
            <div className="p-3 border-b border-[var(--line)]">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar"
                className="w-full h-9 px-3 rounded-lg bg-[var(--line-soft)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ink)]"
              />
            </div>
            <ul className="max-h-[240px] overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
                  Nada bate com "{query}".
                </li>
              )}
              {filtered.map((opt) => {
                const isSel = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--line-soft)] transition-colors ${
                        isSel ? 'bg-[var(--accent-soft)]' : ''
                      }`}
                    >
                      <span
                        className={`font-mono text-xs tracking-[0.02em] flex-none ${
                          isSel ? 'text-[var(--accent-deep)]' : 'text-[var(--ink)]'
                        }`}
                      >
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="text-sm text-[var(--ink-muted)] truncate">
                          {opt.description}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      )}
    </label>
  );
}

function MultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (vs: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedOptions = options.filter((o) => values.includes(o.value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  function toggle(val: string) {
    if (values.includes(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  }

  return (
    <div ref={rootRef}>
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </span>
      <div className="relative mt-2">
        <div
          className={`rounded-lg bg-white border border-[var(--line)] p-2 min-h-12 flex flex-wrap items-center gap-1.5 ${
            open ? 'border-[var(--ink)]' : 'hover:border-[var(--ink)]'
          } transition-colors`}
        >
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-pill bg-[var(--line-soft)] text-[var(--ink)] text-xs font-mono tracking-[0.02em]"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                aria-label={`Remover ${opt.label}`}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-white"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-8 px-3 rounded-pill text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            {placeholder ?? '+ Adicionar'}
          </button>
        </div>

        {open && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-10">
            <div className="p-3 border-b border-[var(--line)]">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar"
                className="w-full h-9 px-3 rounded-lg bg-[var(--line-soft)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ink)]"
              />
            </div>
            <ul className="max-h-[240px] overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
                  Nada bate com "{query}".
                </li>
              )}
              {filtered.map((opt) => {
                const isSel = values.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--line-soft)] transition-colors`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-none ${
                          isSel
                            ? 'bg-[var(--ink)] border-[var(--ink)] text-white'
                            : 'border-[var(--line)]'
                        }`}
                      >
                        {isSel && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                            <path
                              d="M2 5.5l2 2 4-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink)] flex-none">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="text-sm text-[var(--ink-muted)] truncate">
                          {opt.description}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- States ----------

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 rounded-full bg-[var(--line-soft)] animate-pulse" />
      <div className="h-10 w-64 rounded-full bg-[var(--line-soft)] animate-pulse" />
      <div className="card p-8 space-y-4">
        <div className="h-4 w-40 rounded-full bg-[var(--line-soft)] animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-[var(--line-soft)] animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-[var(--line-soft)] animate-pulse" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="card p-12 text-center">
      <h2 className="text-2xl font-semibold text-[var(--ink)]">
        Empresa não encontrada.
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        O link pode estar quebrado ou a empresa foi removida.
      </p>
      <Link
        to="/empresas"
        className="mt-6 btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Voltar pra lista
      </Link>
    </div>
  );
}

function LoadErrorState({ message }: { message: string }) {
  return (
    <div
      className="card p-10 text-center"
      style={{
        background: 'var(--color-err-bg, #FEE2E2)',
        borderColor: 'var(--color-err-fg, #DC2626)',
      }}
    >
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--color-err-fg, #DC2626)' }}
      >
        Não foi possível carregar a empresa.
      </h2>
      <p
        className="mt-2 text-sm"
        style={{ color: 'var(--color-err-fg, #DC2626)', opacity: 0.85 }}
      >
        {message}
      </p>
      <Link
        to="/empresas"
        className="mt-6 btn-secondary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Voltar pra lista
      </Link>
    </div>
  );
}
