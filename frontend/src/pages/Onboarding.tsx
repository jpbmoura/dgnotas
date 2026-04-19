import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Logo } from '../components/landing/Logo';
import { FormField } from '../components/FormField';

type CompanyData = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  regime: '' | 'simples' | 'mei' | 'presumido' | 'real';
  ie: string;
  im: string;
};

type CertificateData = {
  fileName: string;
  fileSize: number;
  password: string;
  validated: boolean;
  issuer: string;
  expiresIn: string;
};

type OnboardingData = {
  company: CompanyData;
  certificate: CertificateData;
  termsAccepted: boolean;
};

const emptyData: OnboardingData = {
  company: {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    regime: '',
    ie: '',
    im: '',
  },
  certificate: {
    fileName: '',
    fileSize: 0,
    password: '',
    validated: false,
    issuer: '',
    expiresIn: '',
  },
  termsAccepted: false,
};

// ------ CNPJ helpers ------

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  const parts = [
    d.slice(0, 2),
    d.slice(2, 5),
    d.slice(5, 8),
    d.slice(8, 12),
    d.slice(12, 14),
  ];
  let out = parts[0];
  if (parts[1]) out += '.' + parts[1];
  if (parts[2]) out += '.' + parts[2];
  if (parts[3]) out += '/' + parts[3];
  if (parts[4]) out += '-' + parts[4];
  return out;
}

function isValidCNPJ(raw: string) {
  const d = onlyDigits(raw);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const calc = (base: string, weights: number[]) => {
    const sum = base
      .split('')
      .reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calc(d.slice(0, 12), w1);
  const dv2 = calc(d.slice(0, 13), w2);
  return dv1 === Number(d[12]) && dv2 === Number(d[13]);
}

// ------ zod schemas ------

const step1Schema = z.object({
  cnpj: z.string().refine(isValidCNPJ, 'CNPJ não bate. Confere os números?'),
  razaoSocial: z.string().trim().min(1, 'Razão social é obrigatória.'),
  nomeFantasia: z.string().trim().min(1, 'Nome fantasia é obrigatório.'),
  cep: z
    .string()
    .refine((v) => onlyDigits(v).length === 8, 'CEP precisa de 8 dígitos.'),
  logradouro: z.string().trim().min(1, 'Preenche o logradouro.'),
  numero: z.string().trim().min(1, 'Número do endereço.'),
  complemento: z.string().optional(),
  bairro: z.string().trim().min(1, 'Preenche o bairro.'),
  cidade: z.string().trim().min(1, 'Preenche a cidade.'),
  uf: z
    .string()
    .trim()
    .length(2, 'UF com 2 letras (ex.: SP).'),
  regime: z.enum(['simples', 'mei', 'presumido', 'real'], {
    message: 'Escolhe o regime tributário.',
  }),
  ie: z.string().optional(),
  im: z.string().optional(),
});

const step2Schema = z.object({
  fileName: z.string().min(1, 'Falta subir o certificado.'),
  password: z.string().min(1, 'Precisa da senha do certificado.'),
  validated: z.literal(true, {
    message: 'Valida o certificado antes de seguir.',
  }),
});

const step3Schema = z.object({
  termsAccepted: z.literal(true, {
    message: 'Precisa aceitar os termos pra concluir.',
  }),
});

// ------ utilities ------

type Issues = Record<string, string>;

function collectIssues(error: z.ZodError): Issues {
  const out: Issues = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const regimeLabel: Record<Exclude<CompanyData['regime'], ''>, string> = {
  simples: 'Simples Nacional',
  mei: 'MEI',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
};

const steps = [
  { key: 'empresa', label: 'Empresa', hint: 'Dados da sua empresa' },
  { key: 'certificado', label: 'Certificado', hint: 'Certificado digital' },
  { key: 'confirmacao', label: 'Confirmação', hint: 'Revisão final' },
] as const;

// ------ page ------

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [data, setData] = useState<OnboardingData>(emptyData);
  const [issues, setIssues] = useState<Issues>({});
  const [submitting, setSubmitting] = useState(false);

  const updateCompany = <K extends keyof CompanyData>(
    key: K,
    value: CompanyData[K],
  ) => {
    setData((d) => ({ ...d, company: { ...d.company, [key]: value } }));
  };

  const updateCertificate = <K extends keyof CertificateData>(
    key: K,
    value: CertificateData[K],
  ) => {
    setData((d) => ({ ...d, certificate: { ...d.certificate, [key]: value } }));
  };

  function validateCurrent(): boolean {
    if (step === 0) {
      const result = step1Schema.safeParse(data.company);
      if (!result.success) {
        setIssues(collectIssues(result.error));
        return false;
      }
    }
    if (step === 1) {
      const result = step2Schema.safeParse(data.certificate);
      if (!result.success) {
        setIssues(collectIssues(result.error));
        return false;
      }
    }
    if (step === 2) {
      const result = step3Schema.safeParse({
        termsAccepted: data.termsAccepted,
      });
      if (!result.success) {
        setIssues(collectIssues(result.error));
        return false;
      }
    }
    setIssues({});
    return true;
  }

  function handleNext() {
    if (!validateCurrent()) return;
    if (step < 2) {
      setStep((s) => (s + 1) as 0 | 1 | 2);
      setIssues({});
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      navigate('/app', { replace: true });
    }, 600);
  }

  function handleBack() {
    if (step === 0) return;
    setStep((s) => (s - 1) as 0 | 1 | 2);
    setIssues({});
  }

  const isLast = step === 2;
  const canConclude = step !== 2 || data.termsAccepted;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)] bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 h-16 flex items-center gap-3">
          <Logo />
          <span className="font-serif text-xl tracking-tight">DGNotas</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Configuração inicial
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
            Passo {step + 1} de 3
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-[var(--ink)] leading-tight">
            Vamos deixar tudo pronto{' '}
            <em className="font-serif italic">em três passos</em>.
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-muted)] max-w-xl leading-relaxed">
            Cadastra os dados da empresa, sobe o certificado digital e confirma.
            A partir daí a primeira nota sai sozinha.
          </p>
        </div>

        <ProgressBar current={step} />

        <section className="mt-10 card p-6 md:p-8">
          {step === 0 && (
            <StepCompany
              data={data.company}
              issues={issues}
              onChange={updateCompany}
              setMany={(patch) =>
                setData((d) => ({
                  ...d,
                  company: { ...d.company, ...patch },
                }))
              }
            />
          )}

          {step === 1 && (
            <StepCertificate
              data={data.certificate}
              issues={issues}
              onChange={updateCertificate}
            />
          )}

          {step === 2 && (
            <StepConfirmation
              data={data}
              issues={issues}
              onToggleTerms={(v) =>
                setData((d) => ({ ...d, termsAccepted: v }))
              }
            />
          )}
        </section>

        <footer className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || submitting}
            className="btn-secondary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting || (isLast && !canConclude)}
            className="btn-primary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Finalizando...'
              : isLast
              ? 'Concluir'
              : 'Próximo'}
          </button>
        </footer>
      </main>
    </div>
  );
}

