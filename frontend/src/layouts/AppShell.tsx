import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Logo } from '../components/landing/Logo';
import { CompanyProvider, useCompany } from '../contexts/CompanyContext';
import { regimeLabel, type Company } from '../api/empresas';
import { signOut, useSession } from '../lib/auth-client';

// ---------- Public layout ----------

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <CompanyProvider>
      <Shell>{children}</Shell>
    </CompanyProvider>
  );
}

function Shell({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AppHeader />
      <main className="mx-auto max-w-[1280px] px-6 lg:px-8 py-10">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export default AppShell;

// ---------- Header ----------

const navItems = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/empresas', label: 'Empresas', end: false },
  { to: '/produtos', label: 'Produtos', end: false },
  { to: '/notas', label: 'Notas', end: false },
];

function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="relative mx-auto max-w-[1280px] h-full px-6 lg:px-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="lg:hidden -ml-2 p-2 rounded-lg text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link to="/app" className="flex items-center gap-2 flex-none">
          <Logo />
          <span className="font-serif text-xl tracking-tight hidden sm:inline">
            DGNotas
          </span>
        </Link>

        <div className="hidden sm:block h-6 w-px bg-[var(--line)]" />

        <CompanySelector />

        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavItem>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationsButton />
          <UserMenu />
        </div>
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

// ---------- Nav item ----------

function NavItem({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'text-[var(--ink)]'
            : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span>{children}</span>
          {isActive && (
            <span
              aria-hidden
              className="absolute left-3 right-3 -bottom-[13px] h-[2px] bg-[var(--accent)]"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

// ---------- Company selector ----------

function CompanySelector() {
  const navigate = useNavigate();
  const { empresas, empresaAtiva, setEmpresaAtiva, loading } = useCompany();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (c) =>
        c.nomeFantasia.toLowerCase().includes(q) ||
        c.razaoSocial.toLowerCase().includes(q) ||
        c.cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
    );
  }, [empresas, query]);

  const empty = !loading && empresas.length === 0;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--line)] bg-white hover:border-[var(--ink)] transition-colors min-w-0 max-w-[240px]"
      >
        <CompanyAvatar company={empresaAtiva} loading={loading} />
        <div className="min-w-0 text-left">
          {loading ? (
            <>
              <SkeletonLine width={88} />
              <SkeletonLine width={64} className="mt-1" />
            </>
          ) : empty ? (
            <div className="text-sm text-[var(--ink)] font-medium truncate">
              Cadastre sua primeira empresa
            </div>
          ) : (
            <>
              <div className="text-sm text-[var(--ink)] font-medium truncate">
                {empresaAtiva?.nomeFantasia}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] truncate">
                {empresaAtiva ? abbreviateCNPJ(empresaAtiva.cnpj) : '—'}
              </div>
            </>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`flex-none text-[var(--ink-muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          aria-hidden
        >
          <path
            d="M2 4.5L6 8.5L10 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] w-[320px] max-w-[90vw] rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden"
          role="listbox"
        >
          {empty ? (
            <div className="p-5">
              <p className="text-sm text-[var(--ink)] font-medium">
                Nenhuma empresa por aqui ainda.
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Cadastra a primeira pra começar a emitir notas.
              </p>
              <Link
                to="/empresas/nova"
                onClick={() => setOpen(false)}
                className="mt-4 btn-primary h-10 px-4 rounded-lg font-medium text-sm inline-flex items-center justify-center"
              >
                Cadastrar empresa
              </Link>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-[var(--line)]">
                <div className="relative">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                  >
                    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar empresa ou CNPJ"
                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-[var(--line-soft)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--ink)]"
                  />
                </div>
              </div>

              <ul className="max-h-[280px] overflow-y-auto py-2">
                {loading &&
                  [0, 1, 2].map((i) => (
                    <li key={i} className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--line-soft)] animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <SkeletonLine width={140} />
                          <SkeletonLine width={96} />
                        </div>
                      </div>
                    </li>
                  ))}

                {!loading && filtered.length === 0 && (
                  <li className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
                    Nada bate com "{query}".
                  </li>
                )}

                {!loading &&
                  filtered.map((company) => {
                    const isActive = company.id === empresaAtiva?.id;
                    return (
                      <li key={company.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setEmpresaAtiva(company);
                            setOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[var(--line-soft)] transition-colors ${
                            isActive ? 'bg-[var(--accent-soft)]' : ''
                          }`}
                          role="option"
                          aria-selected={isActive}
                        >
                          <CompanyAvatar company={company} />
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm font-medium truncate ${
                                isActive
                                  ? 'text-[var(--accent-deep)]'
                                  : 'text-[var(--ink)]'
                              }`}
                            >
                              {company.nomeFantasia}
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)] truncate">
                              {company.cnpj} · {regimeLabel[company.regimeTributario]}
                            </div>
                          </div>
                          {isActive && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              aria-hidden
                              className="text-[var(--accent-deep)]"
                            >
                              <path
                                d="M3 7.5l3 3 5-6"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
              </ul>

              <div className="border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/empresas/nova');
                  }}
                  className="w-full px-4 py-3 flex items-center gap-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center text-base leading-none">
                    +
                  </span>
                  Cadastrar nova empresa
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CompanyAvatar({
  company,
  loading = false,
}: {
  company: Company | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--line-soft)] animate-pulse flex-none" />
    );
  }
  const initials = company
    ? company.nomeFantasia
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--ink)] text-white flex-none flex items-center justify-center font-mono text-[11px] tracking-[0.02em]">
      {initials}
    </div>
  );
}

function abbreviateCNPJ(cnpj: string) {
  const match = cnpj.match(/\/(\d{4}-?\d{2})$/);
  return match ? `…/${match[1]}` : cnpj;
}

// ---------- Notifications ----------

function NotificationsButton() {
  return (
    <button
      type="button"
      aria-label="Notificações"
      className="relative w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M4 7.5a5 5 0 0110 0v2.4c0 .4.13.78.37 1.1l1.13 1.5H2.5l1.13-1.5c.24-.32.37-.7.37-1.1V7.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M7 14a2 2 0 004 0"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span
        aria-hidden
        className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent)]"
      />
    </button>
  );
}

// ---------- User menu ----------

function UserMenu() {
  const { data: session } = useSession();
  const navigate = useNavigate();
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

  const name = session?.user?.name ?? 'Você';
  const email = session?.user?.email ?? '';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate('/entrar', { replace: true });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu de ${name}`}
        className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center font-mono text-xs hover:ring-2 hover:ring-[var(--line)] transition-all"
      >
        {initials || '··'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-[var(--line)] bg-white shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[var(--line)]">
            <div className="text-sm font-medium text-[var(--ink)] truncate">
              {name}
            </div>
            {email && (
              <div className="text-xs text-[var(--ink-muted)] truncate mt-0.5">
                {email}
              </div>
            )}
          </div>
          <div className="py-1">
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate('/perfil');
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="7" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M2.5 12c.6-2 2.3-3.25 4.5-3.25S10.9 10 11.5 12"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Perfil
            </MenuItem>
            <MenuItem
              onClick={handleSignOut}
              icon={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M8.5 10l2.5-3-2.5-3M11 7H4.5M6 2.5H3a1 1 0 00-1 1v7a1 1 0 001 1h3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              Sair
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
    >
      <span className="text-[var(--ink-muted)]">{icon}</span>
      {children}
    </button>
  );
}

// ---------- Mobile drawer ----------

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`lg:hidden fixed inset-0 z-40 bg-[var(--ink)]/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        aria-label="Navegação principal"
        className={`lg:hidden fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw]
                    bg-[var(--bg-card)] border-r border-[var(--line)]
                    transition-transform duration-200 ease-out
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-serif text-xl tracking-tight">DGNotas</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="p-2 -mr-2 rounded-lg text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="p-3 flex flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-deep)]'
                    : 'text-[var(--ink)] hover:bg-[var(--line-soft)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

// ---------- Skeleton primitive ----------

function SkeletonLine({
  width,
  className = '',
}: {
  width: number;
  className?: string;
}) {
  return (
    <div
      className={`h-3 rounded-full bg-[var(--line-soft)] animate-pulse ${className}`}
      style={{ width }}
    />
  );
}
