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
import { useCompany } from '../../contexts/CompanyContext';
import { mockNcms, type Ncm } from '../../mocks/ncm';
import {
  createProduto,
  getProduto,
  updateProduto,
  type CreateProdutoPayload,
  type Garantia,
  type Plataforma,
  type ProdutoFisico,
  type TipoItem,
  type UpdateProdutoPayload,
} from '../../api/produtos';
import { HttpError } from '../../lib/http';
import { toast } from '../../components/ui/sonner';

// ---------- Catálogos fixos ----------

const unidades = [
  { value: 'UN', label: 'UN — Unidade' },
  { value: 'CX', label: 'CX — Caixa' },
  { value: 'KG', label: 'KG — Quilograma' },
  { value: 'L', label: 'L — Litro' },
  { value: 'M', label: 'M — Metro' },
  { value: 'M2', label: 'M² — Metro quadrado' },
  { value: 'M3', label: 'M³ — Metro cúbico' },
];

const origens = [
  { value: '0', label: '0 — Nacional' },
  { value: '1', label: '1 — Estrangeira, importação direta' },
  { value: '2', label: '2 — Estrangeira, mercado interno' },
  { value: '3', label: '3 — Nacional, CI > 40%' },
  { value: '4', label: '4 — Nacional, PPB (Lei 8.248/91)' },
  { value: '5', label: '5 — Nacional, CI ≤ 40%' },
  { value: '6', label: '6 — Estrangeira, sem similar nacional (CAMEX)' },
  { value: '7', label: '7 — Estrangeira mercado interno, sem similar (CAMEX)' },
  { value: '8', label: '8 — Nacional, CI > 70%' },
];

const cfops = [
  { value: '5101', label: '5101 — Venda de produção do estabelecimento' },
  { value: '5102', label: '5102 — Venda de mercadoria adquirida de terceiros' },
  { value: '5405', label: '5405 — Venda com ST (substituído)' },
  { value: '5403', label: '5403 — Venda com ST (substituto)' },
  { value: '5933', label: '5933 — Prestação de serviço tributado pelo ISS' },
  { value: '6101', label: '6101 — Venda de produção (outro estado)' },
  { value: '6102', label: '6102 — Venda de mercadoria de terceiros (outro estado)' },
  { value: '6108', label: '6108 — Venda a não contribuinte (outro estado)' },
];

const cstsIcmsCsosn = [
  { value: '00', label: '00 — Tributada integralmente' },
  { value: '10', label: '10 — Tributada com ICMS por ST' },
  { value: '20', label: '20 — Com redução de base de cálculo' },
  { value: '40', label: '40 — Isenta' },
  { value: '41', label: '41 — Não tributada' },
  { value: '60', label: '60 — ICMS cobrado anteriormente por ST' },
  { value: '90', label: '90 — Outras' },
  { value: '101', label: '101 — Simples, com permissão de crédito' },
  { value: '102', label: '102 — Simples, sem permissão de crédito' },
  { value: '103', label: '103 — Isenção do ICMS no Simples' },
  { value: '400', label: '400 — Não tributada pelo Simples' },
  { value: '500', label: '500 — ICMS cobrado anteriormente por ST' },
  { value: '900', label: '900 — Outros' },
];

const cstsIpi = [
  { value: '00', label: '00 — Entrada com recuperação de crédito' },
  { value: '49', label: '49 — Outras entradas' },
  { value: '50', label: '50 — Saída tributada' },
  { value: '51', label: '51 — Saída tributada com alíquota zero' },
  { value: '52', label: '52 — Saída isenta' },
  { value: '53', label: '53 — Saída não tributada' },
  { value: '54', label: '54 — Saída imune' },
  { value: '55', label: '55 — Saída com suspensão' },
  { value: '99', label: '99 — Outras saídas' },
];

const cstsPisCofins = [
  { value: '01', label: '01 — Tributável, alíquota básica' },
  { value: '02', label: '02 — Tributável, alíquota diferenciada' },
  { value: '04', label: '04 — Monofásica, alíquota zero' },
  { value: '06', label: '06 — Alíquota zero' },
  { value: '07', label: '07 — Isenta' },
  { value: '08', label: '08 — Sem incidência' },
  { value: '09', label: '09 — Com suspensão' },
  { value: '49', label: '49 — Outras saídas' },
  { value: '99', label: '99 — Outras operações' },
];