// ------ Progress bar ------

function ProgressBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-3 md:gap-4">
      {steps.map((s, i) => {
        const state =
          i < current ? 'done' : i === current ? 'active' : 'upcoming';
        return (
          <li key={s.key} className="flex-1 flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <StepDot index={i + 1} state={state} />
              <div className="min-w-0">
                <div
                  className={`font-mono text-[10px] uppercase tracking-[0.02em] ${
                    state === 'upcoming'
                      ? 'text-[var(--ink-muted)]'
                      : 'text-[var(--ink)]'
                  }`}
                >
                  {s.label}
                </div>
                <div className="text-xs text-[var(--ink-muted)] truncate hidden md:block">
                  {s.hint}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    i < current ? 'var(--ink)' : 'var(--line)',
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({
  index,
  state,
}: {
  index: number;
  state: 'done' | 'active' | 'upcoming';
}) {
  const base =
    'flex-none flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-medium';
  if (state === 'done') {
    return (
      <div
        className={`${base} bg-[var(--accent-soft)] text-[var(--accent-deep)]`}
        aria-label="Concluído"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M3 7.5l3 3 5-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className={`${base} bg-[var(--ink)] text-white`}>{index}</div>
    );
  }
  return (
    <div
      className={`${base} bg-[var(--line-soft)] text-[var(--ink-muted)]`}
    >
      {index}
    </div>
  );
}

// ------ Step 1 ------

type StepCompanyProps = {
  data: CompanyData;
  issues: Issues;
  onChange: <K extends keyof CompanyData>(key: K, value: CompanyData[K]) => void;
  setMany: (patch: Partial<CompanyData>) => void;
};

function StepCompany({ data, issues, onChange, setMany }: StepCompanyProps) {
  const [lookupState, setLookupState] = useState<
    'idle' | 'loading' | 'ok' | 'miss'
  >('idle');
  const lastLookup = useRef<string>('');

  const cnpjValid = isValidCNPJ(data.cnpj);

  useEffect(() => {
    if (!cnpjValid) {
      if (lookupState !== 'idle') setLookupState('idle');
      return;
    }
    const key = onlyDigits(data.cnpj);
    if (lastLookup.current === key) return;
    lastLookup.current = key;
    setLookupState('loading');

    const timer = setTimeout(() => {
      // Mock Receita — preenche apenas se campos estiverem vazios, pra não pisar em edição do usuário.
      setMany({
        razaoSocial: data.razaoSocial || 'Empresa Exemplo LTDA',
        nomeFantasia: data.nomeFantasia || 'Exemplo',
        cep: data.cep || '01310-100',
        logradouro: data.logradouro || 'Av. Paulista',
        numero: data.numero || '1000',
        bairro: data.bairro || 'Bela Vista',
        cidade: data.cidade || 'São Paulo',
        uf: data.uf || 'SP',
      });
      setLookupState('ok');
    }, 700);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpjValid, data.cnpj]);

  return (
    <div>
      <StepHeading
        eyebrow="Passo 01 — Empresa"
        title={
          <>
            Quem é a pessoa jurídica{' '}
            <em className="font-serif italic">emitindo</em>?
          </>
        }
        subtitle="A gente puxa o que dá da Receita. Se algo estiver fora do ar, você edita à mão."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <FormField
            label="CNPJ"
            name="cnpj"
            placeholder="00.000.000/0000-00"
            value={data.cnpj}
            onChange={(e) => onChange('cnpj', formatCNPJ(e.target.value))}
            inputMode="numeric"
            maxLength={18}
            error={issues.cnpj}
            hint={lookupHint(lookupState)}
            required
          />
        </div>

        <FormField
          label="Razão social"
          name="razaoSocial"
          placeholder="Empresa Exemplo LTDA"
          value={data.razaoSocial}
          onChange={(e) => onChange('razaoSocial', e.target.value)}
          error={issues.razaoSocial}
        />

        <FormField
          label="Nome fantasia"
          name="nomeFantasia"
          placeholder="Exemplo"
          value={data.nomeFantasia}
          onChange={(e) => onChange('nomeFantasia', e.target.value)}
          error={issues.nomeFantasia}
        />

        <FormField
          label="CEP"
          name="cep"
          placeholder="01310-100"
          value={data.cep}
          onChange={(e) => onChange('cep', e.target.value)}
          inputMode="numeric"
          maxLength={9}
          error={issues.cep}
        />

        <FormField
          label="Logradouro"
          name="logradouro"
          placeholder="Av. Paulista"
          value={data.logradouro}
          onChange={(e) => onChange('logradouro', e.target.value)}
          error={issues.logradouro}
        />

        <FormField
          label="Número"
          name="numero"
          placeholder="1000"
          value={data.numero}
          onChange={(e) => onChange('numero', e.target.value)}
          error={issues.numero}
        />

        <FormField
          label="Complemento"
          name="complemento"
          placeholder="Sala 42"
          value={data.complemento}
          onChange={(e) => onChange('complemento', e.target.value)}
        />

        <FormField
          label="Bairro"
          name="bairro"
          placeholder="Bela Vista"
          value={data.bairro}
          onChange={(e) => onChange('bairro', e.target.value)}
          error={issues.bairro}
        />

        <FormField
          label="Cidade"
          name="cidade"
          placeholder="São Paulo"
          value={data.cidade}
          onChange={(e) => onChange('cidade', e.target.value)}
          error={issues.cidade}
        />

        <FormField
          label="UF"
          name="uf"
          placeholder="SP"
          value={data.uf}
          onChange={(e) =>
            onChange('uf', e.target.value.toUpperCase().slice(0, 2))
          }
          maxLength={2}
          error={issues.uf}
        />

        <div className="md:col-span-2">
          <SelectField
            label="Regime tributário"
            name="regime"
            value={data.regime}
            onChange={(e) =>
              onChange('regime', e.target.value as CompanyData['regime'])
            }
            error={issues.regime}
          >
            <option value="">Escolhe uma opção</option>
            <option value="simples">Simples Nacional</option>
            <option value="mei">MEI</option>
            <option value="presumido">Lucro Presumido</option>
            <option value="real">Lucro Real</option>
          </SelectField>
        </div>

        <FormField
          label="Inscrição estadual"
          name="ie"
          placeholder="Opcional"
          value={data.ie}
          onChange={(e) => onChange('ie', e.target.value)}
          hint="Pula se a sua empresa não tem IE."
        />

        <FormField
          label="Inscrição municipal"
          name="im"
          placeholder="Opcional"
          value={data.im}
          onChange={(e) => onChange('im', e.target.value)}
          hint="A maioria das NFS-e pede. Se não tem, a Ana ajuda depois."
        />
      </div>
    </div>
  );
}

function lookupHint(state: 'idle' | 'loading' | 'ok' | 'miss') {
  if (state === 'loading') return 'Conversando com a Receita...';
  if (state === 'ok') return 'Dados preenchidos. Edita se algo estiver errado.';
  return undefined;
}

// ------ Step 2 ------

type StepCertificateProps = {
  data: CertificateData;
  issues: Issues;
  onChange: <K extends keyof CertificateData>(
    key: K,
    value: CertificateData[K],
  ) => void;
};

function StepCertificate({ data, issues, onChange }: StepCertificateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validating, setValidating] = useState(false);

  function acceptFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pfx') && !name.endsWith('.p12')) {
      onChange('fileName', '');
      onChange('fileSize', 0);
      onChange('issuer', '');
      onChange('expiresIn', '');
      onChange('validated', false);
      return;
    }
    onChange('fileName', file.name);
    onChange('fileSize', file.size);
    onChange('issuer', 'AC Certisign');
    onChange('expiresIn', 'expira em 11 meses');
    onChange('validated', false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  }

  function handleValidate() {
    if (!data.fileName || !data.password) return;
    setValidating(true);
    setTimeout(() => {
      setValidating(false);
      onChange('validated', true);
    }, 1000);
  }

  const hasFile = data.fileName.length > 0;

  return (
    <div>
      <StepHeading
        eyebrow="Passo 02 — Certificado"
        title={
          <>
            Sobe seu certificado{' '}
            <em className="font-serif italic">A1</em>.
          </>
        }
        subtitle="Arquivo .pfx ou .p12 com a senha. Ele fica só aqui, criptografado, e é usado pra assinar suas notas."
      />

      <div className="mt-8 space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Subir certificado digital"
          className={`rounded-2xl border border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[var(--ink)] bg-[var(--line-soft)]'
              : 'border-[var(--line)] bg-white hover:border-[var(--ink)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pfx,.p12"
            onChange={handlePick}
            className="hidden"
          />

          {!hasFile ? (
            <>
              <div className="mx-auto w-10 h-10 rounded-full bg-[var(--line-soft)] flex items-center justify-center text-[var(--ink-muted)]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path
                    d="M9 12V3m0 0L5 7m4-4l4 4M3 13v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm text-[var(--ink)] font-medium">
                Arrasta o arquivo aqui ou clica pra escolher
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Aceita .pfx e .p12 — até 5 MB
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent-deep)] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 8.5l3 3 7-8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--ink)] truncate">
                    {data.fileName}
                  </div>
                  <div className="text-xs text-[var(--ink-muted)]">
                    {formatBytes(data.fileSize)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('fileName', '');
                  onChange('fileSize', 0);
                  onChange('issuer', '');
                  onChange('expiresIn', '');
                  onChange('validated', false);
                }}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline underline-offset-2"
              >
                Trocar
              </button>
            </div>
          )}
        </div>

        {issues.fileName && !hasFile && (
          <p className="text-xs text-[var(--warn)]">{issues.fileName}</p>
        )}

        <FormField
          label="Senha do certificado"
          name="certPassword"
          type="password"
          autoComplete="off"
          placeholder="A mesma que você usa na e-CAC"
          value={data.password}
          onChange={(e) => {
            onChange('password', e.target.value);
            if (data.validated) onChange('validated', false);
          }}
          error={issues.password}
        />

        {hasFile && (
          <div className="card p-5 !rounded-2xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
                  Detalhes do certificado
                </div>
                <div className="mt-2 text-sm text-[var(--ink)]">
                  Emissor:{' '}
                  <span className="font-medium">{data.issuer}</span>
                </div>
                <div className="text-sm text-[var(--ink-muted)]">
                  Validade: {data.expiresIn}
                </div>
              </div>
              {data.validated ? (
                <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                  Validado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={
                    validating || !data.password || data.password.length === 0
                  }
                  className="btn-secondary h-12 px-6 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating ? 'Validando...' : 'Validar certificado'}
                </button>
              )}
            </div>
          </div>
        )}

        {issues.validated && hasFile && data.password && !data.validated && (
          <p className="text-xs text-[var(--warn)]">{issues.validated}</p>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number) {
  if (n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ------ Step 3 ------

type StepConfirmationProps = {
  data: OnboardingData;
  issues: Issues;
  onToggleTerms: (v: boolean) => void;
};

function StepConfirmation({
  data,
  issues,
  onToggleTerms,
}: StepConfirmationProps) {
  const { company, certificate } = data;

  const regime =
    company.regime === '' ? '—' : regimeLabel[company.regime];

  const endereco = [
    [company.logradouro, company.numero].filter(Boolean).join(', '),
    company.complemento,
    company.bairro,
    [company.cidade, company.uf].filter(Boolean).join('/'),
    company.cep,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <StepHeading
        eyebrow="Passo 03 — Confirmação"
        title={
          <>
            Dá uma última olhada{' '}
            <em className="font-serif italic">antes de a gente emitir</em>.
          </>
        }
        subtitle="Se algo estiver errado, volta e ajusta. Depois de concluir, a Ana recebe tudo e te chama."
      />

      <div className="mt-8 grid grid-cols-1 gap-4">
        <SummaryCard title="Empresa">
          <SummaryRow label="CNPJ" value={company.cnpj || '—'} />
          <SummaryRow label="Razão social" value={company.razaoSocial} />
          <SummaryRow label="Nome fantasia" value={company.nomeFantasia} />
          <SummaryRow label="Regime tributário" value={regime} />
          <SummaryRow label="Endereço" value={endereco || '—'} />
          <SummaryRow
            label="Inscrição estadual"
            value={company.ie || 'Não informada'}
          />
          <SummaryRow
            label="Inscrição municipal"
            value={company.im || 'Não informada'}
          />
        </SummaryCard>

        <SummaryCard
          title="Certificado digital"
          badge={
            certificate.validated ? (
              <span className="badge bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                Validado
              </span>
            ) : null
          }
        >
          <SummaryRow label="Arquivo" value={certificate.fileName || '—'} />
          <SummaryRow label="Emissor" value={certificate.issuer || '—'} />
          <SummaryRow
            label="Validade"
            value={certificate.expiresIn || '—'}
          />
        </SummaryCard>
      </div>

      <label className="mt-8 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.termsAccepted}
          onChange={(e) => onToggleTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--ink)] cursor-pointer"
        />
        <span className="text-sm text-[var(--ink)] leading-relaxed">
          Li e concordo com os{' '}
          <a href="#" className="underline underline-offset-2 hover:text-[var(--accent-deep)]">
            termos de uso
          </a>{' '}
          e com a política de privacidade do DGNotas.
        </span>
      </label>

      {issues.termsAccepted && (
        <p className="mt-2 text-xs text-[var(--warn)]">{issues.termsAccepted}</p>
      )}
    </div>
  );
}

// ------ small primitives ------

function StepHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-[var(--ink)] leading-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-xl leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  error,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </span>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`mt-2 block w-full h-12 px-4 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] transition-colors focus:outline-none appearance-none ${
          error
            ? 'border-[var(--warn)] focus:border-[var(--warn)]'
            : 'border-[var(--line)] focus:border-[var(--ink)]'
        }`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%23425466' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 16px center',
          paddingRight: '40px',
        }}
      >
        {children}
      </select>
      {error ? (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      ) : null}
    </label>
  );
}

function SummaryCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card p-6 !rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-muted)]">
          {title}
        </h3>
        {badge}
      </div>
      <dl className="mt-4 divide-y divide-[var(--line-soft)]">{children}</dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs text-[var(--ink-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--ink)] break-words">
        {value || '—'}
      </dd>
    </div>
  );
}

export default Onboarding;
