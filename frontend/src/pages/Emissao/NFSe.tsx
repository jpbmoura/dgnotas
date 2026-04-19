import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import { formatCEP, type Company } from '../../api/empresas';
import { mockItens } from '../../mocks/itens';
import { getItemDetalhes, type ItemDetalhes } from '../../mocks/itemDetalhes';
import { mockTomadores, type Tomador, type TomadorTipo } from '../../mocks/tomadores';

// ---------- Helpers ----------

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
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

function genId() {
  return `srv_${Math.random().toString(36).slice(2, 9)}`;
}

function randomNotaNumero() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `002.${n}`;
}

// ---------- Types ----------

type ServicoItem = {
  uid: string;
  servicoId: string | null; // null = serviço avulso
  nome: string;
  quantidade: number;
  valorUnitario: number;
};

type FormData = {
  tomador: Tomador | null;
  servicos: ServicoItem[];
  discriminacao: string;
  desconto: number;
  impostoManual: boolean;
  aliqIss: number;
  issRetido: boolean;
  retPis: number;
  retCofins: number;
  retCsll: number;
  retIrrf: number;
  retInss: number;
  observacoes: string;
};

const emptyData: FormData = {
  tomador: null,
  servicos: [
    { uid: genId(), servicoId: null, nome: '', quantidade: 1, valorUnitario: 0 },
  ],
  discriminacao: '',
  desconto: 0,
  impostoManual: false,
  aliqIss: 0,
  issRetido: false,
  retPis: 0,
  retCofins: 0,
  retCsll: 0,
  retIrrf: 0,
  retInss: 0,
  observacoes: '',
};

type EmissaoStage = 'sending' | 'processing' | 'authorized' | 'rejected';

type EmissaoResult =
  | { stage: 'authorized'; numero: string }
  | { stage: 'rejected'; codigo: string; motivo: string };

// Serviços cadastrados ativos (do mock de itens).
const servicosCadastrados = mockItens.filter(
  (i) => i.tipo === 'servico' && i.status === 'ativo',
);

// ---------- Page ----------

