import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { FormField } from '../../components/FormField';
import { useCompany } from '../../contexts/CompanyContext';
import { mockNcms, type Ncm } from '../../mocks/ncm';
import { mockLC116 } from '../../mocks/servicos';
import {
  mockPresets,
  type Preset,
  type PresetTipo,
  type ProdutoPresetData,
  type ServicoPresetData,
} from '../../mocks/presets';
import {
  createProduto,
  getProduto,
  updateProduto,
  type CreateProdutoPayload,
  type Produto,
  type ProdutoFisico,
  type ProdutoServico,
  type UpdateProdutoPayload,
} from '../../api/produtos';
import { HttpError } from '../../lib/http';

// ---------- Types ----------

type ItemTipo = 'produto' | 'servico' | null;

type ProdutoData = {
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  valor: number;
  gtin: string;
  ncm: string;
  sujeitoST: boolean;
  cest: string;
  origem: string;
  cfop: string;
  cstOrCsosn: string;
  aliqIcms: number;
  cstPis: string;
  aliqPis: number;
  cstCofins: string;
  aliqCofins: number;
  cstIbsCbs: string;
  cClassTrib: string;
};

type ServicoData = {
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  lc116: string;
  ctiss: string;
  cnaeRelacionado: string;
  aliqIss: number;
  issRetido: boolean;
  localIncidencia: 'prestador' | 'tomador';
  retPis: RetencaoField;
  retCofins: RetencaoField;
  retCsll: RetencaoField;
  retIrrf: RetencaoField;
  retInss: RetencaoField;
  cstIbsCbs: string;
  cClassTrib: string;
};

type RetencaoField = { enabled: boolean; aliq: number };

const emptyProduto: ProdutoData = {
  codigo: '',
  nome: '',
  descricao: '',
  unidade: '',
  valor: 0,
  gtin: '',
  ncm: '',
  sujeitoST: false,
  cest: '',
  origem: '',
  cfop: '',
  cstOrCsosn: '',
  aliqIcms: 0,
  cstPis: '',
  aliqPis: 0,
  cstCofins: '',
  aliqCofins: 0,
  cstIbsCbs: '',
  cClassTrib: '',
};

const emptyServico: ServicoData = {
  codigo: '',
  nome: '',
  descricao: '',
  valor: 0,
  lc116: '',
  ctiss: '',
  cnaeRelacionado: '',
  aliqIss: 0,
  issRetido: false,
  localIncidencia: 'prestador',
  retPis: { enabled: false, aliq: 0 },
  retCofins: { enabled: false, aliq: 0 },
  retCsll: { enabled: false, aliq: 0 },
  retIrrf: { enabled: false, aliq: 0 },
  retInss: { enabled: false, aliq: 0 },
  cstIbsCbs: '',
  cClassTrib: '',
};

function toProdutoData(item: ProdutoFisico): ProdutoData {
  const p = item.produtoConfig;
  return {
    codigo: item.codigo,
    nome: item.nome,
    descricao: item.descricao,
    unidade: p.unidade,
    valor: item.valor,
    gtin: p.gtin ?? '',
    ncm: p.ncm ?? '',
    sujeitoST: p.sujeitoST,
    cest: p.cest ?? '',
    origem: p.origem,
    cfop: p.cfop,
    cstOrCsosn: p.cstOrCsosn,
    aliqIcms: p.aliqIcms,
    cstPis: p.cstPis,
    aliqPis: p.aliqPis,
    cstCofins: p.cstCofins,
    aliqCofins: p.aliqCofins,
    cstIbsCbs: item.ibsCbs.cstIbsCbs,
    cClassTrib: item.ibsCbs.cClassTrib,
  };
}

function toServicoData(item: ProdutoServico): ServicoData {
  const s = item.servicoConfig;
  return {
    codigo: item.codigo,
    nome: item.nome,
    descricao: item.descricao,
    valor: item.valor,
    lc116: s.lc116,
    ctiss: s.ctiss ?? '',
    cnaeRelacionado: s.cnaeRelacionado ?? '',
    aliqIss: s.aliqIss,
    issRetido: s.issRetido,
    localIncidencia: s.localIncidencia,
    retPis: { ...s.retPis },
    retCofins: { ...s.retCofins },
    retCsll: { ...s.retCsll },
    retIrrf: { ...s.retIrrf },
    retInss: { ...s.retInss },
    cstIbsCbs: item.ibsCbs.cstIbsCbs,
    cClassTrib: item.ibsCbs.cClassTrib,
  };
}

// ---------- Constants ----------

const unidades = ['UN', 'CX', 'KG', 'L', 'M', 'M2', 'M3'];
const unidadeLabel: Record<string, string> = {
  UN: 'UN — Unidade',
  CX: 'CX — Caixa',
  KG: 'KG — Quilograma',
  L: 'L — Litro',
  M: 'M — Metro',
  M2: 'M² — Metro quadrado',
  M3: 'M³ — Metro cúbico',
};

const origens = [
  { value: '0', label: '0 — Nacional' },
  { value: '1', label: '1 — Estrangeira, importação direta' },
  { value: '2', label: '2 — Estrangeira, mercado interno' },
  { value: '3', label: '3 — Nacional, CI > 40%' },
  { value: '4', label: '4 — Nacional, PPB (Lei 8.248/91)' },
  { value: '5', label: '5 — Nacional, CI ≤ 40%' },
  { value: '6', label: '6 — Estrangeira, sem similar nacional (CAMEX)' },
  { value: '7', label: '7 — Estrangeira mercado interno, sem similar nacional (CAMEX)' },
  { value: '8', label: '8 — Nacional, CI > 70%' },
];

const cfops = [
  { value: '5101', label: '5101 — Venda de produção do estabelecimento' },
  { value: '5102', label: '5102 — Venda de mercadoria adquirida de terceiros' },
  { value: '5405', label: '5405 — Venda de mercadoria com ST (contribuinte substituído)' },
  { value: '5403', label: '5403 — Venda de mercadoria com ST (contribuinte substituto)' },
  { value: '5933', label: '5933 — Prestação de serviço tributado pelo ISS' },
  { value: '6101', label: '6101 — Venda de produção (outro estado)' },
  { value: '6102', label: '6102 — Venda de mercadoria de terceiros (outro estado)' },
  { value: '6108', label: '6108 — Venda de mercadoria a não contribuinte (outro estado)' },
];

const cstsIcms = [
  { value: '00', label: '00 — Tributada integralmente' },
  { value: '10', label: '10 — Tributada com cobrança do ICMS por ST' },
  { value: '20', label: '20 — Com redução de base de cálculo' },
  { value: '30', label: '30 — Isenta ou não tributada com ST' },
  { value: '40', label: '40 — Isenta' },
  { value: '41', label: '41 — Não tributada' },
  { value: '50', label: '50 — Suspensão' },
  { value: '51', label: '51 — Diferimento' },
  { value: '60', label: '60 — ICMS cobrado anteriormente por ST' },
  { value: '70', label: '70 — Com redução de base e cobrança por ST' },
  { value: '90', label: '90 — Outras' },
];

