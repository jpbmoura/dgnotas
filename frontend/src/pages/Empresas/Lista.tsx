import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  formatCNPJ,
  type Company,
  type CompanyStatus,
  type RegimeTributario,
} from '../../api/empresas';
import { useCompany } from '../../contexts/CompanyContext';

type RegimeFilter = RegimeTributario | 'todos';
type StatusFilter = CompanyStatus | 'todos';

type SortKey = 'nomeFantasia' | 'cnpj' | 'ultimaEmissaoEm' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

const regimeChips: { value: RegimeFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'mei', label: 'MEI' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real', label: 'Lucro Real' },
];

const statusChips: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativa', label: 'Ativa' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'inativa', label: 'Inativa' },
];

// ---------- helpers ----------

function relativeDate(iso: string | null): string {
  if (!iso) return 'Nunca emitiu';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays < 0) return iso;
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `Há ${w} ${w === 1 ? 'semana' : 'semanas'}`;
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30);
    return `Há ${m} ${m === 1 ? 'mês' : 'meses'}`;
  }
  const y = Math.floor(diffDays / 365);
  return `Há ${y} ${y === 1 ? 'ano' : 'anos'}`;
}

function matchesQuery(c: Company, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return (
    c.nomeFantasia.toLowerCase().includes(q) ||
    c.razaoSocial.toLowerCase().includes(q) ||
    (digits.length > 0 && c.cnpj.replace(/\D/g, '').includes(digits))
  );
}

// ---------- page ----------

