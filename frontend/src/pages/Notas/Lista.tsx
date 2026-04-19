import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  mockNotas,
  statusLabel,
  tipoLabel,
  type NotaLista,
  type NotaListaStatus,
  type NotaListaTipo,
} from '../../mocks/notas';

type TipoFilter = 'todos' | NotaListaTipo;

type PeriodoKey =
  | 'todos'
  | 'hoje'
  | '7d'
  | 'mes'
  | 'trimestre'
  | 'custom';

type SortKey = 'numero' | 'cliente' | 'valor' | 'dataEmissao' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const tipoChips: { value: TipoFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'nfe', label: 'NF-e' },
  { value: 'nfse', label: 'NFS-e' },
];

const statusChips: { value: NotaListaStatus; label: string }[] = [
  { value: 'autorizada', label: 'Autorizada' },
  { value: 'processando', label: 'Processando' },
  { value: 'rejeitada', label: 'Rejeitada' },
  { value: 'cancelada', label: 'Cancelada' },
];

const periodoOpcoes: { value: PeriodoKey; label: string }[] = [
  { value: 'todos', label: 'Qualquer data' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'trimestre', label: 'Último trimestre' },
  { value: 'custom', label: 'Período personalizado' },
];

// ---------- Formatters ----------

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateShort = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return dateShort.format(d);
}

function hoursSince(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return (Date.now() - d.getTime()) / 3_600_000;
}

// ---------- Filters helpers ----------

function matchQuery(nota: NotaLista, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return (
    nota.numero.includes(q) ||
    nota.cliente.nome.toLowerCase().includes(q) ||
    nota.descricao.toLowerCase().includes(q) ||
    (digits.length > 0 && nota.chaveAcesso.replace(/\D/g, '').includes(digits)) ||
    nota.chaveAcesso.toLowerCase().includes(q)
  );
}