const csosn = [
  { value: '101', label: '101 — Tributada pelo Simples com permissão de crédito' },
  { value: '102', label: '102 — Tributada pelo Simples sem permissão de crédito' },
  { value: '103', label: '103 — Isenção do ICMS no Simples, faixa de receita bruta' },
  { value: '201', label: '201 — Tributada pelo Simples com permissão e cobrança por ST' },
  { value: '202', label: '202 — Tributada pelo Simples sem permissão e com ST' },
  { value: '203', label: '203 — Isenção do ICMS no Simples e cobrança por ST' },
  { value: '300', label: '300 — Imune' },
  { value: '400', label: '400 — Não tributada pelo Simples' },
  { value: '500', label: '500 — ICMS cobrado anteriormente por ST ou antecipação' },
  { value: '900', label: '900 — Outros' },
];

const cstsPisCofins = [
  { value: '01', label: '01 — Operação tributável com alíquota básica' },
  { value: '02', label: '02 — Operação tributável com alíquota diferenciada' },
  { value: '04', label: '04 — Operação tributável monofásica, alíquota zero' },
  { value: '06', label: '06 — Operação tributável a alíquota zero' },
  { value: '07', label: '07 — Operação isenta da contribuição' },
  { value: '08', label: '08 — Operação sem incidência' },
  { value: '09', label: '09 — Operação com suspensão da contribuição' },
  { value: '49', label: '49 — Outras operações de saída' },
  { value: '99', label: '99 — Outras operações' },
];

const cstsIbsCbs = [
  { value: '000', label: '000 — Tributação integral (IBS + CBS)' },
  { value: '010', label: '010 — Tributação com alíquota reduzida' },
  { value: '020', label: '020 — Monofásica' },
  { value: '030', label: '030 — Redução de 60%' },
  { value: '040', label: '040 — Redução de 100% (imune)' },
  { value: '050', label: '050 — Diferimento' },
  { value: '060', label: '060 — Não incidência' },
];

// ---------- Schemas ----------

const produtoBasicoSchema = z.object({
  codigo: z.string().trim().min(1, 'Código interno é obrigatório.'),
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  descricao: z.string().optional(),
  unidade: z.string().min(1, 'Escolhe a unidade.'),
  valor: z.number().gt(0, 'Valor precisa ser maior que zero.'),
  gtin: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^(\d{8}|\d{12,14})$/.test(v),
      'GTIN deve ter 8, 12, 13 ou 14 dígitos.',
    ),
});

const produtoClassificacaoSchema = z.object({
  ncm: z.string().refine((v) => /^\d{8}$/.test(v), 'NCM precisa de 8 dígitos.'),
  sujeitoST: z.boolean(),
  cest: z.string().optional(),
  origem: z.string().min(1, 'Escolhe a origem.'),
  cfop: z.string().min(1, 'Escolhe o CFOP.'),
});

const produtoIcmsSchema = z.object({
  cstOrCsosn: z.string().min(1, 'CST/CSOSN é obrigatório.'),
  aliqIcms: z.number().min(0).max(100, 'Alíquota entre 0 e 100%.'),
});

const produtoPisCofinsSchema = z.object({
  cstPis: z.string().min(1, 'CST PIS é obrigatório.'),
  aliqPis: z.number().min(0).max(100, 'Entre 0 e 100%.'),
  cstCofins: z.string().min(1, 'CST COFINS é obrigatório.'),
  aliqCofins: z.number().min(0).max(100, 'Entre 0 e 100%.'),
});

const ibsCbsSchema = z.object({
  cstIbsCbs: z.string().min(1, 'CST IBS/CBS é obrigatório.'),
  cClassTrib: z.string().min(1, 'cClassTrib é obrigatório.'),
});

const servicoBasicoSchema = z.object({
  codigo: z.string().trim().min(1, 'Código interno é obrigatório.'),
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  descricao: z.string().optional(),
  valor: z.number().gt(0, 'Valor precisa ser maior que zero.'),
});

const servicoClassificacaoSchema = z.object({
  lc116: z.string().min(1, 'Escolhe o código da LC 116.'),
  ctiss: z.string().optional(),
  cnaeRelacionado: z.string().optional(),
});