export function NFSe() {
  const navigate = useNavigate();
  const { empresaAtiva } = useCompany();

  const [data, setData] = useState<FormData>(emptyData);
  const [tomadoresExtra, setTomadoresExtra] = useState<Tomador[]>([]);
  const [emissao, setEmissao] = useState<null | {
    stage: EmissaoStage;
    result: EmissaoResult | null;
  }>(null);
  const [draftToast, setDraftToast] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) =>
      setData((d) => ({ ...d, [key]: value })),
    [],
  );

  // ---------- Derived ----------

  const subtotal = useMemo(
    () =>
      data.servicos.reduce(
        (acc, s) => acc + s.quantidade * s.valorUnitario,
        0,
      ),
    [data.servicos],
  );
  const total = Math.max(0, subtotal - data.desconto);

  // Serviço primário pra defaults de imposto.
  const primaryService = useMemo<ItemDetalhes | null>(() => {
    const first = data.servicos.find((s) => s.servicoId);
    if (!first?.servicoId) return null;
    return getItemDetalhes(first.servicoId);
  }, [data.servicos]);

  // Aplica defaults de imposto quando o primeiro serviço muda e o usuário não
  // ativou edição manual.
  useEffect(() => {
    if (data.impostoManual) return;
    if (!primaryService) return;
    setData((d) => ({
      ...d,
      aliqIss: primaryService.aliqIss,
      issRetido: primaryService.issRetido,
      retPis: primaryService.retPis.enabled ? primaryService.retPis.aliq : 0,
      retCofins: primaryService.retCofins.enabled ? primaryService.retCofins.aliq : 0,
      retCsll: primaryService.retCsll.enabled ? primaryService.retCsll.aliq : 0,
      retIrrf: primaryService.retIrrf.enabled ? primaryService.retIrrf.aliq : 0,
      retInss: primaryService.retInss.enabled ? primaryService.retInss.aliq : 0,
    }));
  }, [primaryService, data.impostoManual]);

  const valorIss = (total * data.aliqIss) / 100;
  const retencoes = useMemo(
    () => ({
      pis: (total * data.retPis) / 100,
      cofins: (total * data.retCofins) / 100,
      csll: (total * data.retCsll) / 100,
      irrf: (total * data.retIrrf) / 100,
      inss: (total * data.retInss) / 100,
    }),
    [total, data.retPis, data.retCofins, data.retCsll, data.retIrrf, data.retInss],
  );
  const retidoTotal =
    retencoes.pis + retencoes.cofins + retencoes.csll + retencoes.irrf + retencoes.inss;
  const liquido = total - retidoTotal - (data.issRetido ? valorIss : 0);

  // Warn quando imposto manual difere do padrão do serviço.
  const imposteDiverge = useMemo(() => {
    if (!data.impostoManual || !primaryService) return false;
    return data.aliqIss !== primaryService.aliqIss;
  }, [data.impostoManual, data.aliqIss, primaryService]);

  // ---------- Validation ----------

  const tomadorOk = Boolean(data.tomador);
  const servicosOk =
    data.servicos.length > 0 &&
    data.servicos.every(
      (s) => s.nome.trim().length > 0 && s.quantidade > 0 && s.valorUnitario > 0,
    );
  const discriminacaoOk = data.discriminacao.trim().length >= 15;
  const totalOk = subtotal > 0 && total > 0;

  const allValid = tomadorOk && servicosOk && discriminacaoOk && totalOk;

  // ---------- Actions ----------

  const saveRascunho = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('Salvando rascunho', data);
    setDraftToast('Rascunho salvo.');
  }, [data]);

  const emitir = useCallback(() => {
    if (!allValid) return;
    setEmissao({ stage: 'sending', result: null });
    setTimeout(() => {
      setEmissao({ stage: 'processing', result: null });
      setTimeout(() => {
        const rejected = Math.random() < 0.1;
        if (rejected) {
          setEmissao({
            stage: 'rejected',
            result: {
              stage: 'rejected',
              codigo: 'E-521',
              motivo:
                'A prefeitura respondeu que o código de serviço não bate com o CNAE da empresa. Revisa o item.',
            },
          });
        } else {
          setEmissao({
            stage: 'authorized',
            result: { stage: 'authorized', numero: randomNotaNumero() },
          });
        }
      }, 2000);
    }, 1000);
  }, [allValid]);

  // Atalhos de teclado.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRascunho();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (allValid && !emissao) emitir();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allValid, emissao, saveRascunho, emitir]);

  // ---------- Render ----------

  return (
    <div className="pb-28">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.02em]">
          <li>
            <Link
              to="/notas"
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              Notas
            </Link>
          </li>
          <li aria-hidden className="text-[var(--ink-muted)]">/</li>
          <li className="text-[var(--ink)]">Emitir NFS-e</li>
        </ol>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Nova nota fiscal de serviço
          </span>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
            Emitir <em className="font-serif italic">NFS-e</em>
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
            Preenche os dados à esquerda, confere o preview à direita. Quando
            estiver pronta, clica em Emitir — a gente manda pra prefeitura em
            segundos.
          </p>
        </div>
        <ShortcutsHint />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Section step="01" title="Tomador">
            <TomadorSection
              tomador={data.tomador}
              onChange={(t) => update('tomador', t)}
              extra={tomadoresExtra}
              onAddExtra={(t) => {
                setTomadoresExtra((list) => [...list, t]);
                update('tomador', t);
              }}
              invalid={!tomadorOk}
            />
          </Section>

          <Section step="02" title="Serviços prestados">
            <ServicosSection
              servicos={data.servicos}
              onChange={(ss) => update('servicos', ss)}
              desconto={data.desconto}
              onDescontoChange={(v) => update('desconto', v)}
              subtotal={subtotal}
              total={total}
              invalid={!servicosOk}
            />
          </Section>

          <Section step="03" title="Discriminação">
            <DiscriminacaoSection
              value={data.discriminacao}
              onChange={(v) => update('discriminacao', v)}
              servicos={data.servicos}
              invalid={!discriminacaoOk}
            />
          </Section>

          <Section step="04" title="Impostos">
            <ImpostosSection
              data={data}
              update={update}
              subtotal={subtotal}
              total={total}
              valorIss={valorIss}
              retencoes={retencoes}
              retidoTotal={retidoTotal}
              liquido={liquido}
              diverge={imposteDiverge}
              primary={primaryService}
            />
          </Section>

          <Section step="05" title="Observações" hint="Opcional">
            <ObservacoesSection
              value={data.observacoes}
              onChange={(v) => update('observacoes', v)}
            />
          </Section>
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <Preview
              prestador={empresaAtiva ?? null}
              data={data}
              subtotal={subtotal}
              total={total}
              valorIss={valorIss}
              retencoes={retencoes}
              retidoTotal={retidoTotal}
              liquido={liquido}
            />
          </div>
        </aside>
      </div>

      <StickyFooter
        allValid={allValid}
        onSaveRascunho={saveRascunho}
        onEmitir={emitir}
        saving={Boolean(emissao)}
      />

      {emissao && (
        <EmissaoModal
          stage={emissao.stage}
          result={emissao.result}
          onClose={() => setEmissao(null)}
          onRetry={() => {
            setEmissao(null);
            setTimeout(emitir, 50);
          }}
          onEdit={() => setEmissao(null)}
          onSeeLista={() => navigate('/notas')}
        />
      )}

      <ToastHost message={draftToast} onDismiss={() => setDraftToast(null)} />
    </div>
  );
}

export default NFSe;

// ---------- Section wrapper ----------

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-6 md:p-8">
      <header className="mb-5 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            {step}
          </span>
          <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
        </div>
        {hint && (
          <span className="text-xs text-[var(--ink-muted)]">{hint}</span>
        )}
      </header>
      {children}
    </section>
  );
}

// ---------- Shortcuts hint ----------

function ShortcutsHint() {
  return (
    <div className="hidden sm:flex flex-col items-end gap-1 text-right">
      <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        Atalhos
      </span>
      <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
        <Kbd>Ctrl</Kbd>
        <Kbd>S</Kbd>
        <span>rascunho</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
        <Kbd>Ctrl</Kbd>
        <Kbd>Enter</Kbd>
        <span>emitir</span>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-[var(--line)] bg-white font-mono text-[10px] tracking-[0.02em] text-[var(--ink)]">
      {children}
    </span>
  );
}

// ---------- Tomador ----------