export function Lista() {
  const navigate = useNavigate();
  const { empresas, loading, error } = useCompany();

  const [query, setQuery] = useState('');
  const [regime, setRegime] = useState<RegimeFilter>('todos');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'nomeFantasia',
    dir: 'asc',
  });
  const [page, setPage] = useState(1);

  // Reset page to 1 sempre que filtros/busca/sort mudam.
  useEffect(() => {
    setPage(1);
  }, [query, regime, status, sort]);

  const filtered = useMemo(() => {
    return empresas.filter((c) => {
      if (regime !== 'todos' && c.regimeTributario !== regime) return false;
      if (status !== 'todos' && c.status !== status) return false;
      if (!matchesQuery(c, query)) return false;
      return true;
    });
  }, [empresas, regime, status, query]);

  const sorted = useMemo(() => sortBy(filtered, sort.key, sort.dir), [
    filtered,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(from, from + PAGE_SIZE);

  const isEmptyGlobal = !loading && !error && empresas.length === 0;
  const isEmptySearch =
    !loading && empresas.length > 0 && sorted.length === 0;

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Pessoas jurídicas
          </span>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
            Empresas
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
            Tudo que você emite nota por aqui. Clica numa linha pra ver detalhes
            e histórico.
          </p>
        </div>
        <Link
          to="/empresas/nova"
          className="btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center gap-2"
        >
          <span aria-hidden>+</span>
          Nova empresa
        </Link>
      </header>

      <section className="space-y-4">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex flex-col gap-3">
          <FilterRow label="Regime">
            {regimeChips.map((chip) => (
              <Chip
                key={chip.value}
                active={regime === chip.value}
                onClick={() => setRegime(chip.value)}
              >
                {chip.label}
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="Status">
            {statusChips.map((chip) => (
              <Chip
                key={chip.value}
                active={status === chip.value}
                onClick={() => setStatus(chip.value)}
              >
                {chip.label}
              </Chip>
            ))}
          </FilterRow>
        </div>
      </section>

      {loading && <TableSkeleton />}

      {error && !loading && <ErrorState message={error.message} />}

      {isEmptyGlobal && <EmptyGlobal />}

      {isEmptySearch && <EmptySearch query={query} />}

      {!loading && !error && !isEmptyGlobal && !isEmptySearch && (
        <section className="card p-0 overflow-hidden">
          <TableHeader sort={sort} onSort={toggleSort} />
          <div>
            {pageItems.map((c) => (
              <TableRow
                key={c.id}
                company={c}
                onOpen={() => navigate(`/empresas/${c.id}`)}
              />
            ))}
            <div className="md:hidden divide-y divide-[var(--line-soft)]">
              {pageItems.map((c) => (
                <MobileRow
                  key={c.id}
                  company={c}
                  onOpen={() => navigate(`/empresas/${c.id}`)}
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

// ---------- sort ----------

function sortBy(list: Company[], key: SortKey, dir: SortDir): Company[] {
  const copy = [...list];
  const mult = dir === 'asc' ? 1 : -1;
  copy.sort((a, b) => {
    switch (key) {
      case 'nomeFantasia':
        return a.nomeFantasia.localeCompare(b.nomeFantasia, 'pt-BR') * mult;
      case 'cnpj':
        return a.cnpj.localeCompare(b.cnpj) * mult;
      case 'ultimaEmissaoEm': {
        const ax = a.ultimaEmissaoEm ? new Date(a.ultimaEmissaoEm).getTime() : 0;
        const bx = b.ultimaEmissaoEm ? new Date(b.ultimaEmissaoEm).getTime() : 0;
        return (ax - bx) * mult;
      }
      case 'status': {
        const order: Record<CompanyStatus, number> = {
          ativa: 0,
          pendente: 1,
          inativa: 2,
        };
        return (order[a.status] - order[b.status]) * mult;
      }
    }
  });
  return copy;
}

// ---------- search + filters ----------

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
        placeholder="Buscar por razão social, nome fantasia ou CNPJ"
        className="w-full h-12 pl-11 pr-4 rounded-lg bg-white border border-[var(--line)] font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink)] transition-colors"
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
      className={`inline-flex items-center h-8 px-3 rounded-pill text-xs font-medium transition-colors ${
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

// ---------- table ----------

const gridCols =
  'grid grid-cols-[minmax(0,1fr)_160px_140px_140px_120px_120px]';

function TableHeader({
  sort,
  onSort,
}: {
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  return (
    <div
      className={`${gridCols} gap-4 px-6 py-3 border-b border-[var(--line)] bg-[var(--line-soft)]/40 hidden md:grid`}
    >
      <HeaderCell
        active={sort.key === 'nomeFantasia'}
        dir={sort.dir}
        onClick={() => onSort('nomeFantasia')}
      >
        Nome fantasia
      </HeaderCell>
      <HeaderCell
        active={sort.key === 'cnpj'}
        dir={sort.dir}
        onClick={() => onSort('cnpj')}
      >
        CNPJ
      </HeaderCell>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] flex items-center">
        Regime
      </div>
      <HeaderCell
        active={sort.key === 'ultimaEmissaoEm'}
        dir={sort.dir}
        onClick={() => onSort('ultimaEmissaoEm')}
      >
        Última emissão
      </HeaderCell>
      <HeaderCell
        active={sort.key === 'status'}
        dir={sort.dir}
        onClick={() => onSort('status')}
      >
        Status
      </HeaderCell>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] text-right">
        Ações
      </div>
    </div>
  );
}

function HeaderCell({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.02em] transition-colors text-left ${
        active
          ? 'text-[var(--ink)]'
          : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
      }`}
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
  company,
  onOpen,
}: {
  company: Company;
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
      aria-label={`Abrir ${company.nomeFantasia}`}
      className={`${gridCols} gap-4 px-6 py-4 border-b border-[var(--line-soft)] last:border-b-0 hover:bg-[var(--line-soft)]/50 cursor-pointer transition-colors items-center hidden md:grid`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--ink)] truncate">
          {company.nomeFantasia}
        </div>
        <div className="text-xs text-[var(--ink-muted)] truncate mt-0.5">
          {company.razaoSocial}
        </div>
      </div>
      <div className="font-mono text-xs text-[var(--ink)] tracking-[0.02em] truncate">
        {formatCNPJ(company.cnpj)}
      </div>
      <div>
        <RegimeBadge regime={company.regimeTributario} />
      </div>
      <div className="text-xs text-[var(--ink-muted)]">
        {relativeDate(company.ultimaEmissaoEm)}
      </div>
      <div>
        <StatusBadge status={company.status} />
      </div>
      <RowActions company={company} onOpen={onOpen} />
    </div>
  );
}

function MobileRow({
  company,
  onOpen,
}: {
  company: Company;
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
      className="px-6 py-4 cursor-pointer hover:bg-[var(--line-soft)]/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[var(--ink)] truncate">
            {company.nomeFantasia}
          </div>
          <div className="text-xs text-[var(--ink-muted)] truncate mt-0.5">
            {company.razaoSocial}
          </div>
          <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] mt-1">
            {formatCNPJ(company.cnpj)}
          </div>
        </div>
        <StatusBadge status={company.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <RegimeBadge regime={company.regimeTributario} />
          <span className="text-[11px] text-[var(--ink-muted)]">
            {relativeDate(company.ultimaEmissaoEm)}
          </span>
        </div>
        <RowActions company={company} onOpen={onOpen} />
      </div>
    </div>
  );
}

function RowActions({
  company,
  onOpen,
}: {
  company: Company;
  onOpen: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <IconButton
        label={`Ver detalhes de ${company.nomeFantasia}`}
        onClick={onOpen}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M1.5 7C2.5 4.5 4.5 3 7 3s4.5 1.5 5.5 4c-1 2.5-3 4-5.5 4s-4.5-1.5-5.5-4z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </IconButton>
      <IconButton
        label={`Editar ${company.nomeFantasia}`}
        onClick={() => navigate(`/empresas/${company.id}/editar`)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M9.5 2.5l2 2-6.5 6.5H3v-2L9.5 2.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </IconButton>
      <IconButton
        label={`Desativar ${company.nomeFantasia}`}
        onClick={() => {
          // Mock — trocar por handler real quando tiver API.
          console.info('Desativar', company.id);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 10L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
    >
      {children}
    </button>
  );
}

// ---------- badges ----------

function RegimeBadge({ regime }: { regime: RegimeTributario }) {
  const short: Record<RegimeTributario, string> = {
    simples: 'Simples',
    mei: 'MEI',
    presumido: 'Presumido',
    real: 'Lucro Real',
  };
  return (
    <span className="badge bg-[var(--line-soft)] text-[var(--ink)]">
      {short[regime]}
    </span>
  );
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  if (status === 'ativa') {
    return (
      <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
        Ativa
      </span>
    );
  }
  if (status === 'pendente') {
    return (
      <span
        className="badge"
        style={{
          background: 'var(--color-warn-bg, #FEF3C7)',
          color: 'var(--color-warn-fg, #92400E)',
        }}
      >
        Pendente
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--line-soft)] text-[var(--ink-muted)]">
      Inativa
    </span>
  );
}

// ---------- pagination ----------

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

// ---------- skeleton + empty states ----------

function TableSkeleton() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-3 border-b border-[var(--line)] bg-[var(--line-soft)]/40 hidden md:block">
        <SkeletonLine width={120} />
      </div>
      <div className="divide-y divide-[var(--line-soft)]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div
              className={`${gridCols} gap-4 px-6 py-4 items-center hidden md:grid`}
            >
              <div className="space-y-1.5">
                <SkeletonLine width={180} />
                <SkeletonLine width={140} />
              </div>
              <SkeletonLine width={140} />
              <SkeletonLine width={80} />
              <SkeletonLine width={90} />
              <SkeletonLine width={60} />
              <div className="flex justify-end gap-1">
                <SkeletonLine width={28} />
                <SkeletonLine width={28} />
                <SkeletonLine width={28} />
              </div>
            </div>
            <div className="md:hidden px-6 py-4 space-y-2">
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

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="card p-8 text-center"
      style={{
        background: 'var(--color-err-bg, #FEE2E2)',
        borderColor: 'var(--color-err-fg, #DC2626)',
      }}
    >
      <h2
        className="text-lg font-semibold"
        style={{ color: 'var(--color-err-fg, #DC2626)' }}
      >
        Não foi possível carregar as empresas.
      </h2>
      <p
        className="mt-2 text-sm"
        style={{ color: 'var(--color-err-fg, #DC2626)', opacity: 0.85 }}
      >
        {message}
      </p>
    </div>
  );
}

function EmptyGlobal() {
  return (
    <div className="card p-10 md:p-16 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <path
            d="M4 24V8l5-4h10l5 4v16"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9 24v-7h10v7M9 11h10M9 14h10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        Nenhuma empresa por <em className="font-serif italic">aqui ainda</em>.
      </h2>
      <p className="mt-3 text-sm text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
        Cadastra a primeira pra começar a emitir notas. Se você emite por mais
        de um CNPJ, dá pra gerenciar todos na mesma conta.
      </p>
      <Link
        to="/empresas/nova"
        className="mt-6 btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Cadastrar primeira empresa
      </Link>
    </div>
  );
}

function EmptySearch({ query }: { query: string }) {
  const label = query.trim();
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
        {label
          ? <>Nenhuma empresa encontrada para "<span className="font-mono tracking-[0.02em]">{label}</span>".</>
          : 'Nenhuma empresa bate com esses filtros.'}
      </p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Tenta buscar por outro pedaço do nome ou ajusta os filtros.
      </p>
    </div>
  );
}
