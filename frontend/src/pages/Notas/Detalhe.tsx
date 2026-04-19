import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/auth-client';
import { getEmpresaDetalhes } from '../../mocks/empresaDetalhes';
import {
  getNotaDetalhes,
  type NotaDetalhes,
  type NotaEvento,
  type NotaEventoTipo,
  type ImpostosNFSe,
  type ImpostosNFe,
  type ImpostosIbsCbs,
} from '../../mocks/notaDetalhes';
import {
  statusLabel,
  tipoLabel,
  type NotaListaStatus,
  type NotaListaTipo,
} from '../../mocks/notas';

// ---------- Formatters ----------

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupChave(c: string) {
  return c.replace(/(.{4})/g, '$1 ').trim();
}

function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

// ---------- Page ----------

export function Detalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState<NotaDetalhes | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const timer = setTimeout(() => {
      const hit = getNotaDetalhes(id);
      if (!hit) setNotFound(true);
      else setNota(hit);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [id]);

  if (loading) return <LoadingState />;
  if (notFound || !nota) return <NotFoundState />;

  const prestador = getEmpresaDetalhes(nota.empresaId);
  const emitidaPor = session?.user?.name ?? 'Você';

  return (
    <div className="pb-12">
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
          <li className="text-[var(--ink)]">
            {tipoLabel[nota.tipo]} nº {nota.numero}
          </li>
        </ol>
      </nav>

      <PageHeader nota={nota} emitidaPor={emitidaPor} />

      {nota.status === 'rejeitada' && <RejectedBanner nota={nota} onRetry={() => navigate('/notas/nova/nfse')} />}
      {nota.status === 'cancelada' && <CanceledBanner nota={nota} />}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DadosEmissaoCard nota={nota} copied={copied} setCopied={setCopied} />

          <div className="grid md:grid-cols-2 gap-6">
            <PrestadorCard prestador={prestador} />
            <TomadorCard nota={nota} />
          </div>

          <ItensCard nota={nota} />

          <ImpostosCard nota={nota} />

          <DiscriminacaoCard nota={nota} />
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-6">
            <TimelineCard events={nota.timeline} />
            <ResumoCard nota={nota} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Detalhe;

// ---------- Page header ----------

function PageHeader({
  nota,
  emitidaPor,
}: {
  nota: NotaDetalhes;
  emitidaPor: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TipoBadge tipo={nota.tipo} />
          <StatusBadge status={nota.status} big />
          <AmbienteBadge ambiente={nota.ambiente} />
        </div>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
          {tipoLabel[nota.tipo]} nº{' '}
          <span className="font-mono tracking-[0.02em]">{nota.numero}</span>
        </h1>
        <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-[var(--ink-muted)]">
          <span>
            Emitida por <span className="text-[var(--ink)] font-medium">{emitidaPor}</span>
          </span>
          <span aria-hidden>•</span>
          <span className="font-mono tracking-[0.02em]">
            {formatDateTime(nota.dataHoraEmissao)}
          </span>
        </div>
      </div>

      <HeaderActions nota={nota} />
    </header>
  );
}

function HeaderActions({ nota }: { nota: NotaDetalhes }) {
  const pdfLabel = nota.tipo === 'nfe' ? 'Baixar DANFE' : 'Baixar DANFSE';
  const autorizada = nota.status === 'autorizada';
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        disabled={!autorizada && nota.status !== 'cancelada'}
        onClick={() => console.log('Baixar PDF', nota.id)}
        className="btn-primary h-11 px-5 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pdfLabel}
      </button>
      <button
        type="button"
        disabled={!autorizada && nota.status !== 'cancelada'}
        onClick={() => console.log('Baixar XML', nota.id)}
        className="btn-secondary h-11 px-5 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Baixar XML
      </button>
      <button
        type="button"
        disabled={!autorizada}
        onClick={() => console.log('Enviar por e-mail', nota.id)}
        className="btn-secondary h-11 px-5 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Enviar por e-mail
      </button>
      <HeaderMenu nota={nota} />
    </div>
  );
}

function HeaderMenu({ nota }: { nota: NotaDetalhes }) {
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
    nota.status === 'autorizada' && hoursSince(nota.dataHoraEmissao) < 24;
  const canCorrigir = nota.tipo === 'nfe' && nota.status === 'autorizada';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais ações"
        className="w-11 h-11 rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)] transition-colors flex items-center justify-center"
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
              console.log('Duplicar', nota.id);
              setOpen(false);
            }}
          >
            Duplicar
          </MenuItem>
          {canCorrigir && (
            <MenuItem
              onClick={() => {
                console.log('Carta de correção', nota.id);
                setOpen(false);
              }}
            >
              Carta de correção
            </MenuItem>
          )}
          {canCancel && (
            <>
              <div className="border-t border-[var(--line-soft)]" />
              <MenuItem
                danger
                onClick={() => {
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
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
        danger
          ? 'hover:bg-[var(--color-err-bg,#FEE2E2)]'
          : 'text-[var(--ink)] hover:bg-[var(--line-soft)]'
      }`}
      style={danger ? { color: 'var(--color-err-fg, #DC2626)' } : undefined}
    >
      {children}
    </button>
  );
}

// ---------- Banners ----------

function RejectedBanner({
  nota,
  onRetry,
}: {
  nota: NotaDetalhes;
  onRetry: () => void;
}) {
  return (
    <div
      className="mt-6 rounded-2xl border p-5 flex gap-4 items-start"
      style={{
        background: 'var(--color-err-bg, #FEE2E2)',
        color: 'var(--color-err-fg, #DC2626)',
        borderColor: 'var(--color-err-fg, #DC2626)',
      }}
    >
      <div
        className="flex-none w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.6)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M9 5.5V9.5M9 12v.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold">
          Nota rejeitada pela prefeitura.
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ opacity: 0.9 }}>
          {nota.motivoRejeicao ?? 'Motivo não informado pela prefeitura.'}
        </p>
        {nota.codigoRejeicao && (
          <span
            className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-pill font-mono text-[11px] uppercase tracking-[0.02em]"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          >
            Código {nota.codigoRejeicao}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="h-10 px-5 rounded-lg font-medium text-sm transition-colors flex-none"
        style={{
          background: 'var(--color-err-fg, #DC2626)',
          color: 'white',
        }}
      >
        Corrigir e reenviar
      </button>
    </div>
  );
}

function CanceledBanner({ nota }: { nota: NotaDetalhes }) {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--line-soft)]/60 p-5 flex gap-4 items-start">
      <div className="flex-none w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--ink-muted)]">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5.5 5.5l7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--ink)]">
          Nota cancelada
          {nota.dataHoraCancelamento && (
            <>
              {' '}em{' '}
              <span className="font-mono tracking-[0.02em]">
                {formatDateTime(nota.dataHoraCancelamento)}
              </span>
            </>
          )}
          .
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">
          Motivo: {nota.motivoCancelamento}
        </p>
      </div>
    </div>
  );
}

// ---------- Cards ----------

function DadosEmissaoCard({
  nota,
  copied,
  setCopied,
}: {
  nota: NotaDetalhes;
  copied: boolean;
  setCopied: (v: boolean) => void;
}) {
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DocumentCard eyebrow="01 — Emissão" title="Dados da nota">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
        <InfoCell label="Número">
          <span className="font-mono text-sm tracking-[0.02em] text-[var(--ink)]">
            {nota.numero}
          </span>
        </InfoCell>
        <InfoCell label="Série">
          <span className="font-mono text-sm tracking-[0.02em] text-[var(--ink)]">
            {nota.serie}
          </span>
        </InfoCell>
        <InfoCell label="Ambiente">
          <AmbienteBadge ambiente={nota.ambiente} />
        </InfoCell>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Chave de acesso
          </span>
          <button
            type="button"
            onClick={() => copy(nota.chaveAcesso)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            aria-label="Copiar chave de acesso"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2 6.5l2.5 2.5L10 3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <rect
                    x="3.5"
                    y="3.5"
                    width="6"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M8 3V2.5A1 1 0 007 1.5H3A1 1 0 002 2.5v4A1 1 0 003 7.5h.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
                Copiar
              </>
            )}
          </button>
        </div>
        <div className="rounded-lg bg-[var(--line-soft)] px-4 py-3 font-mono text-xs tracking-[0.05em] text-[var(--ink)] break-all">
          {groupChave(nota.chaveAcesso)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <InfoCell label="Protocolo de autorização">
          {nota.protocoloAutorizacao ? (
            <span className="font-mono text-sm tracking-[0.02em] text-[var(--ink)]">
              {nota.protocoloAutorizacao}
            </span>
          ) : (
            <span className="text-sm text-[var(--ink-muted)]">—</span>
          )}
        </InfoCell>
        <InfoCell label="Data de autorização">
          {nota.dataHoraAutorizacao ? (
            <span className="font-mono text-sm tracking-[0.02em] text-[var(--ink)]">
              {formatDateTime(nota.dataHoraAutorizacao)}
            </span>
          ) : (
            <span className="text-sm text-[var(--ink-muted)]">—</span>
          )}
        </InfoCell>
      </div>
    </DocumentCard>
  );
}

function PrestadorCard({
  prestador,
}: {
  prestador: ReturnType<typeof getEmpresaDetalhes>;
}) {
  return (
    <DocumentCard eyebrow="02 — Prestador" title="Quem emitiu">
      {prestador ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-[var(--ink)]">
              {prestador.razaoSocial}
            </div>
            <div className="text-xs text-[var(--ink-muted)] mt-0.5">
              {prestador.nomeFantasia}
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-y-2 text-xs">
            <InlineRow label="CNPJ">
              <span className="font-mono tracking-[0.02em]">{prestador.cnpj}</span>
            </InlineRow>
            {prestador.inscricaoMunicipal && (
              <InlineRow label="IM">
                <span className="font-mono tracking-[0.02em]">
                  {prestador.inscricaoMunicipal}
                </span>
              </InlineRow>
            )}
            {prestador.logradouro && (
              <InlineRow label="Endereço">
                <span className="text-[var(--ink)] leading-relaxed">
                  {[prestador.logradouro, prestador.numero].filter(Boolean).join(', ')}
                  {prestador.complemento ? ` · ${prestador.complemento}` : ''}
                  {prestador.bairro ? ` — ${prestador.bairro}` : ''}
                  <br />
                  {[prestador.municipio, prestador.uf].filter(Boolean).join('/')}
                  {prestador.cep ? ` · ${prestador.cep}` : ''}
                </span>
              </InlineRow>
            )}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          Empresa emissora não encontrada.
        </p>
      )}
    </DocumentCard>
  );
}

function TomadorCard({ nota }: { nota: NotaDetalhes }) {
  return (
    <DocumentCard eyebrow="03 — Tomador" title="Quem recebeu">
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[var(--ink)]">
          {nota.cliente.nome}
        </div>
        <dl className="grid grid-cols-1 gap-y-2 text-xs">
          <InlineRow
            label={nota.cliente.documento.length <= 14 ? 'CPF' : 'CNPJ'}
          >
            <span className="font-mono tracking-[0.02em]">
              {nota.cliente.documento}
            </span>
          </InlineRow>
          {nota.tomadorInscricaoMunicipal && (
            <InlineRow label="IM">
              <span className="font-mono tracking-[0.02em]">
                {nota.tomadorInscricaoMunicipal}
              </span>
            </InlineRow>
          )}
          <InlineRow label="E-mail">
            <a
              href={`mailto:${nota.tomadorEmail}`}
              className="text-[var(--ink)] hover:text-[var(--accent-deep)] transition-colors"
            >
              {nota.tomadorEmail}
            </a>
          </InlineRow>
          <InlineRow label="Endereço">
            <span className="text-[var(--ink)] leading-relaxed">
              {nota.tomadorEndereco}
            </span>
          </InlineRow>
        </dl>
      </div>
    </DocumentCard>
  );
}

function ItensCard({ nota }: { nota: NotaDetalhes }) {
  const titulo = nota.tipo === 'nfe' ? 'Produtos' : 'Serviços';
  const total = nota.itens.reduce(
    (acc, it) => acc + it.quantidade * it.valorUnitario,
    0,
  );

  return (
    <DocumentCard eyebrow={`04 — ${titulo}`} title="O que foi cobrado">
      <div className="border-t border-b border-[var(--line-soft)]">
        <div
          className="hidden md:grid grid-cols-[1fr_60px_120px_120px_140px] gap-4 px-4 py-3 border-b border-[var(--line-soft)]"
        >
          <ColHeader>Descrição</ColHeader>
          <ColHeader>Un.</ColHeader>
          <ColHeader align="right">Qtd.</ColHeader>
          <ColHeader align="right">Unit.</ColHeader>
          <ColHeader align="right">Total</ColHeader>
        </div>
        {nota.itens.map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-[1fr_60px_120px_120px_140px] gap-4 px-4 py-4"
          >
            <div className="text-sm text-[var(--ink)]">{it.descricao}</div>
            <div className="font-mono text-xs text-[var(--ink-muted)] md:text-left">
              <span className="md:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                Un.
              </span>
              {it.unidade}
            </div>
            <div className="font-mono text-sm text-[var(--ink)] md:text-right">
              <span className="md:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                Qtd.
              </span>
              {it.quantidade}
            </div>
            <div className="font-mono text-sm tracking-tight text-[var(--ink)] md:text-right">
              <span className="md:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                Unit.
              </span>
              {brl.format(it.valorUnitario)}
            </div>
            <div className="font-mono text-sm tracking-tight text-[var(--ink)] md:text-right font-semibold">
              <span className="md:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                Total
              </span>
              {brl.format(it.quantidade * it.valorUnitario)}
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 flex items-baseline justify-between sm:justify-end gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Total dos itens
        </span>
        <span className="font-mono text-xl font-semibold text-[var(--ink)] tracking-tight">
          {brl.format(total)}
        </span>
      </div>
    </DocumentCard>
  );
}

function ImpostosCard({ nota }: { nota: NotaDetalhes }) {
  return (
    <DocumentCard eyebrow="05 — Tributos" title="Impostos da nota">
      {nota.impostosNfse && <ImpostosNFSeBloco impostos={nota.impostosNfse} />}
      {nota.impostosNfe && <ImpostosNFeBloco impostos={nota.impostosNfe} />}
      <IbsCbsBloco impostos={nota.impostosIbsCbs} />
    </DocumentCard>
  );
}

function ImpostosNFSeBloco({ impostos }: { impostos: ImpostosNFSe }) {
  const retList: [string, number, number][] = [
    ['PIS', impostos.retencoes.pis.aliq, impostos.retencoes.pis.valor],
    ['COFINS', impostos.retencoes.cofins.aliq, impostos.retencoes.cofins.valor],
    ['CSLL', impostos.retencoes.csll.aliq, impostos.retencoes.csll.valor],
    ['IRRF', impostos.retencoes.irrf.aliq, impostos.retencoes.irrf.valor],
    ['INSS', impostos.retencoes.inss.aliq, impostos.retencoes.inss.valor],
  ];
  const ativas = retList.filter(([, , v]) => v > 0);

  return (
    <div className="space-y-6">
      <div>
        <BlocoTitle>ISS</BlocoTitle>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <InfoCell label="Base de cálculo" mono>
            {brl.format(impostos.baseCalculo)}
          </InfoCell>
          <InfoCell label="Alíquota" mono>
            {brlCompact.format(impostos.aliqIss)}%
          </InfoCell>
          <InfoCell label="Valor ISS" mono>
            {brl.format(impostos.valorIss)}
          </InfoCell>
        </div>
      </div>

      <div>
        <BlocoTitle>Retenções na fonte</BlocoTitle>
        {ativas.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Nenhuma retenção aplicável.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {ativas.map(([nome, aliq, valor]) => (
              <InlineRow key={nome} label={nome}>
                <span className="font-mono tracking-tight text-sm text-[var(--ink)]">
                  {brlCompact.format(aliq)}% ·{' '}
                  <span style={{ color: 'var(--color-err-fg, #DC2626)' }}>
                    − {brl.format(valor)}
                  </span>
                </span>
              </InlineRow>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ImpostosNFeBloco({ impostos }: { impostos: ImpostosNFe }) {
  const rows: {
    label: string;
    base: number;
    aliq: number;
    valor: number;
  }[] = [
    { label: 'ICMS', base: impostos.baseIcms, aliq: impostos.aliqIcms, valor: impostos.valorIcms },
    { label: 'IPI', base: impostos.baseIpi, aliq: impostos.aliqIpi, valor: impostos.valorIpi },
    { label: 'PIS', base: impostos.basePis, aliq: impostos.aliqPis, valor: impostos.valorPis },
    { label: 'COFINS', base: impostos.baseCofins, aliq: impostos.aliqCofins, valor: impostos.valorCofins },
  ];
  return (
    <div className="space-y-6">
      <div>
        <BlocoTitle>Impostos sobre produto</BlocoTitle>
        <div className="mt-3 border-t border-b border-[var(--line-soft)]">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-3 py-2 border-b border-[var(--line-soft)]">
            <ColHeader>Tributo</ColHeader>
            <ColHeader align="right">Base</ColHeader>
            <ColHeader align="right">Alíquota</ColHeader>
            <ColHeader align="right">Valor</ColHeader>
          </div>
          {rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr] gap-4 px-3 py-3 text-sm"
            >
              <div className="font-medium text-[var(--ink)]">{r.label}</div>
              <div className="font-mono text-xs tracking-tight text-[var(--ink-muted)] sm:text-right">
                <span className="sm:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                  Base
                </span>
                {brl.format(r.base)}
              </div>
              <div className="font-mono text-xs tracking-tight text-[var(--ink)] sm:text-right">
                <span className="sm:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                  Alíq.
                </span>
                {brlCompact.format(r.aliq)}%
              </div>
              <div className="font-mono text-sm tracking-tight text-[var(--ink)] sm:text-right font-semibold">
                <span className="sm:hidden font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mr-2">
                  Valor
                </span>
                {brl.format(r.valor)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IbsCbsBloco({ impostos }: { impostos: ImpostosIbsCbs }) {
  return (
    <div className="mt-6">
      <BlocoTitle>IBS / CBS</BlocoTitle>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Reforma tributária — exigível desde jan/2026.
      </p>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
        <InfoCell label="CST" mono>
          {impostos.cst}
        </InfoCell>
        <InfoCell label="cClassTrib" mono>
          {impostos.cClassTrib}
        </InfoCell>
        <InfoCell label="Valor IBS" mono>
          {brl.format(impostos.valorIbs)}
        </InfoCell>
        <InfoCell label="Valor CBS" mono>
          {brl.format(impostos.valorCbs)}
        </InfoCell>
      </div>
    </div>
  );
}

function DiscriminacaoCard({ nota }: { nota: NotaDetalhes }) {
  return (
    <DocumentCard
      eyebrow="06 — Texto na nota"
      title="Discriminação e observações"
    >
      <div className="space-y-5">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Discriminação do serviço
          </span>
          <p className="mt-2 text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
            {nota.discriminacao || <em className="text-[var(--ink-muted)]">Sem descrição adicional.</em>}
          </p>
        </div>
        {nota.observacoes && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
              Observações
            </span>
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed whitespace-pre-wrap">
              {nota.observacoes}
            </p>
          </div>
        )}
      </div>
    </DocumentCard>
  );
}

// ---------- Side column ----------

function TimelineCard({ events }: { events: NotaEvento[] }) {
  return (
    <DocumentCard eyebrow="Eventos" title="Linha do tempo">
      <ol className="relative space-y-5">
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          return (
            <li key={i} className="relative flex gap-4">
              {!isLast && (
                <span
                  className="absolute left-[15px] top-8 bottom-[-20px] w-px bg-[var(--line)]"
                  aria-hidden
                />
              )}
              <TimelineIcon tipo={ev.tipo} />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-sm font-semibold text-[var(--ink)]">
                  {ev.titulo}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] mt-0.5">
                  {formatDate(ev.timestamp)} · {formatTime(ev.timestamp)}
                </div>
                <p className="mt-1.5 text-xs text-[var(--ink-muted)] leading-relaxed">
                  {ev.descricao}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </DocumentCard>
  );
}

function TimelineIcon({ tipo }: { tipo: NotaEventoTipo }) {
  const color = iconColorFor(tipo);
  return (
    <span
      className="flex-none w-8 h-8 rounded-full flex items-center justify-center"
      style={{ background: color.bg, color: color.fg }}
    >
      {iconSvg(tipo)}
    </span>
  );
}

function iconColorFor(tipo: NotaEventoTipo) {
  switch (tipo) {
    case 'autorizada':
      return { bg: 'var(--accent-soft)', fg: 'var(--accent-deep)' };
    case 'rejeitada':
      return {
        bg: 'var(--color-err-bg, #FEE2E2)',
        fg: 'var(--color-err-fg, #DC2626)',
      };
    case 'cancelada':
      return { bg: 'var(--line-soft)', fg: 'var(--ink-muted)' };
    case 'correcao':
      return { bg: 'var(--blue-soft)', fg: 'var(--blue)' };
    default:
      return { bg: 'var(--line-soft)', fg: 'var(--ink)' };
  }
}

function iconSvg(tipo: NotaEventoTipo) {
  switch (tipo) {
    case 'autorizada':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M3 7.5l3 3 5-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'rejeitada':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M4 4l6 6M10 4L4 10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'cancelada':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M4 4l6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'enviada':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M2 7l10-4-4 10-2-4-4-2z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'correcao':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M2 7a5 5 0 018.6-3.5M12 7a5 5 0 01-8.6 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M10 1v3h-3M4 13v-3h3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M4 2h5l2 2v8H4z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M9 2v2h2" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}

function ResumoCard({ nota }: { nota: NotaDetalhes }) {
  return (
    <DocumentCard eyebrow="Totais" title="Resumo financeiro">
      <dl className="space-y-3">
        <ResumoRow label="Valor bruto" value={brl.format(nota.valor)} />
        {nota.desconto > 0 && (
          <ResumoRow
            label="Desconto"
            value={`− ${brl.format(nota.desconto)}`}
            danger
          />
        )}
        {nota.retidoTotal > 0 && (
          <ResumoRow
            label="Retenções"
            value={`− ${brl.format(nota.retidoTotal)}`}
            danger
          />
        )}
      </dl>

      <div
        className="mt-5 rounded-xl p-4"
        style={{ background: 'var(--accent-soft)' }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--accent-deep)]">
          Valor líquido
        </div>
        <div className="mt-1 font-mono text-2xl font-semibold text-[var(--accent-deep)] tracking-tight">
          {brl.format(Math.max(0, nota.valorLiquido))}
        </div>
      </div>
    </DocumentCard>
  );
}

function ResumoRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-[var(--ink-muted)]">{label}</dt>
      <dd
        className="font-mono text-sm tracking-tight"
        style={{
          color: danger ? 'var(--color-err-fg, #DC2626)' : 'var(--ink)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}

// ---------- Primitives ----------

function DocumentCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-6 md:p-7">
      <header className="mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          {eyebrow}
        </div>
        <h2 className="mt-1 font-serif italic text-2xl text-[var(--ink)] leading-tight">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function BlocoTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink)] font-medium">
      {children}
    </h3>
  );
}

function InfoCell({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-[var(--ink)] break-words ${
          mono ? 'font-mono tracking-[0.02em]' : ''
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

function InlineRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] min-w-[72px]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--ink)] min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function ColHeader({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={`font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </div>
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

function StatusBadge({
  status,
  big,
}: {
  status: NotaListaStatus;
  big?: boolean;
}) {
  const sizeCls = big ? 'text-[13px] px-3 py-1.5' : '';
  const base =
    'inline-flex items-center gap-1.5 rounded-pill font-mono uppercase tracking-[0.02em] font-medium';
  switch (status) {
    case 'autorizada':
      return (
        <span
          className={`${base} ${big ? sizeCls : 'badge'} bg-[var(--accent-soft)] text-[var(--accent-deep)]`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
          {statusLabel.autorizada}
        </span>
      );
    case 'processando':
      return (
        <span
          className={`${base} ${big ? sizeCls : 'badge'}`}
          style={{
            background: 'var(--color-warn-bg, #FEF3C7)',
            color: 'var(--color-warn-fg, #92400E)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            aria-hidden
            style={{ background: 'var(--color-warn-fg, #92400E)' }}
          />
          {statusLabel.processando}
        </span>
      );
    case 'rejeitada':
      return (
        <span
          className={`${base} ${big ? sizeCls : 'badge'}`}
          style={{
            background: 'var(--color-err-bg, #FEE2E2)',
            color: 'var(--color-err-fg, #DC2626)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            aria-hidden
            style={{ background: 'var(--color-err-fg, #DC2626)' }}
          />
          {statusLabel.rejeitada}
        </span>
      );
    case 'cancelada':
      return (
        <span
          className={`${base} ${big ? sizeCls : 'badge'} bg-[var(--line-soft)] text-[var(--ink-muted)]`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)]"
            aria-hidden
          />
          {statusLabel.cancelada}
        </span>
      );
  }
}

function AmbienteBadge({ ambiente }: { ambiente: 'producao' | 'homologacao' }) {
  if (ambiente === 'producao') {
    return (
      <span className="badge bg-[var(--line-soft)] text-[var(--ink)]">
        Produção
      </span>
    );
  }
  return (
    <span
      className="badge"
      style={{
        background: 'var(--color-warn-bg, #FEF3C7)',
        color: 'var(--color-warn-fg, #92400E)',
      }}
    >
      Homologação
    </span>
  );
}

// ---------- States ----------

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-40 rounded-full bg-[var(--line-soft)] animate-pulse" />
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-6 w-32 rounded-full bg-[var(--line-soft)] animate-pulse" />
          <div className="h-10 w-80 rounded-full bg-[var(--line-soft)] animate-pulse" />
          <div className="h-4 w-64 rounded-full bg-[var(--line-soft)] animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-28 rounded-lg bg-[var(--line-soft)] animate-pulse" />
          <div className="h-11 w-11 rounded-lg bg-[var(--line-soft)] animate-pulse" />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="h-3 w-24 rounded-full bg-[var(--line-soft)] animate-pulse" />
              <div className="h-6 w-48 rounded-full bg-[var(--line-soft)] animate-pulse" />
              <div className="h-4 w-full rounded-full bg-[var(--line-soft)] animate-pulse" />
              <div className="h-4 w-3/4 rounded-full bg-[var(--line-soft)] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="card p-6 space-y-3">
            <div className="h-3 w-20 rounded-full bg-[var(--line-soft)] animate-pulse" />
            <div className="h-6 w-40 rounded-full bg-[var(--line-soft)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="card p-12 text-center">
      <h2 className="text-2xl font-semibold text-[var(--ink)]">
        Nota não encontrada.
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        O link pode estar quebrado ou a nota foi removida.
      </p>
      <Link
        to="/notas"
        className="mt-6 btn-primary h-12 px-6 rounded-lg font-medium text-sm inline-flex items-center justify-center"
      >
        Voltar pra lista
      </Link>
    </div>
  );
}
