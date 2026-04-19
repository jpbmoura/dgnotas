import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getProduto,
  statusLabel,
  tipoLabel,
  type Produto,
  type Retencao,
} from '../../api/produtos';
import { useCompany } from '../../contexts/CompanyContext';
import { HttpError } from '../../lib/http';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
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

// ---------- Page ----------

export function Detalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresaAtiva } = useCompany();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Produto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
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
        setItem(p);
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
  }, [id, empresaAtiva]);

  if (loading) return <LoadingState />;
  if (notFound || !item) return <NotFoundState />;
  if (loadError) return <LoadErrorState message={loadError} />;

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
          <li className="text-[var(--ink)] truncate max-w-[320px]">
            {item.nome}
          </li>
        </ol>
      </nav>

      <Header item={item} onEdit={() => navigate(`/produtos/${item.id}/editar`)} />

      <div className="mt-8 space-y-6">
        <BasicoCard item={item} />
        <ClassificacaoCard item={item} />
        <TributacaoCard item={item} />
        <IbsCbsCard item={item} />
      </div>
    </div>
  );
}

export default Detalhes;

// ---------- Header ----------

function Header({
  item,
  onEdit,
}: {
  item: Produto;
  onEdit: () => void;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TipoBadge tipo={item.tipo} />
          <StatusBadge status={item.status} />
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
          {item.nome}
        </h1>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink-muted)]">
            {item.codigo}
          </span>
          <span className="text-xs text-[var(--ink-muted)]">
            Atualizado {relativeDate(item.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-none">
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Valor
          </div>
          <div className="font-mono text-2xl md:text-3xl font-semibold text-[var(--ink)] tracking-tight">
            {brl.format(item.valor)}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="btn-primary h-12 px-6 rounded-lg font-medium text-sm"
        >
          Editar
        </button>
      </div>
    </header>
  );
}

// ---------- Cards ----------

function BasicoCard({ item }: { item: Produto }) {
  return (
    <Card title="Básico">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <Row label="Código interno" value={item.codigo} mono />
        <Row label="Tipo" value={tipoLabel[item.tipo]} />
        {item.tipo === 'produto' && (
          <Row label="Unidade" value={item.produtoConfig.unidade || '—'} />
        )}
        <Row label="Descrição" value={item.descricao || '—'} full />
      </dl>
    </Card>
  );
}

function ClassificacaoCard({ item }: { item: Produto }) {
  if (item.tipo === 'produto') {
    const p = item.produtoConfig;
    return (
      <Card title="Classificação fiscal">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Row label="NCM" value={p.ncm ?? '—'} mono />
          <Row label="GTIN / EAN" value={p.gtin || 'Sem código'} mono />
          <Row label="Sujeito à ST" value={p.sujeitoST ? 'Sim' : 'Não'} />
          {p.sujeitoST && <Row label="CEST" value={p.cest || '—'} mono />}
          <Row label="Origem" value={origemLabel(p.origem)} />
          <Row label="CFOP padrão" value={p.cfop || '—'} mono />
        </dl>
      </Card>
    );
  }

  const s = item.servicoConfig;
  return (
    <Card title="Classificação do serviço">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <Row label="Código LC 116" value={s.lc116 || '—'} mono />
        <Row label="CTISS" value={s.ctiss || '—'} mono />
        <Row label="CNAE relacionado" value={s.cnaeRelacionado || '—'} mono />
      </dl>
    </Card>
  );
}

function TributacaoCard({ item }: { item: Produto }) {
  if (item.tipo === 'produto') {
    const p = item.produtoConfig;
    return (
      <Card title="Tributação">
        <SubSection label="ICMS">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Row label="CST / CSOSN" value={p.cstOrCsosn || '—'} mono />
            <Row
              label="Alíquota ICMS"
              value={`${p.aliqIcms.toLocaleString('pt-BR')}%`}
              mono
            />
          </dl>
        </SubSection>
        <SubSection label="PIS / COFINS">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Row label="CST PIS" value={p.cstPis || '—'} mono />
            <Row
              label="Alíquota PIS"
              value={`${p.aliqPis.toLocaleString('pt-BR')}%`}
              mono
            />
            <Row label="CST COFINS" value={p.cstCofins || '—'} mono />
            <Row
              label="Alíquota COFINS"
              value={`${p.aliqCofins.toLocaleString('pt-BR')}%`}
              mono
            />
          </dl>
        </SubSection>
      </Card>
    );
  }

  const s = item.servicoConfig;
  return (
    <Card title="Tributação">
      <SubSection label="ISS">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Row
            label="Alíquota ISS"
            value={`${s.aliqIss.toLocaleString('pt-BR')}%`}
            mono
          />
          <Row
            label="ISS retido pelo tomador"
            value={s.issRetido ? 'Sim' : 'Não'}
          />
          <Row
            label="Local de incidência"
            value={
              s.localIncidencia === 'prestador'
                ? 'Município do prestador'
                : 'Município do tomador'
            }
          />
        </dl>
      </SubSection>
      <SubSection label="Retenções na fonte">
        <RetencoesGrid servico={s} />
      </SubSection>
    </Card>
  );
}