function TomadorSection({
  tomador,
  onChange,
  extra,
  onAddExtra,
  invalid,
}: {
  tomador: Tomador | null;
  onChange: (t: Tomador | null) => void;
  extra: Tomador[];
  onAddExtra: (t: Tomador) => void;
  invalid: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => [...extra, ...mockTomadores], [extra]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 8);
    const digits = q.replace(/\D/g, '');
    return all.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) ||
        (digits.length > 0 && t.documento.replace(/\D/g, '').includes(digits)) ||
        t.email.toLowerCase().includes(q),
    );
  }, [query, all]);

  if (tomador) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--line-soft)]/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <TomadorTipoBadge tipo={tomador.tipo} />
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
                {tomador.tipo === 'pf' ? 'CPF' : 'CNPJ'}
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tracking-[0.02em]">
                {tomador.documento}
              </span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">
              {tomador.nome}
            </h3>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              {tomador.email}
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-2">
              {tomador.endereco}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="btn-secondary h-9 px-4 rounded-lg font-medium text-xs"
          >
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Buscar tomador
            <span className="text-[var(--warn)]"> *</span>
          </span>
          <div className="relative mt-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10.5 10.5l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder="Nome, CPF ou CNPJ"
              className={`w-full h-12 pl-11 pr-4 rounded-lg bg-white border text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none transition-colors ${
                invalid ? 'border-[var(--warn)] focus:border-[var(--warn)]' : 'border-[var(--line)] focus:border-[var(--ink)]'
              }`}
            />
          </div>
        </label>

        {open && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-20">
            <ul className="max-h-[280px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
                  Ninguém com "{query}".
                </li>
              ) : (
                filtered.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(t);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-[var(--line-soft)] transition-colors"
                    >
                      <TomadorTipoBadge tipo={t.tipo} compact />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--ink)] truncate">
                          {t.nome}
                        </div>
                        <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] truncate">
                          {t.documento} · {t.email}
                        </div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModal(true);
                }}
                className="w-full px-4 py-3 flex items-center gap-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center text-base leading-none">
                  +
                </span>
                Cadastrar novo tomador
              </button>
            </div>
          </div>
        )}
      </div>
      {invalid && (
        <p className="mt-2 text-xs text-[var(--warn)]">
          Escolhe o tomador pra continuar.
        </p>
      )}

      {modal && (
        <NewTomadorModal
          initialQuery={query}
          onClose={() => setModal(false)}
          onCreate={(t) => {
            onAddExtra(t);
            setModal(false);
            setQuery('');
          }}
        />
      )}
    </>
  );
}

function TomadorTipoBadge({
  tipo,
  compact,
}: {
  tipo: TomadorTipo;
  compact?: boolean;
}) {
  const label = tipo === 'pf' ? 'PF' : 'PJ';
  return (
    <span
      className={`badge ${
        compact
          ? 'bg-[var(--line-soft)] text-[var(--ink)]'
          : 'bg-[var(--blue-soft)] text-[var(--blue)]'
      }`}
    >
      {label}
    </span>
  );
}

