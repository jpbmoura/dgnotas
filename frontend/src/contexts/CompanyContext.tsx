import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { listEmpresas, type Company } from '../api/empresas';

type CompanyContextValue = {
  empresas: Company[];
  empresaAtiva: Company | null;
  setEmpresaAtiva: (empresa: Company) => void;
  /** Recarrega a lista — chame após criar/editar uma empresa. */
  refresh: () => Promise<void>;
  loading: boolean;
  error: Error | null;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

const STORAGE_KEY = 'dgnotas:empresa-ativa';

type ProviderProps = {
  children: ReactNode;
  /** Permite injetar empresas fake em testes sem fazer fetch. */
  initialEmpresas?: Company[];
};

export function CompanyProvider({ children, initialEmpresas }: ProviderProps) {
  const [empresas, setEmpresas] = useState<Company[]>(initialEmpresas ?? []);
  const [empresaAtiva, setEmpresaAtivaState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(!initialEmpresas);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listEmpresas();
      setEmpresas(list);
      setEmpresaAtivaState((atual) => {
        if (atual) {
          const ainda = list.find((e) => e.id === atual.id);
          if (ainda) return ainda;
        }
        const storedId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(STORAGE_KEY)
            : null;
        const match = storedId ? list.find((e) => e.id === storedId) : undefined;
        return match ?? list[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialEmpresas) return;
    void load();
  }, [initialEmpresas, load]);

  function setEmpresaAtiva(empresa: Company) {
    setEmpresaAtivaState(empresa);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, empresa.id);
    }
  }

  const value = useMemo<CompanyContextValue>(
    () => ({
      empresas,
      empresaAtiva,
      setEmpresaAtiva,
      refresh: load,
      loading,
      error,
    }),
    [empresas, empresaAtiva, load, loading, error],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany precisa estar dentro de <CompanyProvider>.');
  }
  return ctx;
}
