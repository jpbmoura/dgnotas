import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
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
  type Ambiente,
  type CertificadoDigital,
  type NumeracaoNotas,
  type RegimeEspecial,
  type RegimeTributario,
  type UpsertEmpresaPayload,
} from '../../api/empresas';
import { useCompany } from '../../contexts/CompanyContext';
import { HttpError } from '../../lib/http';
import { toast } from '../../components/ui/sonner';

// ---------- Máscaras ----------

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

function formatTelefone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
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

// ---------- Tipos ----------

type RegimeValue = '' | 'simples' | 'mei' | 'presumido' | 'real';

type RegimeEspecialValue =
  | ''
  | 'microempresa_municipal'
  | 'estimativa'
  | 'sociedade_profissionais'
  | 'cooperativa'
  | 'mei'
  | 'me_epp_simples';

type Dados = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  isentoIE: boolean;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regime: RegimeValue;
  regimeEspecial: RegimeEspecialValue;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  email: string;
  telefone: string;
  enviarEmailAutomatico: boolean;
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

type Emails = {
  relatorios: string;
};

type FormData = {
  dados: Dados;
  endereco: Endereco;
  emails: Emails;
};

// Campos que o backend ainda exige mas a tela não expõe.
// Preservamos em modo edição e usamos defaults em modo criação.
type HiddenFiscal = {
  ambiente: Ambiente;
  numeracao: NumeracaoNotas;
  certificado: CertificadoDigital | null;
};

const emptyData: FormData = {
  dados: {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    isentoIE: false,
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    regime: '',
    regimeEspecial: '',
    cnaePrincipal: '',
    cnaesSecundarios: [],
    email: '',
    telefone: '',
    enviarEmailAutomatico: true,
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
  emails: {
    relatorios: '',
  },
};

const emptyHidden: HiddenFiscal = {
  ambiente: 'homologacao',
  numeracao: {
    nfeProximoNumero: 1,
    nfeSerie: 1,
    nfseProximoNumero: 1,
    nfseSerie: 1,
  },
  certificado: null,
};

// ---------- Schemas ----------

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dadosSchema = z
  .object({
    cnpj: z.string().refine(isValidCNPJ, 'CNPJ não bate. Confere os números?'),
    razaoSocial: z.string().trim().min(1, 'Razão social é obrigatória.'),
    nomeFantasia: z.string().trim().min(1, 'Nome fantasia é obrigatório.'),
    isentoIE: z.boolean(),
    inscricaoEstadual: z.string(),
    inscricaoMunicipal: z.string().optional(),
    regime: z.enum(['simples', 'mei', 'presumido', 'real'], {
      message: 'Escolhe um regime tributário.',
    }),
    regimeEspecial: z
      .enum([
        '',
        'microempresa_municipal',
        'estimativa',
        'sociedade_profissionais',
        'cooperativa',
        'mei',
        'me_epp_simples',
      ])
      .optional(),
    cnaePrincipal: z.string().min(1, 'Escolhe o CNAE principal.'),
    cnaesSecundarios: z.array(z.string()),
    email: z
      .string()
      .trim()
      .refine((v) => v === '' || emailRegex.test(v), 'E-mail inválido.'),
    telefone: z
      .string()
      .refine(
        (v) => v === '' || [10, 11].includes(onlyDigits(v).length),
        'Telefone com DDD (10 ou 11 dígitos).',
      ),
    enviarEmailAutomatico: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (!val.isentoIE && val.inscricaoEstadual.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['inscricaoEstadual'],
        message: 'Preenche a IE ou marca como isento.',
      });
    }
  });

const enderecoSchema = z.object({
  cep: z.string().refine((v) => onlyDigits(v).length === 8, 'CEP precisa de 8 dígitos.'),
  logradouro: z.string().trim().min(1, 'Preenche o logradouro.'),
  numero: z.string().trim().min(1, 'Número do endereço.'),
  complemento: z.string().optional(),
  bairro: z.string().trim().min(1, 'Preenche o bairro.'),
  municipio: z.string().trim().min(1, 'Escolhe a cidade.'),
  uf: z.string().length(2, 'Estado (2 letras).'),
});

