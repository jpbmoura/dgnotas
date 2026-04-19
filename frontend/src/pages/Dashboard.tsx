import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { useCompany } from '../contexts/CompanyContext';
import type { Company } from '../api/empresas';
import {
  getDashboardData,
  type DashboardData,
  type DashboardMetrics,
  type Nota,
  type NotaStatus,
  type NotaTipo,
} from '../mocks/dashboard';

// ---------- Alertas derivados da empresa real ----------

type AlertKind = 'warn' | 'error';

type DashboardAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  description: string;
};

/**
 * Deriva alertas a partir do estado da Empresa real.
 * Ordenados por urgência: certificado vencido → certificado vencendo → cadastro pendente.
 */
function deriveEmpresaAlerts(empresa: Company): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const now = Date.now();

  if (empresa.certificado) {
    const validUntil = new Date(empresa.certificado.validUntil + 'T00:00:00Z').getTime();
    const dias = Math.ceil((validUntil - now) / 86_400_000);
    if (dias <= 0) {
      alerts.push({
        id: 'cert-expirado',
        kind: 'error',
        title: 'Certificado digital expirado',
        description:
          'Enquanto não subir um novo certificado, nenhuma nota vai ser assinada. Atualize na aba Certificado da empresa.',
      });
    } else if (dias <= 30) {
      alerts.push({
        id: 'cert-expirando',
        kind: 'warn',
        title: `Seu certificado expira em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
        description:
          'Renova antes pra não travar a emissão. Se precisar de uma mão, a gente te ajuda.',
      });
    }
  } else {
    alerts.push({
      id: 'cert-ausente',
      kind: 'warn',
      title: 'Sem certificado digital',
      description:
        'Sobe o certificado A1 nesta empresa pra começar a emitir notas com validade fiscal.',
    });
  }

  if (empresa.status === 'pendente' && empresa.certificado) {
    alerts.push({
      id: 'cadastro-pendente',
      kind: 'warn',
      title: 'Cadastro da empresa ainda pendente',
      description:
        'Confirma endereço e dados de regime na tela de edição — sem isso, a emissão fica bloqueada.',
    });
  }

  return alerts;
}

// ---------- Formatters ----------

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
});

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return dayMonth.format(d);
}

function formatPct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}%`;
}

// ---------- Page ----------

export function Dashboard() {
  const { data: session } = useSession();
  const { empresaAtiva, loading: companyLoading } = useCompany();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaAtiva) {
      setData(null);
      setLoading(companyLoading);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      setData(getDashboardData(empresaAtiva));
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [empresaAtiva, companyLoading]);

  const alerts = useMemo(
    () => (empresaAtiva ? deriveEmpresaAlerts(empresaAtiva) : []),
    [empresaAtiva],
  );

  const name = session?.user?.name?.split(' ')[0] ?? 'por aí';

  return (
    <div className="space-y-10">
      <Greeting name={name} empresaNome={empresaAtiva?.nomeFantasia ?? null} />

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {alerts.length > 0 && <AlertsSection alerts={alerts} />}
          {data.isEmpty ? (
            <EmptyDashboard />
          ) : (
            <>
              <MetricsSection metrics={data.metrics} />
              <LatestNotes notas={data.ultimasNotas} />
              <QuickActions />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;

// ---------- Greeting ----------

function Greeting({
  name,
  empresaNome,
}: {
  name: string;
  empresaNome: string | null;
}) {
  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-semibold text-[var(--ink)] leading-tight">
        Olá, {name}
      </h1>
      <p className="mt-2 font-serif italic text-[var(--ink-muted)] text-xl md:text-2xl">
        {empresaNome
          ? <>aqui está o resumo de <span className="text-[var(--ink)]">{empresaNome}</span></>
          : 'sua operação começa aqui.'}
      </p>
    </div>
  );
}

// ---------- Alerts ----------

function AlertsSection({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Atenção
        </span>
        {alerts.length > 1 && (
          <span className="badge bg-[var(--ink)] text-white">
            {alerts.length}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {alerts.map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>
    </section>
  );
}

function AlertCard({ alert }: { alert: DashboardAlert }) {
  const tone =
    alert.kind === 'error'
      ? {
          bg: 'var(--color-err-bg, #FEE2E2)',
          fg: 'var(--color-err-fg, #DC2626)',
          label: 'Erro',
        }
      : {
          bg: 'var(--color-warn-bg, #FEF3C7)',
          fg: 'var(--color-warn-fg, #92400E)',
          label: 'Atenção',
        };

  return (
    <div
      className="rounded-2xl border p-5 flex gap-4 items-start"
      style={{
        background: tone.bg,
        borderColor: tone.fg,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <div
        className="flex-none w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(255,255,255,0.6)', color: tone.fg }}
      >
        {alert.kind === 'error' ? <IconError /> : <IconWarn />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="badge"
            style={{ background: 'rgba(255,255,255,0.7)', color: tone.fg }}
          >
            {tone.label}
          </span>
          <h3
            className="text-sm font-semibold"
            style={{ color: tone.fg }}
          >
            {alert.title}
          </h3>
        </div>
        <p
          className="mt-1.5 text-sm leading-relaxed"
          style={{ color: tone.fg, opacity: 0.85 }}
        >
          {alert.description}
        </p>
      </div>
    </div>
  );
}

// ---------- Metrics ----------

function MetricsSection({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section>
      <SectionHeading title="Este mês" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Notas emitidas"
          value={metrics.notasEmitidas.value.toString()}
          delta={metrics.notasEmitidas.deltaPct}
        />
        <MetricCard
          label="Faturamento"
          value={brl.format(metrics.faturamento.value)}
          delta={metrics.faturamento.deltaPct}
          mono
        />
        <MetricCard
          label="Em processamento"
          value={metrics.emProcessamento.toString()}
          hint={
            metrics.emProcessamento > 0
              ? 'Conversando com a prefeitura.'
              : 'Sem pendências.'
          }
        />
        <MetricCard
          label="Rejeitadas"
          value={metrics.rejeitadas.toString()}
          badge={
            metrics.rejeitadas > 0 ? (
              <span
                className="badge"
                style={{
                  background: 'var(--color-err-bg, #FEE2E2)',
                  color: 'var(--color-err-fg, #DC2626)',
                }}
              >
                Revisar
              </span>
            ) : null
          }
          hint={
            metrics.rejeitadas === 0
              ? 'Mês limpo até aqui.'
              : 'Abre a nota pra corrigir.'
          }
        />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  delta,
  hint,
  badge,
  mono,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  badge?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          {label}
        </span>
        {badge}
      </div>
      <div
        className={`mt-3 text-3xl md:text-[2rem] font-semibold text-[var(--ink)] leading-none ${
          mono ? 'font-mono tracking-tight' : ''
        }`}
      >
        {value}
      </div>
      <div className="mt-3 min-h-[1.25rem]">
        {typeof delta === 'number' ? (
          <DeltaIndicator value={delta} />
        ) : hint ? (
          <span className="text-xs text-[var(--ink-muted)]">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

function DeltaIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="text-xs text-[var(--ink-muted)]">
        Igual ao mês anterior
      </span>
    );
  }
  const positive = value > 0;
  const color = positive ? 'var(--accent-deep)' : 'var(--color-err-fg, #DC2626)';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path
          d={positive ? 'M5 8V2M2 5l3-3 3 3' : 'M5 2v6M2 5l3 3 3-3'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-mono tracking-[0.02em]">{formatPct(value)}</span>
      <span className="text-[var(--ink-muted)] font-sans font-normal">
        vs mês anterior
      </span>
    </span>
  );
}

// ---------- Latest notes ----------

function LatestNotes({ notas }: { notas: Nota[] }) {
  return (
    <section>
      <div className="card p-0 overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-6 py-5 border-b border-[var(--line)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Últimas notas
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              As 5 mais recentes.
            </p>
          </div>
          <Link
            to="/notas"
            className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent-deep)] transition-colors inline-flex items-center gap-1"
          >
            Ver todas
            <span aria-hidden>→</span>
          </Link>
        </header>

        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <Th>Número</Th>
                <Th>Tipo</Th>
                <Th>Cliente</Th>
                <Th align="right">Valor</Th>
                <Th>Status</Th>
                <Th align="right">Data</Th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-[var(--line-soft)] last:border-b-0 hover:bg-[var(--line-soft)]/60 transition-colors"
                >
                  <Td>
                    <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink)]">
                      {n.numero}
                    </span>
                  </Td>
                  <Td>
                    <TipoBadge tipo={n.tipo} />
                  </Td>
                  <Td>
                    <span className="text-sm text-[var(--ink)] truncate block max-w-[240px]">
                      {n.cliente}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-sm text-[var(--ink)] tracking-tight">
                      {brl.format(n.valor)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={n.status} />
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-xs text-[var(--ink-muted)] tracking-[0.02em]">
                      {formatDate(n.data)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: empilhado */}
        <ul className="md:hidden divide-y divide-[var(--line-soft)]">
          {notas.map((n) => (
            <li key={n.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs tracking-[0.02em] text-[var(--ink)]">
                      {n.numero}
                    </span>
                    <TipoBadge tipo={n.tipo} />
                  </div>
                  <div className="mt-1 text-sm text-[var(--ink)] truncate">
                    {n.cliente}
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="font-mono text-sm text-[var(--ink)]">
                    {brl.format(n.valor)}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
                    {formatDate(n.data)}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <StatusBadge status={n.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-6 py-3 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] font-medium ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <td
      className={`px-6 py-4 align-middle ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </td>
  );
}

function TipoBadge({ tipo }: { tipo: NotaTipo }) {
  const label = tipo === 'nfe' ? 'NF-e' : 'NFS-e';
  return (
    <span className="badge bg-[var(--blue-soft)] text-[var(--blue)]">
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: NotaStatus }) {
  switch (status) {
    case 'emitida':
      return (
        <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
          Emitida
        </span>
      );
    case 'processando':
      return (
        <span
          className="badge"
          style={{
            background: 'var(--color-warn-bg, #FEF3C7)',
            color: 'var(--color-warn-fg, #92400E)',
          }}
        >
          Processando
        </span>
      );
    case 'rejeitada':
      return (
        <span
          className="badge"
          style={{
            background: 'var(--color-err-bg, #FEE2E2)',
            color: 'var(--color-err-fg, #DC2626)',
          }}
        >
          Rejeitada
        </span>
      );
    case 'cancelada':
      return (
        <span className="badge bg-[var(--line-soft)] text-[var(--ink)]">
          Cancelada
        </span>
      );
    case 'rascunho':
      return (
        <span className="badge bg-[var(--line-soft)] text-[var(--ink)]">
          Rascunho
        </span>
      );
  }
}

// ---------- Quick actions ----------

function QuickActions() {
  const actions = [
    {
      title: 'Emitir NFS-e',
      hint: 'Nota de serviço — cursos, consultorias, mentorias.',
      to: '/notas/nova?tipo=nfse',
      icon: <IconReceipt />,
    },
    {
      title: 'Emitir NF-e',
      hint: 'Nota de produto — quando você vende algo físico.',
      to: '/notas/nova?tipo=nfe',
      icon: <IconPackage />,
    },
    {
      title: 'Novo produto',
      hint: 'Cadastra um novo item pra reusar depois.',
      to: '/produtos/novo',
      icon: <IconPlus />,
    },
  ];

  return (
    <section>
      <SectionHeading title="Ações rápidas" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((a) => (
          <Link
            key={a.title}
            to={a.to}
            className="card p-5 flex items-start gap-4 group"
          >
            <span className="flex-none w-10 h-10 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center transition-colors group-hover:bg-[var(--accent)] group-hover:text-white">
              {a.icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--ink)]">
                {a.title}
              </div>
              <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
                {a.hint}
              </p>
            </div>
            <span
              aria-hidden
              className="ml-auto self-center text-[var(--ink-muted)] group-hover:text-[var(--ink)] transition-colors"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------- Empty state ----------

function EmptyDashboard() {
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
            d="M17 4v5h5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M11 15h6M11 18h4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl md:text-3xl font-semibold text-[var(--ink)]">
        Nenhuma nota por <em className="font-serif italic">aqui ainda</em>.
      </h2>
      <p className="mt-3 text-sm text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
        Conecta uma plataforma de vendas ou emite manual. Assim que a primeira
        sair, o resumo aparece aqui.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Link
          to="/notas/nova"
          className="btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
        >
          Emitir sua primeira nota
        </Link>
        <Link
          to="/integracoes"
          className="btn-secondary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
        >
          Conectar Hotmart
        </Link>
      </div>
    </div>
  );
}

// ---------- Skeleton ----------

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div>
        <SkeletonBlock className="h-5 w-24" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-4 h-8 w-28" />
              <SkeletonBlock className="mt-4 h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--line)]">
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <div className="divide-y divide-[var(--line-soft)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-5 w-14" />
              <SkeletonBlock className="h-3 flex-1 max-w-[220px]" />
              <SkeletonBlock className="h-3 w-20 ml-auto" />
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-full bg-[var(--line-soft)] animate-pulse ${className}`}
    />
  );
}

// ---------- Small primitives ----------

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
      {title}
    </h2>
  );
}

// ---------- Icons ----------

function IconWarn() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 5v3.5M8 11v.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 2.5L1.5 12.5a1 1 0 00.87 1.5h11.26a1 1 0 00.87-1.5L9 2.5a1 1 0 00-1.73 0z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconError() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5v3.5M8 11v.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4 2v14l2-1.2 2 1.2 2-1.2 2 1.2 2-1.2 2 1.2V2H4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 6h6M7 9h6M7 12h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M9 2l6 3v8l-6 3-6-3V5l6-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 5l6 3 6-3M9 8v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M9 3v12M3 9h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