const servicoIssSchema = z.object({
  aliqIss: z.number().min(0).max(5, 'ISS vai de 0 a 5%.'),
  issRetido: z.boolean(),
  localIncidencia: z.enum(['prestador', 'tomador']),
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

export function Formulario() {
  const { id } = useParams<{ id?: string }>();
  const { empresaAtiva } = useCompany();
  const isEdit = Boolean(id);

  const [tipo, setTipo] = useState<ItemTipo>(null);
  const [initialData, setInitialData] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    if (!empresaAtiva) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    getProduto(empresaAtiva.id, id)
      .then((p) => {
        if (cancelled) return;
        setTipo(p.tipo);
        setInitialData(p);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof HttpError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof HttpError ? err.message : 'Não foi possível carregar o produto.',
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, empresaAtiva]);

  if (loading) return <EditLoadingState />;
  if (notFound) return <EditNotFoundState />;
  if (loadError) return <LoadErrorState message={loadError} />;

  const crumbLabel = isEdit
    ? initialData?.nome ?? 'Editar produto'
    : 'Novo produto';
  const title = isEdit
    ? `Editar ${initialData?.nome ?? 'produto'}`
    : 'Novo produto';
  const subtitle = isEdit
    ? 'Ajusta o que precisa. Muda aqui vale pra toda nota futura.'
    : 'Cadastra uma vez, reusa em toda nota. Começa dizendo se o item é produto ou serviço.';

  return (
    <div className="pb-24">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.02em]">
          <li>
            <Link
              to="/produtos"
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              Produtos
            </Link>
          </li>
          <li aria-hidden className="text-[var(--ink-muted)]">/</li>
          <li className="text-[var(--ink)] truncate max-w-[320px]">
            {crumbLabel}
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
          {subtitle}
        </p>
      </header>

      {!isEdit && <TipoSelector tipo={tipo} onChange={setTipo} />}

      {tipo === 'produto' && (
        <ProdutoForm
          key={`produto-${id ?? 'new'}`}
          isEdit={isEdit}
          itemId={id}
          initialData={initialData}
        />
      )}
      {tipo === 'servico' && (
        <ServicoForm
          key={`servico-${id ?? 'new'}`}
          isEdit={isEdit}
          itemId={id}
          initialData={initialData}
        />
      )}
    </div>
  );
}

function EditLoadingState() {
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

function EditNotFoundState() {
  return (
    <div className="card p-12 text-center">
      <h2 className="text-2xl font-semibold text-[var(--ink)]">
        Produto não encontrado.
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        O link pode estar quebrado ou o item foi removido.
      </p>
      <Link
        to="/produtos"
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
        Não foi possível carregar o produto.
      </h2>
      <p
        className="mt-2 text-sm"
        style={{ color: 'var(--color-err-fg, #DC2626)', opacity: 0.85 }}
      >
        {message}
      </p>
      <Link
        to="/produtos"
        className="mt-6 btn-secondary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Voltar pra lista
      </Link>
    </div>
  );
}

export default Formulario;

// ---------- Tipo selector ----------

function TipoSelector({
  tipo,
  onChange,
}: {
  tipo: ItemTipo;
  onChange: (t: ItemTipo) => void;
}) {
  return (
    <section className="card p-6 md:p-8">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Passo 01
        </span>
        <h2 className="mt-2 text-xl md:text-2xl font-semibold text-[var(--ink)]">
          Que tipo de item{' '}
          <em className="font-serif italic">esse aí é</em>?
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Produto vai pra NF-e. Serviço vai pra NFS-e. Se emite os dois,
          cadastra separado.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TipoCard
          label="Produto"
          hint="Algo físico ou digital que você vende como mercadoria."
          selected={tipo === 'produto'}
          onClick={() => onChange('produto')}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3l8 4v10l-8 4-8-4V7l8-4z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M4 7l8 4 8-4M12 11v10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <TipoCard
          label="Serviço"
          hint="Qualquer coisa que você presta — curso, consultoria, mentoria."
          selected={tipo === 'servico'}
          onClick={() => onChange('servico')}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M14 4l3 3-7 7H7v-3l7-7z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M11 11l2 2M4 20h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </div>
    </section>
  );
}

function TipoCard({
  label,
  hint,
  selected,
  onClick,
  icon,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-colors ${
        selected
          ? 'border-[var(--ink)] bg-[var(--line-soft)]/60'
          : 'border-[var(--line)] bg-white hover:border-[var(--ink)]'
      }`}
    >
      <span
        className={`flex-none w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          selected
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--line-soft)] text-[var(--ink)]'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-[var(--ink)]">
            {label}
          </div>
          {selected && (
            <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
              Selecionado
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
          {hint}
        </p>
      </div>
    </button>
  );
}

// ---------- Produto form ----------

type ProdutoTabKey = 'basico' | 'classificacao' | 'icms' | 'pisCofins' | 'ibsCbs';

const produtoTabs: { key: ProdutoTabKey; label: string }[] = [
  { key: 'basico', label: 'Básico' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'icms', label: 'ICMS' },
  { key: 'pisCofins', label: 'PIS/COFINS' },
  { key: 'ibsCbs', label: 'IBS/CBS' },
];

function ProdutoForm({
  isEdit = false,
  itemId,
  initialData,
}: {
  isEdit?: boolean;
  itemId?: string;
  initialData?: Produto | null;
}) {
  const navigate = useNavigate();
  const { empresaAtiva } = useCompany();
  const useCsosn =
    empresaAtiva?.regimeTributario === 'simples' ||
    empresaAtiva?.regimeTributario === 'mei';

  const [data, setData] = useState<ProdutoData>(() =>
    initialData && initialData.tipo === 'produto'
      ? toProdutoData(initialData)
      : emptyProduto,
  );
  const [activeTab, setActiveTab] = useState<ProdutoTabKey>('basico');
  const [touched, setTouched] = useState<Record<ProdutoTabKey, boolean>>({
    basico: false,
    classificacao: false,
    icms: false,
    pisCofins: false,
    ibsCbs: false,
  });
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const tabValidity = useMemo<Record<ProdutoTabKey, boolean>>(
    () => ({
      basico: produtoBasicoSchema.safeParse(data).success,
      classificacao: produtoClassificacaoSchema.safeParse(data).success,
      icms: produtoIcmsSchema.safeParse(data).success,
      pisCofins: produtoPisCofinsSchema.safeParse(data).success,
      ibsCbs: ibsCbsSchema.safeParse(data).success,
    }),
    [data],
  );

  const tabIssues = useMemo<Record<ProdutoTabKey, Issues>>(() => {
    const run = <T,>(schema: z.ZodType<T>) => {
      const r = schema.safeParse(data);
      return r.success ? {} : collectIssues(r.error);
    };
    return {
      basico: run(produtoBasicoSchema),
      classificacao: run(produtoClassificacaoSchema),
      icms: run(produtoIcmsSchema),
      pisCofins: run(produtoPisCofinsSchema),
      ibsCbs: run(ibsCbsSchema),
    };
  }, [data]);

  const allValid = Object.values(tabValidity).every(Boolean);

  function update(patch: Partial<ProdutoData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function selectTab(key: ProdutoTabKey) {
    setTouched((t) => ({ ...t, [activeTab]: true }));
    setActiveTab(key);
  }

  function applyPreset(preset: Preset) {
    if (preset.tipo !== 'produto') return;
    const p = preset.data as ProdutoPresetData;
    update({
      ncm: p.ncm ?? data.ncm,
      origem: p.origem ?? data.origem,
      cfop: p.cfop ?? data.cfop,
      cstOrCsosn: p.cstOrCsosn ?? data.cstOrCsosn,
      aliqIcms: p.aliqIcms ?? data.aliqIcms,
      cstPis: p.cstPis ?? data.cstPis,
      aliqPis: p.aliqPis ?? data.aliqPis,
      cstCofins: p.cstCofins ?? data.cstCofins,
      aliqCofins: p.aliqCofins ?? data.aliqCofins,
      cstIbsCbs: p.cstIbsCbs ?? data.cstIbsCbs,
      cClassTrib: p.cClassTrib ?? data.cClassTrib,
    });
    setToast(`Preset "${preset.nome}" aplicado.`);
  }

  function saveAsPreset() {
    // Mock — depois liga em API real.
    setToast('Preset salvo (mock).');
  }

  async function handleSave() {
    setSaveAttempted(true);
    setTouched({
      basico: true,
      classificacao: true,
      icms: true,
      pisCofins: true,
      ibsCbs: true,
    });
    if (!allValid) {
      const firstInvalid = produtoTabs.find((t) => !tabValidity[t.key]);
      if (firstInvalid) setActiveTab(firstInvalid.key);
      return;
    }
    if (!empresaAtiva) {
      setToast('Escolha uma empresa no topo antes de salvar.');
      return;
    }

    const produtoConfig = {
      unidade: data.unidade,
      ncm: data.ncm || null,
      gtin: data.gtin || null,
      sujeitoST: data.sujeitoST,
      cest: data.cest || null,
      origem: data.origem,
      cfop: data.cfop,
      cstOrCsosn: data.cstOrCsosn,
      aliqIcms: data.aliqIcms,
      cstPis: data.cstPis,
      aliqPis: data.aliqPis,
      cstCofins: data.cstCofins,
      aliqCofins: data.aliqCofins,
    };
    const ibsCbs = { cstIbsCbs: data.cstIbsCbs, cClassTrib: data.cClassTrib };

    setSaving(true);
    try {
      if (isEdit && itemId) {
        const payload: UpdateProdutoPayload = {
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao,
          valor: data.valor,
          status: initialData?.status ?? 'ativo',
          ibsCbs,
          produtoConfig,
          servicoConfig: null,
        };
        await updateProduto(empresaAtiva.id, itemId, payload);
      } else {
        const payload: CreateProdutoPayload = {
          tipo: 'produto',
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao,
          valor: data.valor,
          ibsCbs,
          produtoConfig,
          servicoConfig: null,
        };
        await createProduto(empresaAtiva.id, payload);
      }
      setToast(isEdit ? 'Alterações salvas.' : 'Item cadastrado.');
      setTimeout(() => navigate('/produtos'), 800);
    } catch (err) {
      setSaving(false);
      setToast(
        err instanceof HttpError
          ? err.message
          : 'Não foi possível salvar. Tenta de novo?',
      );
    }
  }

  return (
    <>
      <PresetsBar
        tipo="produto"
        onApply={applyPreset}
        onSave={saveAsPreset}
      />

      <TabStrip
        tabs={produtoTabs}
        activeTab={activeTab}
        onSelect={selectTab}
        validity={tabValidity}
        touched={touched}
        saveAttempted={saveAttempted}
      />

      <section className="card mt-6 p-6 md:p-8">
        {activeTab === 'basico' && (
          <ProdutoBasico
            data={data}
            issues={touched.basico || saveAttempted ? tabIssues.basico : {}}
            onChange={update}
          />
        )}
        {activeTab === 'classificacao' && (
          <ProdutoClassificacao
            data={data}
            issues={touched.classificacao || saveAttempted ? tabIssues.classificacao : {}}
            onChange={update}
          />
        )}
        {activeTab === 'icms' && (
          <ProdutoIcms
            data={data}
            issues={touched.icms || saveAttempted ? tabIssues.icms : {}}
            onChange={update}
            useCsosn={useCsosn}
          />
        )}
        {activeTab === 'pisCofins' && (
          <ProdutoPisCofins
            data={data}
            issues={touched.pisCofins || saveAttempted ? tabIssues.pisCofins : {}}
            onChange={update}
          />
        )}
        {activeTab === 'ibsCbs' && (
          <IbsCbsTab
            cstIbsCbs={data.cstIbsCbs}
            cClassTrib={data.cClassTrib}
            issues={touched.ibsCbs || saveAttempted ? tabIssues.ibsCbs : {}}
            onChange={(patch) => update(patch)}
          />
        )}
      </section>

      <Footer
        allValid={allValid}
        saveAttempted={saveAttempted}
        saving={saving}
        onCancel={() => navigate('/produtos')}
        onSave={handleSave}
        saveLabel={isEdit ? 'Salvar alterações' : 'Cadastrar produto'}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function ProdutoBasico({
  data,
  issues,
  onChange,
}: {
  data: ProdutoData;
  issues: Issues;
  onChange: (patch: Partial<ProdutoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>Os dados que{' '}<em className="font-serif italic">aparecem</em>{' '}na nota</>}
        subtitle="Nome, descrição, unidade e preço. O código é de uso interno — você escolhe."
      />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-6 gap-5">
        <div className="md:col-span-2">
          <FormField
            label="Código interno"
            name="codigo"
            placeholder="SKU-001"
            value={data.codigo}
            onChange={(e) => onChange({ codigo: e.target.value })}
            error={issues.codigo}
            required
            className="font-mono tracking-[0.02em]"
          />
        </div>
        <div className="md:col-span-4">
          <FormField
            label="Nome"
            name="nome"
            placeholder="Livro de Copywriting"
            value={data.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            error={issues.nome}
            required
          />
        </div>
        <div className="md:col-span-6">
          <LabeledField label="Descrição" hint="Aparece nos itens da NF-e. Seja específico.">
            <textarea
              value={data.descricao}
              onChange={(e) => onChange({ descricao: e.target.value })}
              placeholder="Detalhes técnicos, variações, material..."
              rows={3}
              className="block w-full px-4 py-3 rounded-lg bg-white border border-[var(--line)] font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors resize-y"
            />
          </LabeledField>
        </div>
        <div className="md:col-span-2">
          <SelectField
            label="Unidade comercial"
            value={data.unidade}
            onChange={(e) => onChange({ unidade: e.target.value })}
            error={issues.unidade}
            required
          >
            <option value="">Escolhe</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {unidadeLabel[u]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="md:col-span-2">
          <LabeledField label="Valor unitário (R$)" error={issues.valor} required>
            <NumberInput
              value={data.valor}
              onChange={(v) => onChange({ valor: v })}
              mono
            />
          </LabeledField>
        </div>
        <div className="md:col-span-2">
          <LabeledField
            label="GTIN / EAN"
            hint="Código de barras. Pula se não tiver."
            error={issues.gtin}
          >
            <input
              type="text"
              inputMode="numeric"
              value={data.gtin}
              onChange={(e) => onChange({ gtin: e.target.value.replace(/\D/g, '') })}
              placeholder="7891234567890"
              maxLength={14}
              className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] font-mono tracking-[0.02em] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </LabeledField>
        </div>
      </div>
    </div>
  );
}

function ProdutoClassificacao({
  data,
  issues,
  onChange,
}: {
  data: ProdutoData;
  issues: Issues;
  onChange: (patch: Partial<ProdutoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>Classificação{' '}<em className="font-serif italic">fiscal</em></>}
        subtitle="NCM e CFOP ditam o tratamento tributário. Quando em dúvida, puxa um preset."
      />

      <div className="mt-8 space-y-5">
        <NcmSelect
          value={data.ncm}
          onChange={(v) => onChange({ ncm: v })}
          error={issues.ncm}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-[var(--line)] bg-white">
              <input
                id="sujeitoST"
                type="checkbox"
                checked={data.sujeitoST}
                onChange={(e) => onChange({ sujeitoST: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[var(--ink)]"
              />
              <label htmlFor="sujeitoST" className="text-sm text-[var(--ink)]">
                <span className="font-medium">Sujeito à substituição tributária</span>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)] leading-relaxed">
                  Marque se a mercadoria tem ST. O CEST fica obrigatório.
                </p>
              </label>
            </div>
          </div>
          {data.sujeitoST && (
            <LabeledField
              label="CEST"
              tooltip="Código Especificador da Substituição Tributária. Obrigatório sempre que o item estiver sujeito a ST."
            >
              <input
                type="text"
                inputMode="numeric"
                value={data.cest}
                onChange={(e) => onChange({ cest: e.target.value.replace(/\D/g, '') })}
                placeholder="0000000"
                maxLength={7}
                className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] font-mono tracking-[0.02em] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
              />
            </LabeledField>
          )}
        </div>

        <SelectField
          label="Origem da mercadoria"
          value={data.origem}
          onChange={(e) => onChange({ origem: e.target.value })}
          error={issues.origem}
          tooltip="CST-A: define a procedência (nacional/estrangeira) e o conteúdo de importação."
          required
        >
          <option value="">Escolhe a origem</option>
          {origens.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="CFOP padrão"
          value={data.cfop}
          onChange={(e) => onChange({ cfop: e.target.value })}
          error={issues.cfop}
          tooltip="Código Fiscal de Operações e Prestações. Define a natureza da operação (venda, transferência, remessa)."
          required
        >
          <option value="">Escolhe o CFOP de saída</option>
          {cfops.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}

function ProdutoIcms({
  data,
  issues,
  onChange,
  useCsosn,
}: {
  data: ProdutoData;
  issues: Issues;
  onChange: (patch: Partial<ProdutoData>) => void;
  useCsosn: boolean;
}) {
  const options = useCsosn ? csosn : cstsIcms;
  const label = useCsosn ? 'CSOSN' : 'CST ICMS';
  return (
    <div>
      <TabHeading
        title={<>Tributação{' '}<em className="font-serif italic">ICMS</em></>}
        subtitle={
          useCsosn
            ? 'Como a empresa ativa é do Simples/MEI, usamos CSOSN.'
            : 'Como a empresa ativa não é do Simples, usamos CST ICMS.'
        }
      />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <SelectField
          label={label}
          value={data.cstOrCsosn}
          onChange={(e) => onChange({ cstOrCsosn: e.target.value })}
          error={issues.cstOrCsosn}
          tooltip={
            useCsosn
              ? 'Código de Situação da Operação no Simples Nacional. Depende do Anexo e da faixa.'
              : 'Código de Situação Tributária. Define tributação do ICMS na operação.'
          }
          required
        >
          <option value="">Escolhe o código</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <LabeledField
          label="Alíquota ICMS (%)"
          error={issues.aliqIcms}
          tooltip="Alíquota interna do estado de destino da mercadoria."
        >
          <NumberInput
            value={data.aliqIcms}
            onChange={(v) => onChange({ aliqIcms: v })}
            suffix="%"
            mono
          />
        </LabeledField>
      </div>
    </div>
  );
}

function ProdutoPisCofins({
  data,
  issues,
  onChange,
}: {
  data: ProdutoData;
  issues: Issues;
  onChange: (patch: Partial<ProdutoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>PIS e{' '}<em className="font-serif italic">COFINS</em></>}
        subtitle="As duas contribuições que aparecem em toda operação."
      />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <SelectField
          label="CST PIS"
          value={data.cstPis}
          onChange={(e) => onChange({ cstPis: e.target.value })}
          error={issues.cstPis}
          tooltip="Código de Situação Tributária do PIS — define tributação, isenção ou suspensão."
          required
        >
          <option value="">Escolhe o CST PIS</option>
          {cstsPisCofins.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectField>

        <LabeledField
          label="Alíquota PIS (%)"
          error={issues.aliqPis}
          tooltip="Cumulativo: 0,65%. Não-cumulativo: 1,65%. Zero/isento para CSTs específicos."
        >
          <NumberInput
            value={data.aliqPis}
            onChange={(v) => onChange({ aliqPis: v })}
            suffix="%"
            mono
          />
        </LabeledField>

        <SelectField
          label="CST COFINS"
          value={data.cstCofins}
          onChange={(e) => onChange({ cstCofins: e.target.value })}
          error={issues.cstCofins}
          tooltip="Código de Situação Tributária da COFINS."
          required
        >
          <option value="">Escolhe o CST COFINS</option>
          {cstsPisCofins.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectField>

        <LabeledField
          label="Alíquota COFINS (%)"
          error={issues.aliqCofins}
          tooltip="Cumulativo: 3%. Não-cumulativo: 7,6%."
        >
          <NumberInput
            value={data.aliqCofins}
            onChange={(v) => onChange({ aliqCofins: v })}
            suffix="%"
            mono
          />
        </LabeledField>
      </div>
    </div>
  );
}

// ---------- Serviço form ----------

type ServicoTabKey = 'basico' | 'classificacao' | 'iss' | 'retencoes' | 'ibsCbs';

const servicoTabs: { key: ServicoTabKey; label: string }[] = [
  { key: 'basico', label: 'Básico' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'iss', label: 'ISS' },
  { key: 'retencoes', label: 'Retenções' },
  { key: 'ibsCbs', label: 'IBS/CBS' },
];

function ServicoForm({
  isEdit = false,
  itemId,
  initialData,
}: {
  isEdit?: boolean;
  itemId?: string;
  initialData?: Produto | null;
}) {
  const navigate = useNavigate();
  const { empresaAtiva } = useCompany();
  const [data, setData] = useState<ServicoData>(() =>
    initialData && initialData.tipo === 'servico'
      ? toServicoData(initialData)
      : emptyServico,
  );
  const [activeTab, setActiveTab] = useState<ServicoTabKey>('basico');
  const [touched, setTouched] = useState<Record<ServicoTabKey, boolean>>({
    basico: false,
    classificacao: false,
    iss: false,
    retencoes: false,
    ibsCbs: false,
  });
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const tabValidity = useMemo<Record<ServicoTabKey, boolean>>(
    () => ({
      basico: servicoBasicoSchema.safeParse(data).success,
      classificacao: servicoClassificacaoSchema.safeParse(data).success,
      iss: servicoIssSchema.safeParse(data).success,
      retencoes: true,
      ibsCbs: ibsCbsSchema.safeParse(data).success,
    }),
    [data],
  );

  const tabIssues = useMemo<Record<ServicoTabKey, Issues>>(() => {
    const run = <T,>(schema: z.ZodType<T>) => {
      const r = schema.safeParse(data);
      return r.success ? {} : collectIssues(r.error);
    };
    return {
      basico: run(servicoBasicoSchema),
      classificacao: run(servicoClassificacaoSchema),
      iss: run(servicoIssSchema),
      retencoes: {},
      ibsCbs: run(ibsCbsSchema),
    };
  }, [data]);

  const allValid = Object.values(tabValidity).every(Boolean);

  function update(patch: Partial<ServicoData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function selectTab(key: ServicoTabKey) {
    setTouched((t) => ({ ...t, [activeTab]: true }));
    setActiveTab(key);
  }

  function applyPreset(preset: Preset) {
    if (preset.tipo !== 'servico') return;
    const p = preset.data as ServicoPresetData;
    update({
      lc116: p.lc116 ?? data.lc116,
      aliqIss: p.aliqIss ?? data.aliqIss,
      issRetido: p.issRetido ?? data.issRetido,
      localIncidencia: p.localIncidencia ?? data.localIncidencia,
      retPis: p.retPis ?? data.retPis,
      retCofins: p.retCofins ?? data.retCofins,
      retCsll: p.retCsll ?? data.retCsll,
      retIrrf: p.retIrrf ?? data.retIrrf,
      retInss: p.retInss ?? data.retInss,
      cstIbsCbs: p.cstIbsCbs ?? data.cstIbsCbs,
      cClassTrib: p.cClassTrib ?? data.cClassTrib,
    });
    setToast(`Preset "${preset.nome}" aplicado.`);
  }

  function saveAsPreset() {
    setToast('Preset salvo (mock).');
  }

  async function handleSave() {
    setSaveAttempted(true);
    setTouched({
      basico: true,
      classificacao: true,
      iss: true,
      retencoes: true,
      ibsCbs: true,
    });
    if (!allValid) {
      const firstInvalid = servicoTabs.find((t) => !tabValidity[t.key]);
      if (firstInvalid) setActiveTab(firstInvalid.key);
      return;
    }
    if (!empresaAtiva) {
      setToast('Escolha uma empresa no topo antes de salvar.');
      return;
    }

    const servicoConfig = {
      lc116: data.lc116,
      ctiss: data.ctiss || null,
      cnaeRelacionado: data.cnaeRelacionado || null,
      aliqIss: data.aliqIss,
      issRetido: data.issRetido,
      localIncidencia: data.localIncidencia,
      retPis: data.retPis,
      retCofins: data.retCofins,
      retCsll: data.retCsll,
      retIrrf: data.retIrrf,
      retInss: data.retInss,
    };
    const ibsCbs = { cstIbsCbs: data.cstIbsCbs, cClassTrib: data.cClassTrib };

    setSaving(true);
    try {
      if (isEdit && itemId) {
        const payload: UpdateProdutoPayload = {
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao,
          valor: data.valor,
          status: initialData?.status ?? 'ativo',
          ibsCbs,
          produtoConfig: null,
          servicoConfig,
        };
        await updateProduto(empresaAtiva.id, itemId, payload);
      } else {
        const payload: CreateProdutoPayload = {
          tipo: 'servico',
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao,
          valor: data.valor,
          ibsCbs,
          produtoConfig: null,
          servicoConfig,
        };
        await createProduto(empresaAtiva.id, payload);
      }
      setToast(isEdit ? 'Alterações salvas.' : 'Item cadastrado.');
      setTimeout(() => navigate('/produtos'), 800);
    } catch (err) {
      setSaving(false);
      setToast(
        err instanceof HttpError
          ? err.message
          : 'Não foi possível salvar. Tenta de novo?',
      );
    }
  }

  return (
    <>
      <PresetsBar
        tipo="servico"
        onApply={applyPreset}
        onSave={saveAsPreset}
      />

      <TabStrip
        tabs={servicoTabs}
        activeTab={activeTab}
        onSelect={selectTab}
        validity={tabValidity}
        touched={touched}
        saveAttempted={saveAttempted}
      />

      <section className="card mt-6 p-6 md:p-8">
        {activeTab === 'basico' && (
          <ServicoBasico
            data={data}
            issues={touched.basico || saveAttempted ? tabIssues.basico : {}}
            onChange={update}
          />
        )}
        {activeTab === 'classificacao' && (
          <ServicoClassificacao
            data={data}
            issues={touched.classificacao || saveAttempted ? tabIssues.classificacao : {}}
            onChange={update}
          />
        )}
        {activeTab === 'iss' && (
          <ServicoIss
            data={data}
            issues={touched.iss || saveAttempted ? tabIssues.iss : {}}
            onChange={update}
          />
        )}
        {activeTab === 'retencoes' && (
          <ServicoRetencoes data={data} onChange={update} />
        )}
        {activeTab === 'ibsCbs' && (
          <IbsCbsTab
            cstIbsCbs={data.cstIbsCbs}
            cClassTrib={data.cClassTrib}
            issues={touched.ibsCbs || saveAttempted ? tabIssues.ibsCbs : {}}
            onChange={(patch) => update(patch as Partial<ServicoData>)}
          />
        )}
      </section>

      <Footer
        allValid={allValid}
        saveAttempted={saveAttempted}
        saving={saving}
        onCancel={() => navigate('/produtos')}
        onSave={handleSave}
        saveLabel={isEdit ? 'Salvar alterações' : 'Cadastrar serviço'}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function ServicoBasico({
  data,
  issues,
  onChange,
}: {
  data: ServicoData;
  issues: Issues;
  onChange: (patch: Partial<ServicoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>Os dados que{' '}<em className="font-serif italic">vão na nota</em></>}
        subtitle="Nome, descrição padrão e valor."
      />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-6 gap-5">
        <div className="md:col-span-2">
          <FormField
            label="Código interno"
            name="codigo"
            placeholder="SVC-001"
            value={data.codigo}
            onChange={(e) => onChange({ codigo: e.target.value })}
            error={issues.codigo}
            required
            className="font-mono tracking-[0.02em]"
          />
        </div>
        <div className="md:col-span-4">
          <FormField
            label="Nome"
            name="nome"
            placeholder="Mentoria 1:1 — Copywriting"
            value={data.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            error={issues.nome}
            required
          />
        </div>
        <div className="md:col-span-6">
          <LabeledField label="Descrição padrão" hint="Texto que entra na descrição do serviço na NFS-e.">
            <textarea
              value={data.descricao}
              onChange={(e) => onChange({ descricao: e.target.value })}
              placeholder="Prestação de serviço de consultoria em..."
              rows={3}
              className="block w-full px-4 py-3 rounded-lg bg-white border border-[var(--line)] font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors resize-y"
            />
          </LabeledField>
        </div>
        <div className="md:col-span-2">
          <LabeledField label="Valor (R$)" error={issues.valor} required>
            <NumberInput
              value={data.valor}
              onChange={(v) => onChange({ valor: v })}
              mono
            />
          </LabeledField>
        </div>
      </div>
    </div>
  );
}

function ServicoClassificacao({
  data,
  issues,
  onChange,
}: {
  data: ServicoData;
  issues: Issues;
  onChange: (patch: Partial<ServicoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>O que esse serviço{' '}<em className="font-serif italic">é</em></>}
        subtitle="Código da LC 116 diz à prefeitura qual item da lista anexa sua atividade se encaixa."
      />
      <div className="mt-8 space-y-5">
        <SearchSelect
          label="Código LC 116"
          placeholder="Buscar por código ou atividade"
          value={data.lc116}
          onChange={(v) => onChange({ lc116: v })}
          options={mockLC116.map((s) => ({
            value: s.codigo,
            label: s.codigo,
            description: s.descricao,
          }))}
          error={issues.lc116}
          tooltip="Lista de serviços da Lei Complementar 116/2003 — identifica o item tributável pelo ISS."
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <LabeledField
            label="CTISS"
            hint="Opcional. Código nacional de serviços, quando a prefeitura exige."
            tooltip="Código Tributário de Serviços — padrão nacional adotado por algumas prefeituras."
          >
            <input
              type="text"
              value={data.ctiss}
              onChange={(e) => onChange({ ctiss: e.target.value })}
              placeholder="00000000"
              className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] font-mono tracking-[0.02em] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </LabeledField>

          <FormField
            label="CNAE relacionado"
            name="cnaeRelacionado"
            placeholder="7020-4/00"
            value={data.cnaeRelacionado}
            onChange={(e) => onChange({ cnaeRelacionado: e.target.value })}
            hint="Opcional — algumas prefeituras cruzam com o CNAE da empresa."
            className="font-mono tracking-[0.02em]"
          />
        </div>
      </div>
    </div>
  );
}

function ServicoIss({
  data,
  issues,
  onChange,
}: {
  data: ServicoData;
  issues: Issues;
  onChange: (patch: Partial<ServicoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>ISS —{' '}<em className="font-serif italic">imposto sobre serviços</em></>}
        subtitle="Alíquota depende do município e do item da LC 116. Entre 2% e 5%."
      />
      <div className="mt-8 space-y-6">
        <LabeledField
          label="Alíquota ISS (%)"
          error={issues.aliqIss}
          tooltip="Varia por município. Mínimo constitucional é 2%, máximo 5%."
        >
          <NumberInput
            value={data.aliqIss}
            onChange={(v) => onChange({ aliqIss: v })}
            suffix="%"
            mono
          />
        </LabeledField>

        <Toggle
          label="ISS retido pelo tomador"
          hint="Quando marcado, o tomador retém o ISS e repassa pra prefeitura."
          checked={data.issRetido}
          onChange={(v) => onChange({ issRetido: v })}
        />

        <div>
          <SectionLabel>
            Local de incidência
            <InfoTooltip text="Define se o ISS é devido no município do prestador (regra geral) ou no do tomador (lista de exceções do art. 3º da LC 116)." />
          </SectionLabel>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioCard
              name="localIncidencia"
              value="prestador"
              selected={data.localIncidencia === 'prestador'}
              onChange={() => onChange({ localIncidencia: 'prestador' })}
              label="Município do prestador"
              hint="Regra geral. ISS devido onde a empresa está estabelecida."
            />
            <RadioCard
              name="localIncidencia"
              value="tomador"
              selected={data.localIncidencia === 'tomador'}
              onChange={() => onChange({ localIncidencia: 'tomador' })}
              label="Município do tomador"
              hint="Para itens listados no art. 3º da LC 116. Confere a lista."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicoRetencoes({
  data,
  onChange,
}: {
  data: ServicoData;
  onChange: (patch: Partial<ServicoData>) => void;
}) {
  const items: {
    key: keyof Pick<ServicoData, 'retPis' | 'retCofins' | 'retCsll' | 'retIrrf' | 'retInss'>;
    label: string;
    tooltip: string;
  }[] = [
    { key: 'retPis', label: 'PIS', tooltip: 'Retenção de PIS pelo tomador — usual quando é PJ.' },
    { key: 'retCofins', label: 'COFINS', tooltip: 'Retenção de COFINS pelo tomador.' },
    { key: 'retCsll', label: 'CSLL', tooltip: 'Contribuição Social sobre Lucro Líquido retida na fonte.' },
    { key: 'retIrrf', label: 'IRRF', tooltip: 'Imposto de Renda Retido na Fonte.' },
    { key: 'retInss', label: 'INSS', tooltip: 'Retenção previdenciária — comum em serviços listados.' },
  ];

  return (
    <div>
      <TabHeading
        title={<>Retenções na{' '}<em className="font-serif italic">fonte</em></>}
        subtitle="Ligue só o que o tomador realmente retém. A gente calcula na hora de emitir."
      />
      <div className="mt-8 space-y-3">
        {items.map(({ key, label, tooltip }) => {
          const field = data[key];
          return (
            <div
              key={key}
              className="rounded-2xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink)]">
                      {label}
                    </span>
                    <InfoTooltip text={tooltip} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {field.enabled
                      ? 'Ligado — informa a alíquota abaixo.'
                      : 'Desligado.'}
                  </p>
                </div>
                <ToggleSwitch
                  checked={field.enabled}
                  onChange={(v) =>
                    onChange({ [key]: { ...field, enabled: v } } as Partial<ServicoData>)
                  }
                />
              </div>
              {field.enabled && (
                <div className="mt-4 max-w-[200px]">
                  <LabeledField label={`Alíquota ${label} (%)`}>
                    <NumberInput
                      value={field.aliq}
                      onChange={(v) =>
                        onChange({ [key]: { ...field, aliq: v } } as Partial<ServicoData>)
                      }
                      suffix="%"
                      mono
                    />
                  </LabeledField>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Shared IBS/CBS tab ----------

function IbsCbsTab({
  cstIbsCbs,
  cClassTrib,
  issues,
  onChange,
}: {
  cstIbsCbs: string;
  cClassTrib: string;
  issues: Issues;
  onChange: (patch: { cstIbsCbs?: string; cClassTrib?: string }) => void;
}) {
  return (
    <div>
      <TabHeading
        title={<>IBS e{' '}<em className="font-serif italic">CBS</em></>}
        subtitle="Os dois novos tributos da reforma tributária. Obrigatórios desde janeiro de 2026."
      />

      <div
        className="mt-6 rounded-2xl p-5 border"
        style={{
          background: 'var(--blue-soft)',
          borderColor: 'var(--blue)',
        }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.02em]"
          style={{ color: 'var(--blue)' }}
        >
          Reforma tributária
        </div>
        <p className="mt-2 text-sm text-[var(--ink)] leading-relaxed">
          Desde jan/2026 toda nota precisa dos campos de IBS (Imposto sobre Bens
          e Serviços) e CBS (Contribuição sobre Bens e Serviços). Se não souber
          o código, aplica um preset — a gente usa <span className="font-mono tracking-[0.02em]">000</span> como
          default de tributação integral.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <SelectField
          label="CST IBS/CBS"
          value={cstIbsCbs}
          onChange={(e) => onChange({ cstIbsCbs: e.target.value })}
          error={issues.cstIbsCbs}
          tooltip="Código de Situação Tributária do IBS/CBS unificado."
          required
        >
          <option value="">Escolhe o CST</option>
          {cstsIbsCbs.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectField>

        <LabeledField
          label="cClassTrib"
          error={issues.cClassTrib}
          tooltip="Código de Classificação Tributária — 6 dígitos. Define o regime específico (alíquota geral, diferenciada, redução)."
          required
        >
          <input
            type="text"
            inputMode="numeric"
            value={cClassTrib}
            onChange={(e) =>
              onChange({ cClassTrib: e.target.value.replace(/\D/g, '').slice(0, 6) })
            }
            placeholder="000001"
            maxLength={6}
            className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] font-mono tracking-[0.02em] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
          />
        </LabeledField>
      </div>
    </div>
  );
}

// ---------- Presets bar ----------

function PresetsBar({
  tipo,
  onApply,
  onSave,
}: {
  tipo: PresetTipo;
  onApply: (preset: Preset) => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const presets = mockPresets.filter((p) => p.tipo === tipo);

  useEffect(() => {
    if (!open) return;
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

  return (
    <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Passo 02 — Dados do item
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div ref={rootRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="btn-secondary h-10 px-4 rounded-lg font-medium text-sm inline-flex items-center gap-2"
          >
            Usar preset
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
              className={`text-[var(--ink-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
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
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 max-w-[90vw] rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-20">
              {presets.length === 0 ? (
                <div className="p-5 text-sm text-[var(--ink-muted)]">
                  Nenhum preset pra esse tipo ainda.
                </div>
              ) : (
                <ul className="py-1 max-h-[320px] overflow-y-auto">
                  {presets.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onApply(p);
                          setOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--line-soft)] transition-colors"
                      >
                        <div className="text-sm font-medium text-[var(--ink)]">
                          {p.nome}
                        </div>
                        <div className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
                          {p.descricao}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          className="btn-secondary h-10 px-4 rounded-lg font-medium text-sm"
        >
          Salvar como preset
        </button>
      </div>
    </div>
  );
}

// ---------- NCM select ----------

function NcmSelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Ncm[]>(mockNcms);
  const rootRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!open) return;
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

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    setLoading(true);
    const q = query.trim().toLowerCase();
    const timer = setTimeout(() => {
      const hits = !q
        ? mockNcms
        : mockNcms.filter(
            (n) =>
              n.codigo.includes(q.replace(/\D/g, '')) ||
              n.descricao.toLowerCase().includes(q),
          );
      setResults(hits);
      setLoading(false);
    }, query ? 200 : 0);
    return () => clearTimeout(timer);
  }, [query, open]);

  const selected = mockNcms.find((n) => n.codigo === value);

  return (
    <label className="block" ref={rootRef}>
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        NCM
        <span className="text-[var(--warn)]">*</span>
        <InfoTooltip text="Nomenclatura Comum do Mercosul — 8 dígitos que identificam a mercadoria e determinam a tributação." />
      </span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex items-center justify-between gap-3 w-full h-12 px-4 rounded-lg bg-white border text-left transition-colors ${
            error ? 'border-[var(--warn)]' : 'border-[var(--line)] hover:border-[var(--ink)]'
          }`}
        >
          {selected ? (
            <span className="min-w-0 flex items-center gap-2">
              <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink)]">
                {selected.codigo}
              </span>
              <span className="text-sm text-[var(--ink-muted)] truncate">
                — {selected.descricao}
              </span>
            </span>
          ) : value ? (
            <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink)]">
              {value}
            </span>
          ) : (
            <span className="text-sm text-[var(--ink-muted)]">
              Buscar NCM por código ou descrição
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`flex-none text-[var(--ink-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
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
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-20">
            <div className="p-3 border-b border-[var(--line)]">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar código ou descrição"
                className="w-full h-9 px-3 rounded-lg bg-[var(--line-soft)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ink)]"
              />
            </div>
            <ul className="max-h-[280px] overflow-y-auto py-1">
              {loading && (
                <li className="px-4 py-3 text-sm text-[var(--ink-muted)] flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-[var(--line)] border-t-[var(--ink)] animate-spin" />
                  Buscando...
                </li>
              )}
              {!loading && results.length === 0 && (
                <li className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
                  Nada bate com "{query}".
                </li>
              )}
              {!loading &&
                results.map((n) => {
                  const isSel = n.codigo === value;
                  return (
                    <li key={n.codigo}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(n.codigo);
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
                          {n.codigo}
                        </span>
                        <span className="text-sm text-[var(--ink-muted)] truncate">
                          {n.descricao}
                        </span>
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

// ---------- Primitives ----------

function TabStrip<T extends string>({
  tabs,
  activeTab,
  onSelect,
  validity,
  touched,
  saveAttempted,
}: {
  tabs: { key: T; label: string }[];
  activeTab: T;
  onSelect: (k: T) => void;
  validity: Record<T, boolean>;
  touched: Record<T, boolean>;
  saveAttempted: boolean;
}) {
  return (
    <div
      className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--line)]"
      role="tablist"
    >
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
  return <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--line)]" />;
}

function Footer({
  allValid,
  saveAttempted,
  saving,
  onCancel,
  onSave,
  saveLabel,
}: {
  allValid: boolean;
  saveAttempted: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
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
            onClick={onCancel}
            className="btn-secondary h-12 px-6 rounded-lg font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || (saveAttempted && !allValid)}
            className="btn-primary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : saveLabel}
          </button>
        </div>
      </div>
    </footer>
  );
}

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
    <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
      {children}
    </h3>
  );
}

function LabeledField({
  label,
  tooltip,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  tooltip?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
        {required && <span className="text-[var(--warn)]">*</span>}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <div className="mt-2">{children}</div>
      {error ? (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-[var(--ink-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  error,
  tooltip,
  required,
  children,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  tooltip?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <LabeledField label={label} tooltip={tooltip} required={required} error={error}>
      <select
        value={value}
        onChange={onChange}
        className={`block w-full h-12 px-4 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] transition-colors focus:outline-none appearance-none ${
          error ? 'border-[var(--warn)] focus:border-[var(--warn)]' : 'border-[var(--line)] focus:border-[var(--ink)]'
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
    </LabeledField>
  );
}

function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  tooltip,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; description?: string }[];
  placeholder?: string;
  error?: string;
  tooltip?: string;
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
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <label className="block" ref={rootRef}>
      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
        {required && <span className="text-[var(--warn)]">*</span>}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex items-center justify-between gap-3 w-full h-12 px-4 rounded-lg bg-white border text-left transition-colors ${
            error ? 'border-[var(--warn)]' : 'border-[var(--line)] hover:border-[var(--ink)]'
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
            className={`flex-none text-[var(--ink-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
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
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-20">
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
            <ul className="max-h-[280px] overflow-y-auto py-1">
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

function NumberInput({
  value,
  onChange,
  suffix,
  mono,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  mono?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={`block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors ${
          mono ? 'font-mono tracking-[0.02em]' : 'font-sans'
        } ${suffix ? 'pr-10' : ''}`}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--ink-muted)]">
          {suffix}
        </span>
      )}
    </div>
  );
}

function RadioCard({
  name,
  value,
  selected,
  onChange,
  label,
  hint,
}: {
  name: string;
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
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
        className="mt-0.5 w-4 h-4 accent-[var(--ink)]"
      />
      <div>
        <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
        <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">{hint}</p>
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
    <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-[var(--line)] bg-white">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
        {hint && (
          <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">{hint}</p>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
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
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        tabIndex={0}
        aria-label={`Ajuda: ${text}`}
        className="w-4 h-4 rounded-full bg-[var(--line-soft)] text-[var(--ink-muted)] text-[10px] font-semibold flex items-center justify-center hover:bg-[var(--ink)] hover:text-white transition-colors"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-[var(--ink)] text-white text-xs font-sans font-normal normal-case tracking-normal leading-relaxed opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity z-30"
      >
        {text}
      </span>
    </span>
  );
}

// ---------- Toast ----------

function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-[var(--ink)] text-white px-5 py-3 text-sm shadow-lg flex items-center gap-3"
    >
      <span
        className="w-2 h-2 rounded-full bg-[var(--accent)]"
        aria-hidden
      />
      <span>{message}</span>
    </div>
  );
}
