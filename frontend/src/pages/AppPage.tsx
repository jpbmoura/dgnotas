import { useSession } from '../lib/auth-client';
import { useCompany } from '../contexts/CompanyContext';

export function AppPage() {
  const { data: session } = useSession();
  const { empresaAtiva } = useCompany();

  const name = session?.user?.name ?? 'por aí';

  return (
    <div>
      <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
        Em construção
      </span>

      <h1 className="mt-4 text-4xl md:text-5xl font-semibold text-[var(--ink)] leading-tight">
        Oi, <em className="font-serif italic">{name}</em>.
      </h1>
      <p className="mt-4 max-w-xl text-[var(--ink-muted)]">
        Seu painel ainda está sendo montado. Assim que ele estiver pronto, você conecta Hotmart,
        Kiwify ou Eduzz por aqui e a primeira nota sai sozinha.
      </p>

      {empresaAtiva && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Emitindo por {empresaAtiva.nomeFantasia} · {empresaAtiva.cnpj}
        </p>
      )}

      <div className="mt-10 card p-6 max-w-xl">
        <h3 className="font-semibold text-[var(--ink)]">Enquanto isso</h3>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          A Ana está avisada que você entrou. Se quiser adiantar a configuração, é só responder o
          e-mail de boas-vindas que vai chegar em instantes.
        </p>
      </div>
    </div>
  );
}
