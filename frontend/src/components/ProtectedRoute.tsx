import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../lib/auth-client';

type Props = { children: ReactNode };

export function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          Checando sua sessão...
        </span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