const plataformas: { value: Plataforma; label: string }[] = [
  { value: 'hotmart', label: 'Hotmart' },
  { value: 'eduzz', label: 'Eduzz' },
  { value: 'kiwify', label: 'Kiwify' },
  { value: 'hubla', label: 'Hubla' },
  { value: 'perfectpay', label: 'Perfectpay' },
  { value: 'outra', label: 'Outra' },
];

const garantias: { value: Garantia; label: string }[] = [
  { value: 'sem_garantia', label: 'Sem garantia' },
  { value: 'dias_7', label: '7 dias' },
  { value: 'dias_15', label: '15 dias' },
  { value: 'dias_30', label: '30 dias' },
  { value: 'dias_60', label: '60 dias' },
  { value: 'dias_90', label: '90 dias' },
];

// ---------- Types ----------

type PlataformaValue = Plataforma | '';
type GarantiaValue = Garantia | '';

type CadastroData = {
  codigo: string;
  tipo: TipoItem;
  nome: string;
  status: 'ativo' | 'inativo';
  nomeFiscal: string;
  garantia: GarantiaValue;
  plataforma: PlataformaValue;
};

type TributariosData = {
  cest: string;
  ncm: string;
  unidade: string;
  valor: number;
  cfop: string;
  origem: string;
  descricao: string;
};

type ImpostoData = {
  cstOrCsosn: string;
  cstIpi: string;
  cstPis: string;
  cstCofins: string;
  aliqIcms: number;
  aliqIpi: number;
  aliqPis: number;
  aliqCofins: number;
};

type FormData = {
  cadastro: CadastroData;
  tributarios: TributariosData;
  imposto: ImpostoData;
};

const emptyData: FormData = {
  cadastro: {
    codigo: '',
    tipo: 'produto',
    nome: '',
    status: 'ativo',
    nomeFiscal: '',
    garantia: '',
    plataforma: '',
  },
  tributarios: {
    cest: '',
    ncm: '',
    unidade: '',
    valor: 0,
    cfop: '',
    origem: '',
    descricao: '',
  },
  imposto: {
    cstOrCsosn: '',
    cstIpi: '',
    cstPis: '',
    cstCofins: '',
    aliqIcms: 0,
    aliqIpi: 0,
    aliqPis: 0,
    aliqCofins: 0,
  },
};

// ---------- Schemas ----------

const cadastroSchema = z.object({
  codigo: z.string().trim().min(1, 'Informa o código do produto.'),
  tipo: z.enum(['produto', 'servico'], { message: 'Escolhe o tipo.' }),
  nome: z.string().trim().min(1, 'Nome do produto é obrigatório.'),
  status: z.enum(['ativo', 'inativo']),
  nomeFiscal: z.string().optional(),
  garantia: z
    .enum(['', 'sem_garantia', 'dias_7', 'dias_15', 'dias_30', 'dias_60', 'dias_90'])
    .optional(),
  plataforma: z
    .enum(['', 'hotmart', 'eduzz', 'kiwify', 'hubla', 'perfectpay', 'outra'])
    .optional(),
});

const tributariosSchema = z.object({
  cest: z.string().optional(),
  ncm: z.string().min(1, 'Escolhe o NCM.'),
  unidade: z.string().trim().min(1, 'Escolhe a unidade.'),
  valor: z.number().min(0, 'Preço não pode ser negativo.'),
  cfop: z.string().trim().min(1, 'Escolhe o CFOP.'),
  origem: z.string().trim().min(1, 'Escolhe a origem.'),
  descricao: z.string().optional(),
});

const impostoSchema = z.object({
  cstOrCsosn: z.string().trim().min(1, 'Escolhe o CST/CSOSN.'),
  cstIpi: z.string().trim().min(1, 'Escolhe o CST IPI.'),
  cstPis: z.string().trim().min(1, 'Escolhe o CST PIS.'),
  cstCofins: z.string().trim().min(1, 'Escolhe o CST COFINS.'),
  aliqIcms: z.number().min(0).max(100),
  aliqIpi: z.number().min(0).max(100),
  aliqPis: z.number().min(0).max(100),
  aliqCofins: z.number().min(0).max(100),
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

type TabKey = 'cadastro' | 'tributarios' | 'imposto';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'cadastro', label: 'Cadastro de produtos' },
  { key: 'tributarios', label: 'Dados tributários' },
  { key: 'imposto', label: 'Imposto' },
];