function RetencoesGrid({
  servico,
}: {
  servico: NonNullable<Produto['servicoConfig']>;
}) {
  const items: { label: string; field: Retencao }[] = [
    { label: 'PIS', field: servico.retPis },
    { label: 'COFINS', field: servico.retCofins },
    { label: 'CSLL', field: servico.retCsll },
    { label: 'IRRF', field: servico.retIrrf },
    { label: 'INSS', field: servico.retInss },
  ];

  const anyEnabled = items.some((x) => x.field.enabled);

  if (!anyEnabled) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        Nenhuma retenção configurada pra esse item.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map(({ label, field }) => (
        <div
          key={label}
          className={`rounded-xl border p-3 ${
            field.enabled
              ? 'border-[var(--line)] bg-white'
              : 'border-[var(--line)] bg-[var(--line-soft)]/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              {label}
            </span>
            {field.enabled ? (
              <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                Ativa
              </span>
            ) : (
              <span className="badge bg-[var(--line-soft)] text-[var(--ink-muted)]">
                Off
              </span>
            )}
          </div>
          <div
            className={`mt-2 font-mono text-sm tracking-tight ${
              field.enabled ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'
            }`}
          >
            {field.enabled
              ? `${field.aliq.toLocaleString('pt-BR')}%`
              : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

function IbsCbsCard({ item }: { item: Produto }) {
  return (
    <Card
      title="IBS / CBS"
      hint="Obrigatório desde janeiro de 2026 pela reforma tributária."
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <Row label="CST IBS/CBS" value={item.ibsCbs.cstIbsCbs} mono />
        <Row label="cClassTrib" value={item.ibsCbs.cClassTrib} mono />
      </dl>
    </Card>
  );
}

// ---------- Primitives ----------

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-6 md:p-8">
      <header className="mb-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          {title}
        </h2>
        {hint && (
          <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function SubSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 border-t border-[var(--line-soft)] first:border-t-0">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink)] mb-3">
        {label}
      </h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-[var(--ink)] break-words ${
          mono ? 'font-mono tracking-[0.02em]' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ---------- Badges ----------

function TipoBadge({ tipo }: { tipo: Produto['tipo'] }) {
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

function StatusBadge({ status }: { status: Produto['status'] }) {
  if (status === 'ativo') {
    return (
      <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
        {statusLabel.ativo}
      </span>
    );
  }
  return (
    <span className="badge bg-[var(--line-soft)] text-[var(--ink-muted)]">
      {statusLabel.inativo}
    </span>
  );
}

function origemLabel(codigo: string): string {
  const map: Record<string, string> = {
    '0': '0 — Nacional',
    '1': '1 — Estrangeira, importação direta',
    '2': '2 — Estrangeira, mercado interno',
    '3': '3 — Nacional, CI > 40%',
    '4': '4 — Nacional, PPB',
    '5': '5 — Nacional, CI ≤ 40%',
    '6': '6 — Estrangeira, sem similar nacional (CAMEX)',
    '7': '7 — Estrangeira mercado interno, sem similar (CAMEX)',
    '8': '8 — Nacional, CI > 70%',
  };
  return map[codigo] ?? codigo ?? '—';
}

// ---------- States ----------

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 rounded-full bg-[var(--line-soft)] animate-pulse" />
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-24 rounded-full bg-[var(--line-soft)] animate-pulse" />
          <div className="h-10 w-full max-w-xl rounded-full bg-[var(--line-soft)] animate-pulse" />
        </div>
        <div className="h-12 w-32 rounded-lg bg-[var(--line-soft)] animate-pulse" />
      </div>
      <div className="card p-8 space-y-4">
        <div className="h-4 w-40 rounded-full bg-[var(--line-soft)] animate-pulse" />
        <div className="h-4 w-full rounded-full bg-[var(--line-soft)] animate-pulse" />
        <div className="h-4 w-3/4 rounded-full bg-[var(--line-soft)] animate-pulse" />
      </div>
    </div>
  );
}

function NotFoundState() {
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