function NewTomadorModal({
  initialQuery,
  onClose,
  onCreate,
}: {
  initialQuery: string;
  onClose: () => void;
  onCreate: (t: Tomador) => void;
}) {
  const [tipo, setTipo] = useState<TomadorTipo>(
    onlyDigits(initialQuery).length === 11 ? 'pf' : 'pj',
  );
  const [nome, setNome] = useState(
    onlyDigits(initialQuery).length === 0 ? initialQuery : '',
  );
  const [documento, setDocumento] = useState(
    onlyDigits(initialQuery).length > 0 ? initialQuery : '',
  );
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const expectedLen = tipo === 'pf' ? 11 : 14;
    if (onlyDigits(documento).length !== expectedLen) {
      setError(
        tipo === 'pf'
          ? 'CPF precisa de 11 dígitos.'
          : 'CNPJ precisa de 14 dígitos.',
      );
      return;
    }
    if (!nome.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    onCreate({
      id: `tom_${Math.random().toString(36).slice(2, 9)}`,
      tipo,
      nome: nome.trim(),
      documento: tipo === 'pf' ? formatCPF(documento) : formatCNPJ(documento),
      email: email.trim(),
      endereco: endereco.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--ink)]/40">
      <div className="card w-full max-w-lg p-6 md:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Novo tomador
            </span>
            <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">
              Quem é <em className="font-serif italic">o cliente</em>?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Tipo
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TipoToggle
                active={tipo === 'pf'}
                onClick={() => setTipo('pf')}
                label="Pessoa física"
              />
              <TipoToggle
                active={tipo === 'pj'}
                onClick={() => setTipo('pj')}
                label="Pessoa jurídica"
              />
            </div>
          </div>

          <FieldRow label={tipo === 'pf' ? 'Nome completo' : 'Razão social'} required>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipo === 'pf' ? 'Marina Couto' : 'Acme Educação LTDA'}
              className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
              autoFocus
            />
          </FieldRow>

          <FieldRow label={tipo === 'pf' ? 'CPF' : 'CNPJ'} required>
            <input
              type="text"
              inputMode="numeric"
              value={documento}
              onChange={(e) =>
                setDocumento(
                  tipo === 'pf'
                    ? formatCPF(e.target.value)
                    : formatCNPJ(e.target.value),
                )
              }
              placeholder={tipo === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
              className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] font-mono tracking-[0.02em] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </FieldRow>

          <FieldRow label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com.br"
              className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </FieldRow>

          <FieldRow label="Endereço">
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade/UF"
              className="block w-full h-12 px-4 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </FieldRow>

          {error && (
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{
                background: 'var(--color-err-bg, #FEE2E2)',
                color: 'var(--color-err-fg, #DC2626)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary h-10 px-5 rounded-lg font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary h-10 px-5 rounded-lg font-medium text-sm"
            >
              Cadastrar e usar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TipoToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
          : 'bg-white text-[var(--ink-muted)] border-[var(--line)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
        {required && <span className="text-[var(--warn)]"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

// ---------- Serviços ----------

function ServicosSection({
  servicos,
  onChange,
  desconto,
  onDescontoChange,
  subtotal,
  total,
  invalid,
}: {
  servicos: ServicoItem[];
  onChange: (list: ServicoItem[]) => void;
  desconto: number;
  onDescontoChange: (v: number) => void;
  subtotal: number;
  total: number;
  invalid: boolean;
}) {
  function addLine() {
    onChange([
      ...servicos,
      { uid: genId(), servicoId: null, nome: '', quantidade: 1, valorUnitario: 0 },
    ]);
  }

  function updateLine(uid: string, patch: Partial<ServicoItem>) {
    onChange(servicos.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
  }

  function removeLine(uid: string) {
    onChange(servicos.filter((s) => s.uid !== uid));
  }

  return (
    <div>
      <div className="space-y-3">
        {servicos.map((s, i) => (
          <ServicoRow
            key={s.uid}
            index={i}
            item={s}
            canRemove={servicos.length > 1}
            onChange={(patch) => updateLine(s.uid, patch)}
            onRemove={() => removeLine(s.uid)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-dashed border-[var(--line)] text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
      >
        <span className="w-4 h-4 rounded-full bg-[var(--line-soft)] text-[var(--ink)] flex items-center justify-center text-xs">
          +
        </span>
        Adicionar serviço
      </button>

      {invalid && (
        <p className="mt-3 text-xs text-[var(--warn)]">
          Precisa de pelo menos um serviço com quantidade e valor maiores que zero.
        </p>
      )}

      <div className="mt-6 border-t border-[var(--line-soft)] pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
          <label className="block max-w-[240px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Desconto (R$)
            </span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={desconto || ''}
              onChange={(e) => onDescontoChange(Number(e.target.value) || 0)}
              placeholder="0,00"
              className="mt-2 block w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono tracking-tight text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </label>

          <div className="sm:text-right">
            <div className="text-xs text-[var(--ink-muted)]">
              Subtotal{' '}
              <span className="font-mono text-[var(--ink)] tracking-tight">
                {brl.format(subtotal)}
              </span>
            </div>
            {desconto > 0 && (
              <div
                className="text-xs"
                style={{ color: 'var(--color-err-fg, #DC2626)' }}
              >
                − {brl.format(desconto)}
              </div>
            )}
            <div className="mt-2 flex items-baseline sm:justify-end gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
                Total da nota
              </span>
              <span className="font-mono text-xl font-semibold text-[var(--ink)] tracking-tight">
                {brl.format(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicoRow({
  index,
  item,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  item: ServicoItem;
  canRemove: boolean;
  onChange: (patch: Partial<ServicoItem>) => void;
  onRemove: () => void;
}) {
  const lineTotal = item.quantidade * item.valorUnitario;

  function pickServico(servicoId: string | null) {
    if (!servicoId) {
      onChange({ servicoId: null, nome: '', valorUnitario: 0 });
      return;
    }
    const s = mockItens.find((x) => x.id === servicoId);
    if (!s) return;
    onChange({
      servicoId,
      nome: s.nome,
      valorUnitario: s.valor,
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Item {String(index + 1).padStart(2, '0')}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover serviço"
            className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Remover
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-12">
          <ServicoPicker
            value={item.servicoId}
            onChange={pickServico}
          />
        </div>

        <div className="md:col-span-6">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Nome / descrição curta
            </span>
            <input
              type="text"
              value={item.nome}
              onChange={(e) => onChange({ nome: e.target.value })}
              placeholder={
                item.servicoId ? 'Nome do serviço' : 'Ex.: Consultoria de 1 hora'
              }
              className="mt-2 block w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Qtd.
            </span>
            <input
              type="number"
              min={0}
              step="1"
              value={item.quantidade || ''}
              onChange={(e) => onChange({ quantidade: Number(e.target.value) || 0 })}
              className="mt-2 block w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono tracking-tight text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Unit. (R$)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.valorUnitario || ''}
              onChange={(e) =>
                onChange({ valorUnitario: Number(e.target.value) || 0 })
              }
              className="mt-2 block w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono tracking-tight text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
            />
          </label>
        </div>

        <div className="md:col-span-2">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Total
            </span>
            <div className="mt-2 h-10 px-3 rounded-lg bg-[var(--line-soft)]/40 flex items-center justify-end font-mono tracking-tight text-sm text-[var(--ink)]">
              {brl.format(lineTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicoPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (servicoId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = servicosCadastrados.find((s) => s.id === value) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servicosCadastrados;
    return servicosCadastrados.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) ||
        s.codigo.toLowerCase().includes(q) ||
        (s.lc116 ?? '').includes(q),
    );
  }, [query]);

  return (
    <label ref={rootRef} className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        Serviço
      </span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center justify-between gap-3 w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] hover:border-[var(--ink)] text-left transition-colors"
        >
          {selected ? (
            <span className="min-w-0 flex items-center gap-2">
              <span className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink)]">
                {selected.codigo}
              </span>
              <span className="text-sm text-[var(--ink-muted)] truncate">
                — {selected.nome}
              </span>
            </span>
          ) : value === null ? (
            <span className="text-sm text-[var(--ink-muted)]">
              Escolher serviço cadastrado ou usar avulso
            </span>
          ) : (
            <span className="text-sm text-[var(--ink)]">Serviço avulso</span>
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
            <ul className="max-h-[260px] overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--line-soft)] transition-colors ${
                    value === null ? 'bg-[var(--accent-soft)]' : ''
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--line-soft)] text-[var(--ink)] flex items-center justify-center text-xs">
                    +
                  </span>
                  <span className="text-sm font-medium text-[var(--ink)]">
                    Serviço avulso
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    — digita nome e valor à mão
                  </span>
                </button>
              </li>
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
                  Nada bate com "{query}".
                </li>
              ) : (
                filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(s.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--line-soft)] transition-colors ${
                        s.id === value ? 'bg-[var(--accent-soft)]' : ''
                      }`}
                    >
                      <span className="font-mono text-[11px] tracking-[0.02em] flex-none text-[var(--ink)]">
                        {s.codigo}
                      </span>
                      <span className="text-sm text-[var(--ink)] truncate flex-1">
                        {s.nome}
                      </span>
                      <span className="font-mono text-xs tracking-tight text-[var(--ink-muted)]">
                        {brl.format(s.valor)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </label>
  );
}

// ---------- Discriminação ----------

function DiscriminacaoSection({
  value,
  onChange,
  servicos,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  servicos: ServicoItem[];
  invalid: boolean;
}) {
  const MAX = 1000;
  const count = value.length;

  const servicosDescritos = servicos.filter((s) => s.servicoId);
  const podeAutoPreencher = servicosDescritos.length > 0;

  function usarDescricaoPadrao() {
    const linhas = servicosDescritos
      .map((s) => {
        const d = getItemDetalhes(s.servicoId!);
        return d?.descricao?.trim() || s.nome.trim();
      })
      .filter(Boolean);
    onChange(linhas.join('\n\n'));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Texto que vai na nota — mínimo 15 caracteres
        </span>
        {podeAutoPreencher && (
          <button
            type="button"
            onClick={usarDescricaoPadrao}
            className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
          >
            Usar descrição padrão do serviço
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX))}
        placeholder="Descreve o que foi prestado. Ex.: Consultoria em marketing digital no período de XX/XX a YY/YY, referente a estratégia de conteúdo para Instagram."
        rows={5}
        className={`block w-full px-4 py-3 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none transition-colors resize-y ${
          invalid
            ? 'border-[var(--warn)] focus:border-[var(--warn)]'
            : 'border-[var(--line)] focus:border-[var(--ink)]'
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          className={`text-xs ${
            invalid ? 'text-[var(--warn)]' : 'text-[var(--ink-muted)]'
          }`}
        >
          {invalid
            ? `Faltam ${Math.max(0, 15 - count)} caracteres.`
            : 'Pode ir até 1000 caracteres.'}
        </span>
        <span className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)]">
          {count}/{MAX}
        </span>
      </div>
    </div>
  );
}

// ---------- Impostos ----------

function ImpostosSection({
  data,
  update,
  subtotal: _subtotal,
  total,
  valorIss,
  retencoes,
  retidoTotal,
  liquido,
  diverge,
  primary,
}: {
  data: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  subtotal: number;
  total: number;
  valorIss: number;
  retencoes: {
    pis: number; cofins: number; csll: number; irrf: number; inss: number;
  };
  retidoTotal: number;
  liquido: number;
  diverge: boolean;
  primary: ItemDetalhes | null;
}) {
  const { impostoManual } = data;

  return (
    <div className="space-y-5">
      {!primary && data.servicos.every((s) => s.servicoId === null) && (
        <InfoBanner tone="info">
          Serviços avulsos não têm tributação padrão configurada — edita
          manualmente abaixo.
        </InfoBanner>
      )}

      {diverge && (
        <InfoBanner tone="warn">
          Alíquota de ISS diferente do padrão cadastrado
          <span className="font-mono tracking-[0.02em]"> ({primary?.aliqIss}%)</span>.
          Confere se é intencional.
        </InfoBanner>
      )}

      <div className="rounded-2xl border border-[var(--line)] overflow-hidden">
        <div className="px-5 py-4 bg-[var(--line-soft)]/40 border-b border-[var(--line)] flex items-center justify-between gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Cálculo automático
          </span>
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <span className="text-xs text-[var(--ink)] font-medium">
              Editar impostos manualmente
            </span>
            <ToggleSwitch
              checked={impostoManual}
              onChange={(v) => update('impostoManual', v)}
            />
          </label>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <ImpostoRow
            label="Alíquota ISS"
            valueText={`${brlCompact.format(data.aliqIss)}%`}
            editing={impostoManual}
            numberValue={data.aliqIss}
            onNumberChange={(v) => update('aliqIss', v)}
            suffix="%"
          />
          <ImpostoRow
            label="Valor ISS"
            valueText={brl.format(valorIss)}
            hint={`${total > 0 ? brlCompact.format((valorIss / total) * 100) : '0,00'}% do total`}
          />

          <RetencaoInput
            label="PIS retido"
            enabled={data.retPis > 0}
            aliq={data.retPis}
            valor={retencoes.pis}
            editing={impostoManual}
            onChange={(v) => update('retPis', v)}
          />
          <RetencaoInput
            label="COFINS retido"
            enabled={data.retCofins > 0}
            aliq={data.retCofins}
            valor={retencoes.cofins}
            editing={impostoManual}
            onChange={(v) => update('retCofins', v)}
          />
          <RetencaoInput
            label="CSLL retido"
            enabled={data.retCsll > 0}
            aliq={data.retCsll}
            valor={retencoes.csll}
            editing={impostoManual}
            onChange={(v) => update('retCsll', v)}
          />
          <RetencaoInput
            label="IRRF retido"
            enabled={data.retIrrf > 0}
            aliq={data.retIrrf}
            valor={retencoes.irrf}
            editing={impostoManual}
            onChange={(v) => update('retIrrf', v)}
          />
          <RetencaoInput
            label="INSS retido"
            enabled={data.retInss > 0}
            aliq={data.retInss}
            valor={retencoes.inss}
            editing={impostoManual}
            onChange={(v) => update('retInss', v)}
          />

          <div className="md:col-span-2 border-t border-[var(--line-soft)] pt-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.issRetido}
                onChange={(e) => update('issRetido', e.target.checked)}
                disabled={!impostoManual}
                className="w-4 h-4 accent-[var(--ink)] disabled:opacity-60"
              />
              <span
                className={`text-xs ${
                  impostoManual ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
                }`}
              >
                ISS retido pelo tomador
              </span>
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--line)] bg-[var(--line-soft)]/30 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Líquido a receber
            </div>
            <div className="font-mono text-2xl font-semibold text-[var(--ink)] tracking-tight">
              {brl.format(Math.max(0, liquido))}
            </div>
          </div>
          <div className="text-right text-xs text-[var(--ink-muted)]">
            Total {brl.format(total)}
            <br />− Retenções {brl.format(retidoTotal)}
            {data.issRetido && (
              <>
                <br />− ISS retido {brl.format(valorIss)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpostoRow({
  label,
  valueText,
  hint,
  editing,
  numberValue,
  onNumberChange,
  suffix,
}: {
  label: string;
  valueText: string;
  hint?: string;
  editing?: boolean;
  numberValue?: number;
  onNumberChange?: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </div>
      {editing && onNumberChange ? (
        <div className="mt-2 relative max-w-[160px]">
          <input
            type="number"
            step="0.01"
            min={0}
            value={numberValue ?? 0}
            onChange={(e) => onNumberChange(Number(e.target.value) || 0)}
            className="block w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono tracking-tight text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors pr-10"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--ink-muted)]">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-1 font-mono tracking-tight text-sm text-[var(--ink)]">
          {valueText}
        </div>
      )}
      {hint && (
        <div className="mt-1 text-[11px] text-[var(--ink-muted)]">{hint}</div>
      )}
    </div>
  );
}

function RetencaoInput({
  label,
  enabled,
  aliq,
  valor,
  editing,
  onChange,
}: {
  label: string;
  enabled: boolean;
  aliq: number;
  valor: number;
  editing: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          {label}
        </div>
        {editing ? (
          <div className="mt-2 relative max-w-[140px]">
            <input
              type="number"
              step="0.01"
              min={0}
              value={aliq}
              onChange={(e) => onChange(Number(e.target.value) || 0)}
              className="block w-full h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono tracking-tight text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--ink-muted)]">
              %
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            {enabled ? (
              <span className="font-mono tracking-tight text-sm text-[var(--ink)]">
                {brlCompact.format(aliq)}%
              </span>
            ) : (
              <span className="text-sm text-[var(--ink-muted)]">Off</span>
            )}
            {enabled && (
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                {brl.format(valor)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBanner({
  tone,
  children,
}: {
  tone: 'info' | 'warn';
  children: ReactNode;
}) {
  const styles =
    tone === 'warn'
      ? {
          background: 'var(--color-warn-bg, #FEF3C7)',
          color: 'var(--color-warn-fg, #92400E)',
          borderColor: 'var(--color-warn-fg, #92400E)',
        }
      : {
          background: 'var(--blue-soft)',
          color: 'var(--blue)',
          borderColor: 'var(--blue)',
        };
  return (
    <div
      className="rounded-2xl border p-4 text-sm leading-relaxed"
      style={styles}
    >
      {children}
    </div>
  );
}

// ---------- Observações ----------

function ObservacoesSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const MAX = 500;
  return (
    <div>
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value.slice(0, MAX))
        }
        placeholder="Qualquer informação adicional que precise aparecer na nota."
        rows={3}
        className="block w-full px-4 py-3 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors resize-y"
      />
      <div className="mt-2 flex items-center justify-end">
        <span className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)]">
          {value.length}/{MAX}
        </span>
      </div>
    </div>
  );
}

// ---------- Preview ----------

function Preview({
  prestador,
  data,
  subtotal,
  total,
  valorIss,
  retencoes,
  retidoTotal,
  liquido,
}: {
  prestador: Company | null;
  data: FormData;
  subtotal: number;
  total: number;
  valorIss: number;
  retencoes: {
    pis: number; cofins: number; csll: number; irrf: number; inss: number;
  };
  retidoTotal: number;
  liquido: number;
}) {
  const retencoesList: [string, number][] = [
    ['PIS', retencoes.pis],
    ['COFINS', retencoes.cofins],
    ['CSLL', retencoes.csll],
    ['IRRF', retencoes.irrf],
    ['INSS', retencoes.inss],
  ];

  return (
    <div className="card p-0 overflow-hidden">
      <div
        className="px-4 py-3 flex items-center gap-2 text-xs font-medium"
        style={{
          background: 'var(--color-warn-bg, #FEF3C7)',
          color: 'var(--color-warn-fg, #92400E)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M6 4v3.5M6 10v.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M5.2 1.5L0.5 10.5a1 1 0 00.87 1.5h10.26a1 1 0 00.87-1.5L7 1.5a1 1 0 00-1.73 0z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
        Pré-visualização — não é uma nota válida.
      </div>

      <div className="p-6 space-y-6">
        <div>
          <PreviewEyebrow>Prestador</PreviewEyebrow>
          {prestador ? (
            <>
              <div className="text-sm font-semibold text-[var(--ink)] mt-1">
                {prestador.nomeFantasia}
              </div>
              <div className="text-xs text-[var(--ink-muted)]">
                {prestador.razaoSocial}
              </div>
              <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] mt-1">
                {formatCNPJ(prestador.cnpj)}
              </div>
              {prestador.endereco.logradouro && (
                <div className="text-xs text-[var(--ink-muted)] mt-1 leading-relaxed">
                  {[prestador.endereco.logradouro, prestador.endereco.numero].filter(Boolean).join(', ')}
                  {prestador.endereco.bairro ? ` · ${prestador.endereco.bairro}` : ''}
                  <br />
                  {[prestador.endereco.municipio, prestador.endereco.uf].filter(Boolean).join('/')}
                  {prestador.endereco.cep ? ` · ${formatCEP(prestador.endereco.cep)}` : ''}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[var(--ink-muted)] mt-1">
              Escolha uma empresa no seletor do topo.
            </div>
          )}
        </div>

        <PreviewDivider />

        <div>
          <PreviewEyebrow>Tomador</PreviewEyebrow>
          {data.tomador ? (
            <>
              <div className="text-sm font-semibold text-[var(--ink)] mt-1">
                {data.tomador.nome}
              </div>
              <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] mt-0.5">
                {data.tomador.tipo === 'pf' ? 'CPF' : 'CNPJ'} {data.tomador.documento}
              </div>
              {data.tomador.endereco && (
                <div className="text-xs text-[var(--ink-muted)] mt-1 leading-relaxed">
                  {data.tomador.endereco}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[var(--ink-muted)] mt-1 italic">
              Aguardando tomador...
            </div>
          )}
        </div>

        <PreviewDivider />

        <div>
          <PreviewEyebrow>Serviços</PreviewEyebrow>
          <div className="mt-2 space-y-2">
            {data.servicos.filter((s) => s.nome.trim()).length === 0 ? (
              <div className="text-xs text-[var(--ink-muted)] italic">
                Aguardando serviços...
              </div>
            ) : (
              data.servicos
                .filter((s) => s.nome.trim())
                .map((s) => (
                  <div
                    key={s.uid}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[var(--ink)] truncate">
                        {s.nome}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.02em] text-[var(--ink-muted)]">
                        {s.quantidade} × {brl.format(s.valorUnitario)}
                      </div>
                    </div>
                    <span className="font-mono text-xs tracking-tight text-[var(--ink)] flex-none">
                      {brl.format(s.quantidade * s.valorUnitario)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        <PreviewDivider />

        <div>
          <PreviewEyebrow>Valores</PreviewEyebrow>
          <dl className="mt-2 space-y-1.5">
            <PreviewRow label="Subtotal" value={brl.format(subtotal)} />
            {data.desconto > 0 && (
              <PreviewRow
                label="Desconto"
                value={`− ${brl.format(data.desconto)}`}
              />
            )}
            <PreviewRow
              label="Total da nota"
              value={brl.format(total)}
              emphasis
            />
            <PreviewRow
              label={`ISS (${brlCompact.format(data.aliqIss)}%)`}
              value={brl.format(valorIss)}
            />
            {retencoesList
              .filter(([, v]) => v > 0)
              .map(([name, v]) => (
                <PreviewRow
                  key={name}
                  label={`${name} retido`}
                  value={`− ${brl.format(v)}`}
                />
              ))}
            {retidoTotal === 0 && !data.issRetido && (
              <PreviewRow
                label="Retenções"
                value="Nenhuma"
                muted
              />
            )}
          </dl>
        </div>

        <div
          className="mt-4 rounded-xl p-4"
          style={{
            background: 'var(--accent-soft)',
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--accent-deep)]">
            Líquido a receber
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-[var(--accent-deep)] tracking-tight">
            {brl.format(Math.max(0, liquido))}
          </div>
        </div>

        {data.discriminacao.trim() && (
          <>
            <PreviewDivider />
            <div>
              <PreviewEyebrow>Discriminação</PreviewEyebrow>
              <p className="mt-2 text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
                {data.discriminacao}
              </p>
            </div>
          </>
        )}

        {data.observacoes.trim() && (
          <>
            <PreviewDivider />
            <div>
              <PreviewEyebrow>Observações</PreviewEyebrow>
              <p className="mt-2 text-xs text-[var(--ink-muted)] leading-relaxed whitespace-pre-wrap">
                {data.observacoes}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
      {children}
    </span>
  );
}

function PreviewDivider() {
  return <div className="h-px bg-[var(--line)]" />;
}

function PreviewRow({
  label,
  value,
  emphasis,
  muted,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt
        className={`text-xs ${
          emphasis ? 'text-[var(--ink)] font-medium' : muted ? 'text-[var(--ink-muted)]' : 'text-[var(--ink-muted)]'
        }`}
      >
        {label}
      </dt>
      <dd
        className={`font-mono tracking-tight ${
          emphasis
            ? 'text-sm font-semibold text-[var(--ink)]'
            : muted
            ? 'text-xs text-[var(--ink-muted)]'
            : 'text-xs text-[var(--ink)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ---------- Sticky footer ----------

function StickyFooter({
  allValid,
  onSaveRascunho,
  onEmitir,
  saving,
}: {
  allValid: boolean;
  onSaveRascunho: () => void;
  onEmitir: () => void;
  saving: boolean;
}) {
  return (
    <footer className="sticky bottom-6 mt-8 z-30">
      <div className="card p-4 md:p-5 flex items-center justify-between gap-3 shadow-lg">
        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--ink-muted)]">
          {allValid ? (
            <>
              <span
                className="w-2 h-2 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
              Tudo pronto.
            </>
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full"
                aria-hidden
                style={{ background: 'var(--color-warn-fg, #92400E)' }}
              />
              Completa os campos obrigatórios antes de emitir.
            </>
          )}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={onSaveRascunho}
            disabled={saving}
            className="btn-secondary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            onClick={onEmitir}
            disabled={!allValid || saving}
            className="btn-primary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Emitir nota
          </button>
        </div>
      </div>
    </footer>
  );
}

// ---------- Emissão modal ----------

function EmissaoModal({
  stage,
  result,
  onClose,
  onRetry,
  onEdit,
  onSeeLista,
}: {
  stage: EmissaoStage;
  result: EmissaoResult | null;
  onClose: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onSeeLista: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--ink)]/50">
      <div className="card w-full max-w-md p-7 text-center">
        {stage === 'sending' && (
          <>
            <SpinnerIcon />
            <h3 className="mt-4 text-xl font-semibold text-[var(--ink)]">
              Enviando sua nota<em className="font-serif italic">...</em>
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              Assinando com seu certificado digital.
            </p>
            <StageDots active={0} />
          </>
        )}

        {stage === 'processing' && (
          <>
            <SpinnerIcon />
            <h3 className="mt-4 text-xl font-semibold text-[var(--ink)]">
              Conversando com a <em className="font-serif italic">prefeitura</em>...
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              Isso costuma levar uns segundos.
            </p>
            <StageDots active={1} />
          </>
        )}

        {stage === 'authorized' && result?.stage === 'authorized' && (
          <>
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-deep)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <path
                  d="M7 14.5l4.5 4.5L21 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-[var(--ink)]">
              <em className="font-serif italic">Autorizada!</em>
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              A prefeitura confirmou a emissão. A gente já mandou por e-mail
              também.
            </p>
            <div className="mt-5 rounded-xl bg-[var(--line-soft)] py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
                Número da nota
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[var(--ink)] tracking-[0.02em]">
                {result.numero}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('Baixar PDF/XML (mock)', result.numero);
                }}
                className="btn-secondary h-10 px-5 rounded-lg font-medium text-sm"
              >
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={onSeeLista}
                className="btn-primary h-10 px-5 rounded-lg font-medium text-sm"
              >
                Ver na lista
              </button>
            </div>
          </>
        )}

        {stage === 'rejected' && result?.stage === 'rejected' && (
          <>
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--color-err-bg, #FEE2E2)',
                color: 'var(--color-err-fg, #DC2626)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <path
                  d="M9 9l10 10M19 9L9 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-[var(--ink)]">
              A prefeitura <em className="font-serif italic">rejeitou</em> a nota.
            </h3>
            <p className="mt-3 text-sm text-[var(--ink)] leading-relaxed">
              {result.motivo}
            </p>
            <div
              className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-pill"
              style={{
                background: 'var(--color-err-bg, #FEE2E2)',
                color: 'var(--color-err-fg, #DC2626)',
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.02em]">
                Código {result.codigo}
              </span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onEdit}
                className="btn-secondary h-10 px-5 rounded-lg font-medium text-sm"
              >
                Editar e reenviar
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="btn-primary h-10 px-5 rounded-lg font-medium text-sm"
              >
                Tentar de novo
              </button>
            </div>
          </>
        )}

        {(stage === 'authorized' || stage === 'rejected') && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <div className="mx-auto w-14 h-14 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-[var(--line)] border-t-[var(--ink)] animate-spin" />
    </div>
  );
}

function StageDots({ active }: { active: number }) {
  const labels = ['Enviando', 'Prefeitura', 'Concluído'];
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i <= active ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'
            }`}
          />
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.02em] ${
              i === active ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
            }`}
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <span className="w-6 h-px bg-[var(--line)]" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Toggle ----------

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

// ---------- Toast ----------

function ToastHost({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 2200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-[var(--ink)] text-white px-5 py-3 text-sm shadow-lg flex items-center gap-3"
    >
      <span className="w-2 h-2 rounded-full bg-[var(--accent)]" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