export function Formulario() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { empresaAtiva } = useCompany();
  const isEdit = Boolean(id);

  const [data, setData] = useState<FormData>(emptyData);
  const [activeTab, setActiveTab] = useState<TabKey>('cadastro');
  const [touched, setTouched] = useState<Record<TabKey, boolean>>({
    cadastro: false,
    tributarios: false,
    imposto: false,
  });
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id || !empresaAtiva) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    getProduto(empresaAtiva.id, id)
      .then((produto) => {
        if (cancelled) return;
        if (produto.tipo !== 'produto') {
          // Serviço está desabilitado por enquanto — redireciona.
          setLoadError('Edição de serviço está desabilitada no momento.');
          setLoading(false);
          return;
        }
        const p: ProdutoFisico = produto;
        setData({
          cadastro: {
            codigo: p.codigo,
            tipo: p.tipo,
            nome: p.nome,
            status: p.status,
            nomeFiscal: p.nomeFiscal ?? '',
            garantia: p.garantia ?? '',
            plataforma: p.plataforma ?? '',
          },
          tributarios: {
            cest: p.produtoConfig.cest ?? '',
            ncm: p.produtoConfig.ncm ?? '',
            unidade: p.produtoConfig.unidade,
            valor: p.valor,
            cfop: p.produtoConfig.cfop,
            origem: p.produtoConfig.origem,
            descricao: p.descricao,
          },
          imposto: {
            cstOrCsosn: p.produtoConfig.cstOrCsosn,
            cstIpi: p.produtoConfig.cstIpi,
            cstPis: p.produtoConfig.cstPis,
            cstCofins: p.produtoConfig.cstCofins,
            aliqIcms: p.produtoConfig.aliqIcms,
            aliqIpi: p.produtoConfig.aliqIpi,
            aliqPis: p.produtoConfig.aliqPis,
            aliqCofins: p.produtoConfig.aliqCofins,
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
            err instanceof HttpError
              ? err.message
              : 'Não foi possível carregar o produto.',
          );
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, empresaAtiva]);

  const tabValidity = useMemo<Record<TabKey, boolean>>(
    () => ({
      cadastro: cadastroSchema.safeParse(data.cadastro).success,
      tributarios: tributariosSchema.safeParse(data.tributarios).success,
      imposto: impostoSchema.safeParse(data.imposto).success,
    }),
    [data],
  );

  const tabIssues = useMemo<Record<TabKey, Issues>>(() => {
    const get = <T,>(schema: z.ZodType<T>, value: unknown) => {
      const r = schema.safeParse(value);
      return r.success ? {} : collectIssues(r.error);
    };
    return {
      cadastro: get(cadastroSchema, data.cadastro),
      tributarios: get(tributariosSchema, data.tributarios),
      imposto: get(impostoSchema, data.imposto),
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
    navigate('/produtos');
  }

  async function handleSave() {
    setSaveAttempted(true);
    setTouched({ cadastro: true, tributarios: true, imposto: true });

    if (!empresaAtiva) {
      toast.error('Escolhe uma empresa antes de salvar.');
      return;
    }

    if (!allValid) {
      const firstInvalid = tabs.find((t) => !tabValidity[t.key]);
      if (firstInvalid) setActiveTab(firstInvalid.key);
      toast.error('Preenche as abas com ponto em laranja antes de salvar.');
      return;
    }

    const produtoConfig = {
      unidade: data.tributarios.unidade,
      ncm: data.tributarios.ncm || null,
      cest: data.tributarios.cest.trim() || null,
      origem: data.tributarios.origem,
      cfop: data.tributarios.cfop,
      cstOrCsosn: data.imposto.cstOrCsosn,
      aliqIcms: data.imposto.aliqIcms,
      cstIpi: data.imposto.cstIpi,
      aliqIpi: data.imposto.aliqIpi,
      cstPis: data.imposto.cstPis,
      aliqPis: data.imposto.aliqPis,
      cstCofins: data.imposto.cstCofins,
      aliqCofins: data.imposto.aliqCofins,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        const payload: UpdateProdutoPayload = {
          codigo: data.cadastro.codigo.trim(),
          nome: data.cadastro.nome.trim(),
          nomeFiscal: data.cadastro.nomeFiscal.trim() || null,
          descricao: data.tributarios.descricao,
          valor: data.tributarios.valor,
          status: data.cadastro.status,
          plataforma: data.cadastro.plataforma === '' ? null : data.cadastro.plataforma,
          garantia: data.cadastro.garantia === '' ? null : data.cadastro.garantia,
          produtoConfig,
          servicoConfig: null,
        };
        await updateProduto(empresaAtiva.id, id, payload);
      } else {
        const payload: CreateProdutoPayload = {
          tipo: 'produto',
          codigo: data.cadastro.codigo.trim(),
          nome: data.cadastro.nome.trim(),
          nomeFiscal: data.cadastro.nomeFiscal.trim() || null,
          descricao: data.tributarios.descricao,
          valor: data.tributarios.valor,
          plataforma: data.cadastro.plataforma === '' ? null : data.cadastro.plataforma,
          garantia: data.cadastro.garantia === '' ? null : data.cadastro.garantia,
          produtoConfig,
          servicoConfig: null,
        };
        await createProduto(empresaAtiva.id, payload);
      }
      toast.success(isEdit ? 'Alterações salvas.' : 'Produto criado.');
      navigate('/produtos');
    } catch (err) {
      toast.error(
        err instanceof HttpError
          ? err.message
          : 'Não foi possível salvar o produto. Tenta de novo?',
      );
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (notFound) return <NotFoundState />;
  if (loadError) return <LoadErrorState message={loadError} />;

  const titulo = isEdit
    ? `Editar ${data.cadastro.nome || 'produto'}`
    : 'Novo produto';

  return (
    <div>
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
          <li aria-hidden className="text-[var(--ink-muted)]">
            /
          </li>
          <li className="text-[var(--ink)]">
            {isEdit ? data.cadastro.nome || 'Editar' : 'Novo produto'}
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
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
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
        {activeTab === 'cadastro' && (
          <CadastroTab
            data={data.cadastro}
            issues={touched.cadastro || saveAttempted ? tabIssues.cadastro : {}}
            onChange={(patch) => updateSection('cadastro', patch)}
            isEdit={isEdit}
          />
        )}
        {activeTab === 'tributarios' && (
          <TributariosTab
            data={data.tributarios}
            issues={touched.tributarios || saveAttempted ? tabIssues.tributarios : {}}
            onChange={(patch) => updateSection('tributarios', patch)}
          />
        )}
        {activeTab === 'imposto' && (
          <ImpostoTab
            data={data.imposto}
            issues={touched.imposto || saveAttempted ? tabIssues.imposto : {}}
            onChange={(patch) => updateSection('imposto', patch)}
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

// ---------- Tab 1: Cadastro ----------

function CadastroTab({
  data,
  issues,
  onChange,
  isEdit,
}: {
  data: CadastroData;
  issues: Issues;
  onChange: (patch: Partial<CadastroData>) => void;
  isEdit: boolean;
}) {
  return (
    <div>
      <TabHeading
        title={
          <>
            Cadastro de <em className="font-serif italic">produtos</em>
          </>
        }
        subtitle="Dados que identificam o produto — código interno, nome comercial, nome que sai na nota."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          label="Código do produto"
          name="codigo"
          placeholder="Informe código"
          value={data.codigo}
          onChange={(e) => onChange({ codigo: e.target.value })}
          error={issues.codigo}
          required
        />

        <SelectField
          label="Tipo de emissão"
          name="tipo"
          value={data.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as TipoItem })}
          error={issues.tipo}
          disabled={isEdit}
          hint={
            isEdit
              ? 'O tipo do produto não pode ser alterado depois de criado.'
              : 'Serviço estará disponível em breve.'
          }
        >
          <option value="produto">Produto físico</option>
          <option value="servico" disabled>
            Serviço (em breve)
          </option>
        </SelectField>

        <FormField
          label="Nome do produto"
          name="nome"
          placeholder="Informe o nome do produto"
          value={data.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          error={issues.nome}
          required
        />

        <SelectField
          label="Status do produto"
          name="status"
          value={data.status}
          onChange={(e) => onChange({ status: e.target.value as 'ativo' | 'inativo' })}
          error={issues.status}
        >
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </SelectField>

        <FormField
          label="Nome fiscal"
          name="nomeFiscal"
          placeholder="Nome que sai na nota fiscal"
          value={data.nomeFiscal}
          onChange={(e) => onChange({ nomeFiscal: e.target.value })}
          hint="Opcional. Se vazio, a nota usa o nome do produto."
        />

        <SelectField
          label="Garantia"
          name="garantia"
          value={data.garantia}
          onChange={(e) =>
            onChange({ garantia: e.target.value as GarantiaValue })
          }
        >
          <option value="">Selecione uma opção</option>
          {garantias.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Plataforma"
          name="plataforma"
          value={data.plataforma}
          onChange={(e) =>
            onChange({ plataforma: e.target.value as PlataformaValue })
          }
        >
          <option value="">Selecione uma opção</option>
          {plataformas.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}

// ---------- Tab 2: Dados tributários ----------

function TributariosTab({
  data,
  issues,
  onChange,
}: {
  data: TributariosData;
  issues: Issues;
  onChange: (patch: Partial<TributariosData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={
          <>
            Dados <em className="font-serif italic">tributários</em>
          </>
        }
        subtitle="Classificação fiscal do produto — NCM, CEST, CFOP, origem e unidade."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          label="CEST"
          name="cest"
          placeholder="0000000 (opcional)"
          value={data.cest}
          onChange={(e) => onChange({ cest: e.target.value.replace(/\D/g, '').slice(0, 7) })}
          inputMode="numeric"
          maxLength={7}
          hint="Só obrigatório pra produtos sujeitos a Substituição Tributária."
        />

        <NcmSelect
          value={data.ncm}
          onChange={(v) => onChange({ ncm: v })}
          error={issues.ncm}
        />

        <SelectField
          label="Unidade"
          name="unidade"
          value={data.unidade}
          onChange={(e) => onChange({ unidade: e.target.value })}
          error={issues.unidade}
        >
          <option value="">Selecione uma opção</option>
          {unidades.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </SelectField>

        <NumberInput
          label="Preço"
          name="valor"
          value={data.valor}
          onChange={(v) => onChange({ valor: v })}
          error={issues.valor}
          prefix="R$"
          required
        />

        <SelectField
          label="CFOP"
          name="cfop"
          value={data.cfop}
          onChange={(e) => onChange({ cfop: e.target.value })}
          error={issues.cfop}
        >
          <option value="">Selecione uma opção</option>
          {cfops.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Origem"
          name="origem"
          value={data.origem}
          onChange={(e) => onChange({ origem: e.target.value })}
          error={issues.origem}
        >
          <option value="">Origem da mercadoria ou serviço</option>
          {origens.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <div className="md:col-span-2">
          <TextareaField
            label="Informações complementares de interesse do contribuinte"
            name="descricao"
            rows={4}
            placeholder="Digite aqui"
            value={data.descricao}
            onChange={(e) => onChange({ descricao: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Tab 3: Imposto ----------

function ImpostoTab({
  data,
  issues,
  onChange,
}: {
  data: ImpostoData;
  issues: Issues;
  onChange: (patch: Partial<ImpostoData>) => void;
}) {
  return (
    <div>
      <TabHeading
        title={
          <>
            Cargas de <em className="font-serif italic">imposto</em>
          </>
        }
        subtitle="CSTs e alíquotas por imposto. São os percentuais que vão na nota."
      />

      <div className="mt-8 space-y-8">
        <ImpostoGroup
          titulo="ICMS"
          cstLabel="ICMS CST/CSOSN"
          cstName="cstOrCsosn"
          cstValue={data.cstOrCsosn}
          cstOptions={cstsIcmsCsosn}
          cstError={issues.cstOrCsosn}
          aliqLabel="ICMS"
          aliqValue={data.aliqIcms}
          aliqError={issues.aliqIcms}
          onChange={(patch) => onChange(patch)}
          aliqField="aliqIcms"
          cstField="cstOrCsosn"
        />

        <ImpostoGroup
          titulo="IPI"
          cstLabel="IPI CST"
          cstName="cstIpi"
          cstValue={data.cstIpi}
          cstOptions={cstsIpi}
          cstError={issues.cstIpi}
          aliqLabel="IPI"
          aliqValue={data.aliqIpi}
          aliqError={issues.aliqIpi}
          onChange={(patch) => onChange(patch)}
          aliqField="aliqIpi"
          cstField="cstIpi"
        />

        <ImpostoGroup
          titulo="PIS"
          cstLabel="PIS CST"
          cstName="cstPis"
          cstValue={data.cstPis}
          cstOptions={cstsPisCofins}
          cstError={issues.cstPis}
          aliqLabel="PIS"
          aliqValue={data.aliqPis}
          aliqError={issues.aliqPis}
          onChange={(patch) => onChange(patch)}
          aliqField="aliqPis"
          cstField="cstPis"
        />

        <ImpostoGroup
          titulo="COFINS"
          cstLabel="COFINS CST"
          cstName="cstCofins"
          cstValue={data.cstCofins}
          cstOptions={cstsPisCofins}
          cstError={issues.cstCofins}
          aliqLabel="COFINS"
          aliqValue={data.aliqCofins}
          aliqError={issues.aliqCofins}
          onChange={(patch) => onChange(patch)}
          aliqField="aliqCofins"
          cstField="cstCofins"
        />
      </div>
    </div>
  );
}

function ImpostoGroup({
  titulo,
  cstLabel,
  cstName,
  cstValue,
  cstOptions,
  cstError,
  aliqLabel,
  aliqValue,
  aliqError,
  onChange,
  aliqField,
  cstField,
}: {
  titulo: string;
  cstLabel: string;
  cstName: string;
  cstValue: string;
  cstOptions: { value: string; label: string }[];
  cstError?: string;
  aliqLabel: string;
  aliqValue: number;
  aliqError?: string;
  onChange: (patch: Partial<ImpostoData>) => void;
  aliqField: keyof ImpostoData;
  cstField: keyof ImpostoData;
}) {
  return (
    <div>
      <SectionLabel>{titulo}</SectionLabel>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-5">
        <SelectField
          label={cstLabel}
          name={cstName}
          value={cstValue}
          onChange={(e) => onChange({ [cstField]: e.target.value } as Partial<ImpostoData>)}
          error={cstError}
        >
          <option value="">Selecione uma opção</option>
          {cstOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <NumberInput
          label={aliqLabel}
          name={aliqField}
          value={aliqValue}
          onChange={(v) =>
            onChange({ [aliqField]: v } as Partial<ImpostoData>)
          }
          error={aliqError}
          suffix="%"
          placeholder={`Informe percentual ${aliqLabel}`}
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
  disabled,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
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
        disabled={disabled}
        className={`mt-2 block w-full h-12 px-4 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] transition-colors focus:outline-none appearance-none disabled:bg-[var(--line-soft)] disabled:text-[var(--ink-muted)] disabled:cursor-not-allowed ${
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

function NumberInput({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  prefix,
  suffix,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
        {required && <span className="text-[var(--warn)]"> *</span>}
      </span>
      <div
        className={`mt-2 flex items-center gap-2 h-12 px-4 rounded-lg bg-white border font-sans text-sm transition-colors focus-within:outline-none ${
          error
            ? 'border-[var(--warn)] focus-within:border-[var(--warn)]'
            : 'border-[var(--line)] focus-within:border-[var(--ink)]'
        }`}
      >
        {prefix && (
          <span className="font-mono text-xs text-[var(--ink-muted)] flex-none">
            {prefix}
          </span>
        )}
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const v = e.target.value === '' ? 0 : Number(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
        />
        {suffix && (
          <span className="font-mono text-xs text-[var(--ink-muted)] flex-none">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-[var(--ink-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------- NcmSelect ----------

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
    <div>
      <label className="block" ref={rootRef}>
        <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          NCM
          <span className="text-[var(--warn)]"> *</span>
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
                Selecione uma opção
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
        {error && <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>}
      </label>
      <a
        href="https://portalunico.siscomex.gov.br/classif/#/"
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1 inline-block text-xs text-[var(--blue)] hover:underline"
      >
        Consultar NCM
      </a>
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
      <h2 className="text-2xl font-semibold text-[var(--ink)]">Produto não encontrado.</h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        O link pode estar quebrado ou o produto foi removido.
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
      <h2 className="text-xl font-semibold" style={{ color: 'var(--color-err-fg, #DC2626)' }}>
        Não foi possível abrir o produto.
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