function dateRangeFor(
  periodo: PeriodoKey,
  customStart: string,
  customEnd: string,
): [Date, Date] | null {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (periodo === 'hoje') {
    start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (periodo === '7d') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (periodo === 'mes') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (periodo === 'trimestre') {
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (periodo === 'custom' && customStart && customEnd) {
    const s = new Date(customStart + 'T00:00:00');
    const e = new Date(customEnd + 'T23:59:59');
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      return [s, e];
    }
  }
  return null;
}

// ---------- Page ----------

export function Lista() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allNotas, setAllNotas] = useState<NotaLista[]>([]);

  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState<TipoFilter>('todos');
  const [statusSet, setStatusSet] = useState<Set<NotaListaStatus>>(new Set());
  const [periodo, setPeriodo] = useState<PeriodoKey>('todos');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'dataEmissao',
    dir: 'desc',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      // Troque pra `setError(true)` pra testar o estado de erro.
      setAllNotas(mockNotas);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, tipo, statusSet, periodo, customStart, customEnd]);

  const filtered = useMemo(() => {
    const range = dateRangeFor(periodo, customStart, customEnd);
    return allNotas.filter((n) => {
      if (tipo !== 'todos' && n.tipo !== tipo) return false;
      if (statusSet.size > 0 && !statusSet.has(n.status)) return false;
      if (!matchQuery(n, query)) return false;
      if (range) {
        const d = new Date(n.dataEmissao + 'T12:00:00');
        if (d < range[0] || d > range[1]) return false;
      }
      return true;
    });
  }, [allNotas, tipo, statusSet, periodo, customStart, customEnd, query]);

  const sorted = useMemo(() => sortBy(filtered, sort.key, sort.dir), [
    filtered,
    sort,
  ]);

  const totalValor = useMemo(
    () =>
      sorted
        .filter((n) => n.status === 'autorizada')
        .reduce((acc, n) => acc + n.valor, 0),
    [sorted],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(from, from + PAGE_SIZE);

  const isEmptyGlobal = !loading && !error && allNotas.length === 0;
  const isEmptyFiltered =
    !loading && !error && allNotas.length > 0 && sorted.length === 0;

  const hasActiveFilters =
    query.trim().length > 0 ||
    tipo !== 'todos' ||
    statusSet.size > 0 ||
    periodo !== 'todos';

  function clearFilters() {
    setQuery('');
    setTipo('todos');
    setStatusSet(new Set());
    setPeriodo('todos');
    setCustomStart('');
    setCustomEnd('');
  }

  function toggleStatus(s: NotaListaStatus) {
    setStatusSet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'dataEmissao' || key === 'valor' ? 'desc' : 'asc' },
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const pageIds = pageItems.map((n) => n.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function retry() {
    setError(false);
    setLoading(true);
    setTimeout(() => {
      setAllNotas(mockNotas);
      setLoading(false);
    }, 500);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Histórico
          </span>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
            Notas emitidas
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
            Tudo que saiu da sua empresa — autorizadas, rejeitadas, rascunhos.
            Clica numa linha pra ver detalhes.
          </p>
        </div>
        <EmitDropdown />
      </header>

      <FilterCard
        query={query}
        onQueryChange={setQuery}
        tipo={tipo}
        onTipoChange={setTipo}
        statusSet={statusSet}
        onStatusToggle={toggleStatus}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        hasActive={hasActiveFilters}
        onClear={clearFilters}
      />

      {!loading && !error && !isEmptyGlobal && (
        <SummaryBar
          total={sorted.length}
          totalValor={totalValor}
          hasFilters={hasActiveFilters}
        />
      )}

      {selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
        />
      )}

      {loading && <TableSkeleton />}
      {error && <ErrorState onRetry={retry} />}
      {isEmptyGlobal && <EmptyGlobal />}
      {isEmptyFiltered && <EmptyFiltered onClear={clearFilters} />}

      {!loading && !error && !isEmptyGlobal && !isEmptyFiltered && (
        <section className="card p-0 overflow-hidden">
          <TableHeader
            sort={sort}
            onSort={toggleSort}
            pageItems={pageItems}
            selected={selected}
            onToggleAll={toggleSelectAll}
          />
          <div>
            {pageItems.map((n) => (
              <TableRow
                key={n.id}
                nota={n}
                selected={selected.has(n.id)}
                onToggleSelect={() => toggleSelect(n.id)}
                onOpen={() => navigate(`/notas/${n.id}`)}
              />
            ))}
            <div className="md:hidden divide-y divide-[var(--line-soft)]">
              {pageItems.map((n) => (
                <MobileRow
                  key={n.id}
                  nota={n}
                  selected={selected.has(n.id)}
                  onToggleSelect={() => toggleSelect(n.id)}
                  onOpen={() => navigate(`/notas/${n.id}`)}
                />
              ))}
            </div>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={sorted.length}
            from={from}
            to={from + pageItems.length}
            onChange={setPage}
          />
        </section>
      )}
    </div>
  );
}

export default Lista;

// ---------- Sort ----------

function sortBy(list: NotaLista[], key: SortKey, dir: SortDir): NotaLista[] {
  const copy = [...list];
  const mult = dir === 'asc' ? 1 : -1;
  copy.sort((a, b) => {
    switch (key) {
      case 'numero':
        return a.numero.localeCompare(b.numero) * mult;
      case 'cliente':
        return a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR') * mult;
      case 'valor':
        return (a.valor - b.valor) * mult;
      case 'dataEmissao':
        return (
          (new Date(a.dataEmissao).getTime() -
            new Date(b.dataEmissao).getTime()) *
          mult
        );
      case 'status': {
        const order: Record<NotaListaStatus, number> = {
          autorizada: 0,
          processando: 1,
          rejeitada: 2,
          cancelada: 3,
        };
        return (order[a.status] - order[b.status]) * mult;
      }
    }
  });
  return copy;
}

// ---------- Emit dropdown ----------

function EmitDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center gap-2"
      >
        <span aria-hidden>+</span>
        Emitir nota
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 3.5L5 7l3-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-20"
        >
          <Link
            to="/notas/nova/nfse"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--line-soft)] transition-colors"
          >
            <span className="mt-0.5 flex-none w-8 h-8 rounded-lg bg-[var(--blue-soft)] text-[var(--blue)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M4 2v12l2-1.2 2 1.2 2-1.2 2 1.2V2H4z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 5h4M6 7h4M6 9h3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <div className="text-sm font-medium text-[var(--ink)]">
                NFS-e
              </div>
              <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                Nota de serviço — cursos, consultoria, mentoria.
              </div>
            </div>
          </Link>
          <Link
            to="/notas/nova/nfe"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--line-soft)] transition-colors border-t border-[var(--line-soft)]"
          >
            <span className="mt-0.5 flex-none w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 2l5 2.5v7L8 14l-5-2.5v-7L8 2z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 4.5L8 7l5-2.5M8 7v7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <div className="text-sm font-medium text-[var(--ink)]">
                NF-e
              </div>
              <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                Nota de produto — livros, kits, planners.
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------- Filter card ----------