const emailsSchema = z.object({
  relatorios: z.string().refine((v) => {
    const trimmed = v.trim();
    if (trimmed === '') return true;
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .every((s) => s === '' || emailRegex.test(s));
  }, 'Algum e-mail está fora do formato. Separa por vírgula.'),
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

// ---------- Regimes ----------

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

const regimeEspecialOptions: { value: RegimeEspecialValue; label: string }[] = [
  { value: '', label: 'Nenhum' },
  { value: 'microempresa_municipal', label: 'Microempresa municipal' },
  { value: 'estimativa', label: 'Estimativa' },
  { value: 'sociedade_profissionais', label: 'Sociedade de profissionais' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'mei', label: 'Microempresário Individual (MEI)' },
  { value: 'me_epp_simples', label: 'ME/EPP do Simples Nacional' },
];

// ---------- Page ----------

type TabKey = 'dados' | 'endereco' | 'emails';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dados', label: 'Dados da empresa' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'emails', label: 'E-mails para relatórios' },
];

export function Formulario() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { refresh } = useCompany();
  const isEdit = Boolean(id);

  const [data, setData] = useState<FormData>(emptyData);
  const [hidden, setHidden] = useState<HiddenFiscal>(emptyHidden);
  const [activeTab, setActiveTab] = useState<TabKey>('dados');
  const [touched, setTouched] = useState<Record<TabKey, boolean>>({
    dados: false,
    endereco: false,
    emails: false,
  });
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega empresa no modo edição.
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
          dados: {
            cnpj: formatCNPJ(empresa.cnpj),
            razaoSocial: empresa.razaoSocial,
            nomeFantasia: empresa.nomeFantasia,
            isentoIE: empresa.isentoIE,
            inscricaoEstadual: empresa.inscricaoEstadual ?? '',
            inscricaoMunicipal: empresa.inscricaoMunicipal ?? '',
            regime: empresa.regimeTributario,
            regimeEspecial: empresa.regimeEspecial ?? '',
            cnaePrincipal: empresa.cnaePrincipal,
            cnaesSecundarios: empresa.cnaesSecundarios,
            email: empresa.email ?? '',
            telefone: empresa.telefone ? formatTelefone(empresa.telefone) : '',
            enviarEmailAutomatico: empresa.enviarEmailAutomatico,
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
          emails: { relatorios: empresa.emailsRelatorios.join(', ') },
        });
        setHidden({
          ambiente: empresa.ambiente,
          numeracao: empresa.numeracao,
          certificado: empresa.certificado,
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
      dados: dadosSchema.safeParse(data.dados).success,
      endereco: enderecoSchema.safeParse(data.endereco).success,
      emails: emailsSchema.safeParse(data.emails).success,
    }),
    [data],
  );

  const tabIssues = useMemo<Record<TabKey, Issues>>(() => {
    const get = <T,>(schema: z.ZodType<T>, value: unknown) => {
      const r = schema.safeParse(value);
      return r.success ? {} : collectIssues(r.error);
    };
    return {
      dados: get(dadosSchema, data.dados),
      endereco: get(enderecoSchema, data.endereco),
      emails: get(emailsSchema, data.emails),
    };
  }, [data]);

  const allValid = Object.values(tabValidity).every(Boolean);

  function updateSection<K extends keyof FormData>(section: K, patch: Partial<FormData[K]>) {
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
    setTouched({ dados: true, endereco: true, emails: true });

    if (!allValid) {
      const firstInvalid = tabs.find((t) => !tabValidity[t.key]);
      if (firstInvalid) setActiveTab(firstInvalid.key);
      toast.error('Preenche as abas com ponto em laranja antes de salvar.');
      return;
    }

    const emailsRelatoriosList = data.emails.relatorios
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    const payload: UpsertEmpresaPayload = {
      cnpj: onlyDigits(data.dados.cnpj),
      razaoSocial: data.dados.razaoSocial.trim(),
      nomeFantasia: data.dados.nomeFantasia.trim(),
      isentoIE: data.dados.isentoIE,
      inscricaoEstadual: data.dados.isentoIE
        ? null
        : data.dados.inscricaoEstadual.trim() || null,
      inscricaoMunicipal: data.dados.inscricaoMunicipal.trim() || null,
      cnaePrincipal: data.dados.cnaePrincipal,
      cnaesSecundarios: data.dados.cnaesSecundarios,
      regimeTributario: data.dados.regime as RegimeTributario,
      regimeEspecial: data.dados.regimeEspecial === ''
        ? null
        : (data.dados.regimeEspecial as RegimeEspecial),
      endereco: {
        cep: onlyDigits(data.endereco.cep),
        logradouro: data.endereco.logradouro.trim(),
        numero: data.endereco.numero.trim(),
        complemento: data.endereco.complemento.trim() || null,
        bairro: data.endereco.bairro.trim(),
        municipio: data.endereco.municipio.trim(),
        uf: data.endereco.uf.toUpperCase(),
      },
      ambiente: hidden.ambiente,
      numeracao: hidden.numeracao,
      enviarEmailAutomatico: data.dados.enviarEmailAutomatico,
      certificado: hidden.certificado,
      email: data.dados.email.trim() || null,
      telefone: onlyDigits(data.dados.telefone) || null,
      emailsRelatorios: emailsRelatoriosList,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateEmpresa(id, payload);
      } else {
        await createEmpresa(payload);
      }
      await refresh();
      toast.success(isEdit ? 'Alterações salvas.' : 'Empresa criada.');
      navigate('/empresas');
    } catch (err) {
      toast.error(
        err instanceof HttpError
          ? err.message
          : 'Não foi possível salvar a empresa. Tenta de novo?',
      );
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (notFound) return <NotFoundState />;
  if (loadError) return <LoadErrorState message={loadError} />;

  const titulo = isEdit ? `Editar ${data.dados.nomeFantasia || 'empresa'}` : 'Nova empresa';

  return (
    <div>
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
          <li aria-hidden className="text-[var(--ink-muted)]">
            /
          </li>
          <li className="text-[var(--ink)]">
            {isEdit ? data.dados.nomeFantasia || 'Editar' : 'Nova empresa'}
          </li>
        </ol>
      </nav>

      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
            {titulo}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
            Preencha as 3 abas abaixo. A gente salva tudo junto quando você clicar em{' '}
            <em className="font-serif italic">Salvar</em>.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary h-11 px-5 rounded-lg font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary h-11 px-5 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar empresa'}
          </button>
        </div>
      </header>

      <TabStrip
        activeTab={activeTab}
        onSelect={selectTab}
        validity={tabValidity}
        touched={touched}
        saveAttempted={saveAttempted}
      />

      <section className="card mt-6 p-6 md:p-8">
        {activeTab === 'dados' && (
          <DadosTab
            data={data.dados}
            issues={touched.dados || saveAttempted ? tabIssues.dados : {}}
            onChange={(patch) => updateSection('dados', patch)}
          />
        )}
        {activeTab === 'endereco' && (
          <EnderecoTab
            data={data.endereco}
            issues={touched.endereco || saveAttempted ? tabIssues.endereco : {}}
            onChange={(patch) => updateSection('endereco', patch)}
          />
        )}
        {activeTab === 'emails' && (
          <EmailsTab
            data={data.emails}
            issues={touched.emails || saveAttempted ? tabIssues.emails : {}}
            onChange={(patch) => updateSection('emails', patch)}
          />
        )}
      </section>
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
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)]" role="tablist">
      {tabs.map((tab, i) => {
        const isActive = activeTab === tab.key;
        const complete = validity[tab.key];
        const showError = !complete && (touched[tab.key] || saveAttempted);
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
    return <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-[var(--line)]" />;
}

// ---------- Tab 1: Dados da empresa ----------

function DadosTab({
  data,
  issues,
  onChange,
}: {
  data: Dados;
  issues: Issues;
  onChange: (patch: Partial<Dados>) => void;
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
            Quem é a empresa <em className="font-serif italic">emitindo</em>?
          </>
        }
        subtitle="CNPJ, razão social, regime tributário e contato. Tudo que aparece no cartão da Receita."
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

        <div>
          <FormField
            label="Inscrição estadual"
            name="ie"
            placeholder={data.isentoIE ? 'Empresa marcada como isenta' : '000.000.000.000'}
            value={data.isentoIE ? '' : data.inscricaoEstadual}
            onChange={(e) => onChange({ inscricaoEstadual: e.target.value })}
            error={issues.inscricaoEstadual}
            disabled={data.isentoIE}
          />
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.isentoIE}
              onChange={(e) =>
                onChange({
                  isentoIE: e.target.checked,
                  ...(e.target.checked ? { inscricaoEstadual: '' } : {}),
                })
              }
              className="w-4 h-4 accent-[var(--ink)]"
            />
            Isento de Inscrição Estadual
          </label>
        </div>

        <FormField
          label="Inscrição municipal"
          name="im"
          placeholder="Opcional"
          value={data.inscricaoMunicipal}
          onChange={(e) => onChange({ inscricaoMunicipal: e.target.value })}
          hint="Pra NFS-e a maioria das prefeituras pede."
        />

        <div className="md:col-span-2">
          <SectionLabel>Regime de tributação</SectionLabel>
          <fieldset className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <legend className="sr-only">Regime tributário</legend>
            {regimeOptions.map((opt) => {
              const selected = data.regime === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
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
                    className="mt-0.5 w-4 h-4 accent-[var(--ink)]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{opt.label}</div>
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
        </div>

        <div className="md:col-span-2">
          <SelectField
            label="Regime de tributação especial"
            name="regimeEspecial"
            value={data.regimeEspecial}
            onChange={(e) =>
              onChange({ regimeEspecial: e.target.value as RegimeEspecialValue })
            }
            hint="Usado em NFS-e municipal. Deixa em 'Nenhum' se não se aplica."
          >
            {regimeEspecialOptions.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
        </div>

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

        <FormField
          label="E-mail"
          name="email"
          type="email"
          placeholder="contato@empresa.com.br"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          error={issues.email}
          hint="Contato principal da empresa."
        />

        <FormField
          label="Telefone"
          name="telefone"
          placeholder="(11) 99999-9999"
          value={data.telefone}
          onChange={(e) => onChange({ telefone: formatTelefone(e.target.value) })}
          inputMode="tel"
          maxLength={16}
          error={issues.telefone}
        />

        <div className="md:col-span-2">
          <Toggle
            label="Enviar notas por e-mail automaticamente"
            hint="Assim que a nota é emitida, a gente manda o PDF + XML pro tomador."
            checked={data.enviarEmailAutomatico}
            onChange={(v) => onChange({ enviarEmailAutomatico: v })}
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
        title={
          <>
            Endereço da <em className="font-serif italic">sede</em>
          </>
        }
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

        <div className="md:col-span-2">
          <SelectField
            label="Estado"
            name="uf"
            value={data.uf}
            onChange={(e) => onChange({ uf: e.target.value.toUpperCase() })}
            error={issues.uf}
          >
            <option value="">Escolhe o estado</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="md:col-span-4">
          <SelectField
            label="Cidade"
            name="municipio"
            value={data.municipio}
            onChange={(e) => onChange({ municipio: e.target.value })}
            error={issues.municipio}
          >
            <option value="">Escolhe a cidade</option>
            {[...new Set([data.municipio, ...municipios].filter(Boolean))]
              .sort((a, b) => a.localeCompare(b, 'pt-BR'))
              .map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </SelectField>
        </div>
      </div>
    </div>
  );
}

// ---------- Tab 3: E-mails para relatórios ----------

function EmailsTab({
  data,
  issues,
  onChange,
}: {
  data: Emails;
  issues: Issues;
  onChange: (patch: Partial<Emails>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={
          <>
            Pra onde mando os <em className="font-serif italic">relatórios</em>?
          </>
        }
        subtitle="Lista de e-mails que recebem resumos e relatórios dessa empresa."
      />

      <div className="mt-8">
        <TextareaField
          label="E-mails para relatórios"
          name="emailsRelatorios"
          rows={5}
          placeholder="Digite o e-mail aqui. Pra mais de um, separe com vírgula."
          value={data.relatorios}
          onChange={(e) => onChange({ relatorios: e.target.value })}
          error={issues.relatorios}
          hint="Ex: financeiro@empresa.com, contabilidade@escritorio.com.br"
        />
      </div>
    </div>
  );
}

// ---------- Primitives ----------

function TabHeading({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold text-[var(--ink)] leading-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl leading-relaxed">{subtitle}</p>
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
  hint,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
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
      {error ? (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-[var(--ink-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

function TextareaField({ label, hint, error, id, className = '', ...rest }: TextareaFieldProps) {
  const textareaId = id ?? rest.name;
  return (
    <label htmlFor={textareaId} className="block">
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </span>
      <textarea
        id={textareaId}
        className={`mt-2 block w-full min-h-[120px] px-4 py-3 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] transition-colors focus:outline-none resize-y ${
          error
            ? 'border-[var(--warn)] focus:border-[var(--warn)]'
            : 'border-[var(--line)] focus:border-[var(--ink)]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-[var(--ink-muted)]">{hint}</span>
      ) : null}
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
          <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">{hint}</p>
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
    if (!open) {
      setQuery('');
      return;
    }
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
        o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
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
      {error && <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>}
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
    if (!open) {
      setQuery('');
      return;
    }
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
        o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
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
      <h2 className="text-2xl font-semibold text-[var(--ink)]">Empresa não encontrada.</h2>
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
