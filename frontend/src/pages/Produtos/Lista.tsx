import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteProduto,
  listProdutos,
  tipoLabel,
  type Produto,
  type StatusItem as ItemStatus,
  type TipoItem as ItemTipo,
} from '../../api/produtos';
import { useCompany } from '../../contexts/CompanyContext';
import { HttpError } from '../../lib/http';

type TipoFilter = ItemTipo | 'todos';
type StatusFilter = ItemStatus | 'todos';

type SortKey = 'nome' | 'codigo' | 'valor' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

const tipoChips: { value: TipoFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'produto', label: 'Produtos' },
  { value: 'servico', label: 'Serviços' },
];

const statusChips: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'inativo', label: 'Inativos' },
];

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// ---------- helpers ----------

function relativeDate(iso: string): string {
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

function matchesQuery(item: Produto, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const ncm = item.produtoConfig?.ncm ?? null;
  const lc116 = item.servicoConfig?.lc116 ?? null;
  return (
    item.nome.toLowerCase().includes(q) ||
    item.codigo.toLowerCase().includes(q) ||
    item.descricao.toLowerCase().includes(q) ||
    (ncm ? ncm.includes(digits) : false) ||
    (lc116 ? lc116.toLowerCase().includes(q) : false)
  );
}

function classificacao(item: Produto): string {
  if (item.tipo === 'produto') return item.produtoConfig?.ncm ?? '—';
  return item.servicoConfig?.lc116 ?? '—';
}

// ---------- Page ----------

export function Lista() {
  const navigate = useNavigate();
  const { empresaAtiva, loading: companyLoading } = useCompany();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [allItens, setAllItens] = useState<Produto[]>([]);

  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState<TipoFilter>('todos');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'updatedAt',
    dir: 'desc',
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!empresaAtiva) {
      setAllItens([]);
      setLoading(companyLoading);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProdutos(empresaAtiva.id)
      .then((list) => {
        if (cancelled) return;
        setAllItens(list);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [empresaAtiva, companyLoading]);

  useEffect(() => {
    setPage(1);
  }, [query, tipo, status, sort]);

  const filtered = useMemo(() => {
    return allItens.filter((it) => {
      if (tipo !== 'todos' && it.tipo !== tipo) return false;
      if (status !== 'todos' && it.status !== status) return false;
      if (!matchesQuery(it, query)) return false;
      return true;
    });
  }, [allItens, tipo, status, query]);

  const sorted = useMemo(() => sortBy(filtered, sort.key, sort.dir), [
    filtered,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(from, from + PAGE_SIZE);

  const isEmptyGlobal = !loading && !error && empresaAtiva != null && allItens.length === 0;
  const isEmptySearch =
    !loading && !error && allItens.length > 0 && sorted.length === 0;
  const noCompanySelected = !loading && !empresaAtiva;

  const [deleteError, setDeleteError] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  }

  async function handleDelete(item: Produto) {
    if (!empresaAtiva) return;
    const ok = window.confirm(
      `Desativar "${item.nome}"? Ele some da listagem e não pode mais ser emitido em notas novas.`,
    );
    if (!ok) return;

    const snapshot = allItens;
    setAllItens((prev) => prev.filter((p) => p.id !== item.id));
    setDeleteError(null);

    try {
      await deleteProduto(empresaAtiva.id, item.id);
    } catch (err) {
      setAllItens(snapshot);
      setDeleteError(
        err instanceof HttpError
          ? err.message
          : 'Não foi possível desativar o produto. Tenta de novo?',
      );
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Catálogo
          </span>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
            Produtos
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl">
            Tudo que você vende — produto ou serviço. Cadastra uma vez, reusa
            em toda nota.
          </p>
        </div>
        <Link
          to="/produtos/novo"
          className="btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center gap-2"
        >
          <span aria-hidden>+</span>
          Novo produto
        </Link>
      </header>

      <section className="space-y-4">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex flex-col gap-3">
          <FilterRow label="Tipo">
            {tipoChips.map((chip) => (
              <Chip
                key={chip.value}
                active={tipo === chip.value}
                onClick={() => setTipo(chip.value)}
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

      {deleteError && (
        <div
          role="alert"
          className="rounded-2xl border p-4 flex items-start justify-between gap-3 text-sm"
          style={{
            background: 'var(--color-err-bg, #FEE2E2)',
            borderColor: 'var(--color-err-fg, #DC2626)',
            color: 'var(--color-err-fg, #DC2626)',
          }}
        >
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label="Fechar"
            className="font-mono text-xs underline underline-offset-2 hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {loading && <TableSkeleton />}

      {error && !loading && <ErrorState message={error.message} />}

      {noCompanySelected && <NoCompanyState />}

      {isEmptyGlobal && <EmptyGlobal />}

      {isEmptySearch && <EmptySearch query={query} />}

      {!loading && !error && !noCompanySelected && !isEmptyGlobal && !isEmptySearch && (
        <section className="card p-0 overflow-hidden">
          <TableHeader sort={sort} onSort={toggleSort} />
          <div>
            {pageItems.map((it) => (
              <TableRow
                key={it.id}
                item={it}
                onOpen={() => navigate(`/produtos/${it.id}`)}
                onDelete={() => handleDelete(it)}
              />
            ))}
            <div className="md:hidden divide-y divide-[var(--line-soft)]">
              {pageItems.map((it) => (
                <MobileRow
                  key={it.id}
                  item={it}
                  onOpen={() => navigate(`/produtos/${it.id}`)}
                  onDelete={() => handleDelete(it)}
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

function sortBy(list: Produto[], key: SortKey, dir: SortDir): Produto[] {
  const copy = [...list];
  const mult = dir === 'asc' ? 1 : -1;
  copy.sort((a, b) => {
    switch (key) {
      case 'nome':
        return a.nome.localeCompare(b.nome, 'pt-BR') * mult;
      case 'codigo':
        return a.codigo.localeCompare(b.codigo, 'pt-BR') * mult;
      case 'valor':
        return (a.valor - b.valor) * mult;
      case 'updatedAt': {
        const ax = new Date(a.updatedAt).getTime();
        const bx = new Date(b.updatedAt).getTime();
        return (ax - bx) * mult;
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
        placeholder="Buscar por nome, código, descrição, NCM ou LC 116"
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
  'grid grid-cols-[minmax(0,1fr)_100px_140px_140px_100px_120px]';

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
        active={sort.key === 'nome'}
        dir={sort.dir}
        onClick={() => onSort('nome')}
      >
        Nome
      </HeaderCell>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] flex items-center">
        Tipo
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] flex items-center">
        Classificação
      </div>
      <HeaderCell
        active={sort.key === 'valor'}
        dir={sort.dir}
        onClick={() => onSort('valor')}
        align="right"
      >
        Valor
      </HeaderCell>
      <HeaderCell
        active={sort.key === 'updatedAt'}
        dir={sort.dir}
        onClick={() => onSort('updatedAt')}
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
  item,
  onOpen,
  onDelete,
}: {
  item: Produto;
  onOpen: () => void;
  onDelete: () => void;
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
      aria-label={`Abrir ${item.nome}`}
      className={`${gridCols} gap-4 px-6 py-4 border-b border-[var(--line-soft)] last:border-b-0 hover:bg-[var(--line-soft)]/50 cursor-pointer transition-colors items-center hidden md:grid`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--ink)] truncate">
          {item.nome}
        </div>
        <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] truncate mt-0.5">
          {item.codigo}
          {item.produtoConfig?.unidade ? ` · ${item.produtoConfig.unidade}` : ''}
        </div>
      </div>
      <div>
        <TipoBadge tipo={item.tipo} />
      </div>
      <div className="font-mono text-xs text-[var(--ink)] tracking-[0.02em] truncate">
        {classificacao(item)}
      </div>
      <div className="text-right">
        <span className="font-mono text-sm text-[var(--ink)] tracking-tight">
          {brl.format(item.valor)}
        </span>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          {relativeDate(item.updatedAt)}
        </div>
      </div>
      <div>
        <StatusBadge status={item.status} />
      </div>
      <RowActions item={item} onOpen={onOpen} onDelete={onDelete} />
    </div>
  );
}

function MobileRow({
  item,
  onOpen,
  onDelete,
}: {
  item: Produto;
  onOpen: () => void;
  onDelete: () => void;
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
            {item.nome}
          </div>
          <div className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)] mt-0.5">
            {item.codigo}
          </div>
          <div className="text-xs text-[var(--ink-muted)] mt-1 line-clamp-1">
            {item.descricao}
          </div>
        </div>
        <span className="font-mono text-sm text-[var(--ink)] tracking-tight flex-none">
          {brl.format(item.valor)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TipoBadge tipo={item.tipo} />
          <span className="font-mono text-[11px] tracking-[0.02em] text-[var(--ink-muted)]">
            {classificacao(item)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <RowActions item={item} onOpen={onOpen} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

function RowActions({
  item,
  onOpen,
  onDelete,
}: {
  item: Produto;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <IconButton
        label={`Ver detalhes de ${item.nome}`}
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
        label={`Editar ${item.nome}`}
        onClick={() => navigate(`/produtos/${item.id}/editar`)}
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
        label={`Desativar ${item.nome}`}
        onClick={onDelete}
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

function TipoBadge({ tipo }: { tipo: ItemTipo }) {
  if (tipo === 'produto') {
    return (
      <span className="badge bg-[var(--line-soft)] text-[var(--ink)]">
        {tipoLabel.produto}
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--blue-soft)] text-[var(--blue)]">
      {tipoLabel.servico}
    </span>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'ativo') {
    return (
      <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
        Ativo
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--line-soft)] text-[var(--ink-muted)]">
      Inativo
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
                <SkeletonLine width={220} />
                <SkeletonLine width={140} />
              </div>
              <SkeletonLine width={60} />
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
              <SkeletonLine width={240} />
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
        Não foi possível carregar os produtos.
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

function NoCompanyState() {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-xl font-semibold text-[var(--ink)]">
        Selecione uma empresa.
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Cada produto é cadastrado dentro de uma empresa. Escolha uma no seletor do topo — ou cadastre a primeira.
      </p>
      <Link
        to="/empresas/nova"
        className="mt-6 btn-secondary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Cadastrar empresa
      </Link>
    </div>
  );
}

function EmptyGlobal() {
  return (
    <div className="card p-10 md:p-16 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <path
            d="M14 3l10 5v12l-10 5-10-5V8l10-5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M4 8l10 5 10-5M14 13v12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        Nenhum produto <em className="font-serif italic">cadastrado</em>.
      </h2>
      <p className="mt-3 text-sm text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
        Cadastra o primeiro. Depois é só escolher na hora de emitir a nota —
        classificação fiscal já vai junto.
      </p>
      <Link
        to="/produtos/novo"
        className="mt-6 btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Cadastrar primeiro produto
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
          ? <>Nenhum produto encontrado para "<span className="font-mono tracking-[0.02em]">{label}</span>".</>
          : 'Nenhum produto bate com esses filtros.'}
      </p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Tenta outro pedaço do nome, do código ou ajusta os filtros.
      </p>
    </div>
  );
}