function FilterCard({
  query,
  onQueryChange,
  tipo,
  onTipoChange,
  statusSet,
  onStatusToggle,
  periodo,
  onPeriodoChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  hasActive,
  onClear,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  tipo: TipoFilter;
  onTipoChange: (v: TipoFilter) => void;
  statusSet: Set<NotaListaStatus>;
  onStatusToggle: (s: NotaListaStatus) => void;
  periodo: PeriodoKey;
  onPeriodoChange: (p: PeriodoKey) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  hasActive: boolean;
  onClear: () => void;
}) {
  return (
    <section className="card p-5 md:p-6 space-y-4">
      <SearchBar value={query} onChange={onQueryChange} />

      <FilterRow label="Tipo">
        {tipoChips.map((chip) => (
          <Chip
            key={chip.value}
            active={tipo === chip.value}
            onClick={() => onTipoChange(chip.value)}
          >
            {chip.label}
          </Chip>
        ))}
      </FilterRow>

      <FilterRow label="Status">
        <Chip
          active={statusSet.size === 0}
          onClick={() => {
            // "Todos" não é um status per se — limpa a seleção.
            if (statusSet.size === 0) return;
            statusSet.forEach((s) => onStatusToggle(s));
          }}
        >
          Todos
        </Chip>
        {statusChips.map((chip) => (
          <Chip
            key={chip.value}
            active={statusSet.has(chip.value)}
            onClick={() => onStatusToggle(chip.value)}
          >
            <StatusDot status={chip.value} />
            {chip.label}
          </Chip>
        ))}
      </FilterRow>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Período
          </span>
          <select
            value={periodo}
            onChange={(e) => onPeriodoChange(e.target.value as PeriodoKey)}
            className="h-10 pl-3 pr-10 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors appearance-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%23425466' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {periodoOpcoes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {periodo === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
              />
              <span className="text-[var(--ink-muted)] text-xs">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white border border-[var(--line)] font-mono text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors"
              />
            </div>
          )}
        </div>

        {hasActive && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </section>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
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
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por número, cliente ou chave de acesso"
        className="w-full h-12 pl-11 pr-4 rounded-lg bg-white border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
      />
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-1 flex-none">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-pill text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--ink)] text-white'
          : 'bg-white border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink)]'
      }`}
      style={{ borderRadius: 999 }}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: NotaListaStatus }) {
  const map: Record<NotaListaStatus, string> = {
    autorizada: 'var(--accent)',
    processando: 'var(--color-warn-fg, #92400E)',
    rejeitada: 'var(--color-err-fg, #DC2626)',
    cancelada: 'var(--ink-muted)',
  };
  return (
    <span
      aria-hidden
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: map[status] }}
    />
  );
}

// ---------- Summary bar ----------

function SummaryBar({
  total,
  totalValor,
  hasFilters,
}: {
  total: number;
  totalValor: number;
  hasFilters: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] flex-wrap">
      <span>
        Mostrando{' '}
        <span className="font-mono tracking-[0.02em] text-[var(--ink)]">
          {total}
        </span>{' '}
        {total === 1 ? 'nota' : 'notas'}
        {hasFilters && <> {'nos filtros aplicados'}</>}
      </span>
      <span aria-hidden>•</span>
      <span>
        <span className="font-mono tracking-tight text-[var(--ink)]">
          {brl.format(totalValor)}
        </span>{' '}
        em valor autorizado
      </span>
    </div>
  );
}

// ---------- Selection bar ----------

function SelectionBar({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="card p-4 flex items-center justify-between gap-3 bg-[var(--ink)] text-white">
      <span className="text-sm">
        <span className="font-mono tracking-[0.02em] font-semibold">
          {count}
        </span>{' '}
        {count === 1 ? 'selecionada' : 'selecionadas'}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Baixar ZIP (mock)', count);
          }}
          className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          Baixar ZIP
        </button>
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Exportar CSV (mock)', count);
          }}
          className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          onClick={onClear}
          className="h-9 px-4 rounded-lg text-white/70 hover:text-white text-xs font-medium transition-colors"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

// ---------- Table ----------

const gridCols =
  'grid grid-cols-[40px_110px_90px_minmax(0,1fr)_120px_100px_130px_50px]';

function TableHeader({
  sort,
  onSort,
  pageItems,
  selected,
  onToggleAll,
}: {
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  pageItems: NotaLista[];
  selected: Set<string>;
  onToggleAll: () => void;
}) {
  const pageIds = pageItems.map((n) => n.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someChecked =
    !allChecked && pageIds.some((id) => selected.has(id));

  return (
    <div
      className={`${gridCols} gap-4 px-6 py-3 border-b border-[var(--line)] bg-[var(--line-soft)]/40 hidden md:grid`}
    >
      <label className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          onChange={onToggleAll}
          aria-label="Selecionar todas as notas da página"
          className="w-4 h-4 accent-[var(--ink)] cursor-pointer"
        />
      </label>
      <HeaderCell
        active={sort.key === 'numero'}
        dir={sort.dir}
        onClick={() => onSort('numero')}
      >
        Número
      </HeaderCell>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] flex items-center">
        Tipo
      </div>
      <HeaderCell
        active={sort.key === 'cliente'}
        dir={sort.dir}
        onClick={() => onSort('cliente')}
      >
        Cliente
      </HeaderCell>
      <HeaderCell
        active={sort.key === 'valor'}
        dir={sort.dir}
        onClick={() => onSort('valor')}
        align="right"
      >
        Valor
      </HeaderCell>
      <HeaderCell
        active={sort.key === 'dataEmissao'}
        dir={sort.dir}
        onClick={() => onSort('dataEmissao')}
      >
        Emissão
      </HeaderCell>
      <HeaderCell
        active={sort.key === 'status'}
        dir={sort.dir}
        onClick={() => onSort('status')}
      >
        Status
      </HeaderCell>
      <div />
    </div>
  );
}

function HeaderCell({
  active,
  dir,
  onClick,
  children,
  align = 'left',
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.02em] transition-colors ${
        align === 'right' ? 'justify-end' : 'text-left'
      } ${active ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}
    >
      <span>{children}</span>
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        aria-hidden
        className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
      >
        <path
          d={dir === 'asc' ? 'M4 2v4M2 4l2-2 2 2' : 'M4 6V2M2 4l2 2 2-2'}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function TableRow({
  nota,
  selected,
  onToggleSelect,
  onOpen,
}: {
  nota: NotaLista;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Abrir nota ${nota.numero}`}
      className={`${gridCols} gap-4 px-6 py-4 border-b border-[var(--line-soft)] last:border-b-0 cursor-pointer transition-colors items-center hidden md:grid ${
        selected ? 'bg-[var(--accent-soft)]/40' : 'hover:bg-[var(--line-soft)]/50'
      }`}
    >
      <label
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Selecionar nota ${nota.numero}`}
          className="w-4 h-4 accent-[var(--ink)] cursor-pointer"
        />
      </label>

      <div>
        <div className="font-mono text-sm tracking-[0.02em] text-[var(--ink)]">
          {nota.numero}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mt-0.5">
          Série {nota.serie}
        </div>
      </div>

      <div>
        <TipoBadge tipo={nota.tipo} />
      </div>

      <div className="min-w-0">
        <div className="text-sm text-[var(--ink)] truncate">
          {nota.cliente.nome}
        </div>
        <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] truncate mt-0.5">
          {nota.cliente.documento}
        </div>
      </div>

      <div className="text-right">
        <span className="font-mono text-sm tracking-tight text-[var(--ink)]">
          {brl.format(nota.valor)}
        </span>
      </div>

      <div className="font-mono text-xs tracking-[0.02em] text-[var(--ink-muted)]">
        {formatDate(nota.dataEmissao)}
      </div>

      <div>
        <StatusBadge status={nota.status} />
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <RowMenu nota={nota} />
      </div>
    </div>
  );
}

function MobileRow({
  nota,
  selected,
  onToggleSelect,
  onOpen,
}: {
  nota: NotaLista;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={`px-5 py-4 cursor-pointer transition-colors ${
        selected ? 'bg-[var(--accent-soft)]/40' : 'hover:bg-[var(--line-soft)]/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <label onClick={(e) => e.stopPropagation()} className="flex-none pt-0.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Selecionar nota ${nota.numero}`}
            className="w-4 h-4 accent-[var(--ink)]"
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm tracking-[0.02em] text-[var(--ink)]">
              {nota.numero}
            </span>
            <TipoBadge tipo={nota.tipo} />
            <StatusBadge status={nota.status} />
          </div>
          <div className="text-sm text-[var(--ink)] mt-1 truncate">
            {nota.cliente.nome}
          </div>
          <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] truncate mt-0.5">
            {nota.cliente.documento}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-sm tracking-tight text-[var(--ink)]">
              {brl.format(nota.valor)}
            </span>
            <span className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)]">
              {formatDate(nota.dataEmissao)}
            </span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="flex-none">
          <RowMenu nota={nota} />
        </div>
      </div>
    </div>
  );
}

// ---------- Row menu ----------

function RowMenu({ nota }: { nota: NotaLista }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const canCancel =
    nota.status === 'autorizada' && hoursSince(nota.dataEmissao) < 24;

  const docLabel = nota.tipo === 'nfe' ? 'Baixar DANFE' : 'Baixar DANFSE';

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Ações da nota ${nota.numero}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="3.5" cy="8" r="1.25" fill="currentColor" />
          <circle cx="8" cy="8" r="1.25" fill="currentColor" />
          <circle cx="12.5" cy="8" r="1.25" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] w-56 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden z-30"
        >
          <MenuItem
            onClick={() => {
              // eslint-disable-next-line no-console
              console.log('Ver detalhes', nota.id);
              setOpen(false);
            }}
          >
            Ver detalhes
          </MenuItem>
          <MenuItem
            onClick={() => {
              // eslint-disable-next-line no-console
              console.log('Baixar documento (mock)', nota.id);
              setOpen(false);
            }}
            disabled={nota.status !== 'autorizada'}
          >
            {docLabel}
          </MenuItem>
          <MenuItem
            onClick={() => {
              // eslint-disable-next-line no-console
              console.log('Baixar XML (mock)', nota.id);
              setOpen(false);
            }}
            disabled={nota.status !== 'autorizada'}
          >
            Baixar XML
          </MenuItem>
          <MenuItem
            onClick={() => {
              // eslint-disable-next-line no-console
              console.log('Reenviar por e-mail', nota.id);
              setOpen(false);
            }}
            disabled={nota.status !== 'autorizada'}
          >
            Reenviar por e-mail
          </MenuItem>
          {canCancel && (
            <>
              <div className="border-t border-[var(--line-soft)]" />
              <MenuItem
                danger
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('Cancelar nota', nota.id);
                  setOpen(false);
                }}
              >
                Cancelar nota
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
        disabled
          ? 'text-[var(--ink-muted)] opacity-50 cursor-not-allowed'
          : danger
          ? 'text-[var(--ink)] hover:bg-[var(--color-err-bg,#FEE2E2)]'
          : 'text-[var(--ink)] hover:bg-[var(--line-soft)]'
      }`}
      style={danger ? { color: 'var(--color-err-fg, #DC2626)' } : undefined}
    >
      {children}
    </button>
  );
}

// ---------- Badges ----------

function TipoBadge({ tipo }: { tipo: NotaListaTipo }) {
  if (tipo === 'nfe') {
    return (
      <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
        {tipoLabel.nfe}
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--blue-soft)] text-[var(--blue)]">
      {tipoLabel.nfse}
    </span>
  );
}

function StatusBadge({ status }: { status: NotaListaStatus }) {
  if (status === 'autorizada') {
    return (
      <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
        {statusLabel.autorizada}
      </span>
    );
  }
  if (status === 'processando') {
    return (
      <span
        className="badge"
        style={{
          background: 'var(--color-warn-bg, #FEF3C7)',
          color: 'var(--color-warn-fg, #92400E)',
        }}
      >
        {statusLabel.processando}
      </span>
    );
  }
  if (status === 'rejeitada') {
    return (
      <span
        className="badge"
        style={{
          background: 'var(--color-err-bg, #FEE2E2)',
          color: 'var(--color-err-fg, #DC2626)',
        }}
      >
        {statusLabel.rejeitada}
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--line-soft)] text-[var(--ink-muted)]">
      {statusLabel.cancelada}
    </span>
  );
}

// ---------- Pagination ----------

function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onChange: (p: number) => void;
}) {
  return (
    <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)]">
      <span className="text-xs text-[var(--ink-muted)]">
        Mostrando{' '}
        <span className="font-mono tracking-[0.02em] text-[var(--ink)]">
          {from + 1}–{to}
        </span>{' '}
        de{' '}
        <span className="font-mono tracking-[0.02em] text-[var(--ink)]">
          {total}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <PageButton
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          label="Página anterior"
        >
          ←
        </PageButton>
        <span className="font-mono text-xs text-[var(--ink-muted)] px-2">
          {page} / {totalPages}
        </span>
        <PageButton
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          label="Próxima página"
        >
          →
        </PageButton>
      </div>
    </footer>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] text-sm hover:border-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--line)] transition-colors"
    >
      {children}
    </button>
  );
}

// ---------- States ----------

function TableSkeleton() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-3 border-b border-[var(--line)] bg-[var(--line-soft)]/40 hidden md:block">
        <SkeletonLine width={120} />
      </div>
      <div className="divide-y divide-[var(--line-soft)]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>
            <div
              className={`${gridCols} gap-4 px-6 py-4 items-center hidden md:grid`}
            >
              <SkeletonLine width={16} />
              <div className="space-y-1.5">
                <SkeletonLine width={80} />
                <SkeletonLine width={40} />
              </div>
              <SkeletonLine width={60} />
              <div className="space-y-1.5">
                <SkeletonLine width={180} />
                <SkeletonLine width={120} />
              </div>
              <SkeletonLine width={80} />
              <SkeletonLine width={60} />
              <SkeletonLine width={80} />
              <SkeletonLine width={16} />
            </div>
            <div className="md:hidden px-5 py-4 space-y-2">
              <SkeletonLine width={200} />
              <SkeletonLine width={160} />
              <SkeletonLine width={120} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonLine({ width }: { width: number }) {
  return (
    <div
      className="h-3 rounded-full bg-[var(--line-soft)] animate-pulse"
      style={{ width }}
    />
  );
}

function EmptyGlobal() {
  return (
    <div className="card p-10 md:p-16 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <path
            d="M7 4h10l5 5v15a0 0 0 010 0H7z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M17 4v5h5M11 15h6M11 18h4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        Nenhuma nota <em className="font-serif italic">por aqui ainda</em>.
      </h2>
      <p className="mt-3 text-sm text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
        Emite a primeira pra ver o histórico tomar forma. Se já vende pela
        Hotmart, Kiwify ou Eduzz, a gente conecta e emite sozinho.
      </p>
      <Link
        to="/notas/nova/nfse"
        className="mt-6 btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Emitir primeira nota
      </Link>
    </div>
  );
}

function EmptyFiltered({ onClear }: { onClear: () => void }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-[var(--line-soft)] text-[var(--ink-muted)] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 12l3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="mt-4 text-sm text-[var(--ink)] font-medium">
        Nenhuma nota bate com esses filtros.
      </p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Tenta relaxar algum critério ou limpa tudo.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 btn-secondary h-10 px-5 rounded-lg font-medium text-sm"
      >
        Limpar filtros
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="card p-10 text-center"
      style={{
        borderColor: 'var(--color-err-fg, #DC2626)',
      }}
    >
      <div
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--color-err-bg, #FEE2E2)',
          color: 'var(--color-err-fg, #DC2626)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 7v6M12 16v.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-[var(--ink)]">
        Não deu pra carregar as notas agora.
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
        Pode ser instabilidade no servidor. Tenta de novo em alguns segundos —
        se persistir, a Ana já foi avisada.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 btn-primary h-10 px-5 rounded-lg font-medium text-sm"
      >
        Tentar de novo
      </button>
    </div>
  );
}
