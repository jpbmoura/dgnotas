export type NotaListaTipo = 'nfe' | 'nfse';
export type NotaListaStatus =
  | 'autorizada'
  | 'processando'
  | 'rejeitada'
  | 'cancelada';

export type NotaLista = {
  id: string;
  numero: string;
  serie: string;
  tipo: NotaListaTipo;
  cliente: {
    nome: string;
    documento: string;
  };
  descricao: string;
  valor: number;
  dataEmissao: string; // ISO
  status: NotaListaStatus;
  chaveAcesso: string;
  motivoRejeicao?: string;
  codigoRejeicao?: string;
};

export const statusLabel: Record<NotaListaStatus, string> = {
  autorizada: 'Autorizada',
  processando: 'Processando',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada',
};

export const tipoLabel: Record<NotaListaTipo, string> = {
  nfe: 'NF-e',
  nfse: 'NFS-e',
};

const clientes: { nome: string; documento: string }[] = [
  { nome: 'Marina Couto', documento: '456.789.123-00' },
  { nome: 'Acme Educação LTDA', documento: '12.345.678/0001-90' },
  { nome: 'Rafael Nunes', documento: '321.654.987-11' },
  { nome: 'Estúdio Meia Hora LTDA', documento: '55.667.788/0001-34' },
  { nome: 'Luísa Bastos', documento: '789.123.456-22' },
  { nome: 'Inovação Consultoria S/A', documento: '09.876.543/0001-22' },
  { nome: 'Caio Prado', documento: '234.567.890-33' },
  { nome: 'Semente Marketing LTDA', documento: '22.334.455/0001-66' },
  { nome: 'Júlia Medeiros', documento: '567.890.123-44' },
  { nome: 'Horizonte Educação ME', documento: '88.776.655/0001-10' },
  { nome: 'Pedro Henrique Alves', documento: '111.222.333-44' },
  { nome: 'Bianca Rocha', documento: '555.666.777-88' },
  { nome: 'Daniel Scarpati', documento: '999.888.777-66' },
  { nome: 'Beatriz Lemos', documento: '333.444.555-22' },
  { nome: 'Copy Criativa LTDA', documento: '77.889.900/0001-11' },
];

const descricoes: { tipo: NotaListaTipo; texto: string; valor: number }[] = [
  { tipo: 'nfse', texto: 'Curso online — Copy Que Converte', valor: 1997 },
  { tipo: 'nfse', texto: 'Mentoria 1:1 — 4 sessões', valor: 5000 },
  { tipo: 'nfse', texto: 'Consultoria estratégica', valor: 2500 },
  { tipo: 'nfse', texto: 'Workshop ao vivo — Branding', valor: 397 },
  { tipo: 'nfse', texto: 'Assinatura plataforma — mensal', valor: 97 },
  { tipo: 'nfse', texto: 'Curso Instagram do zero ao topo', valor: 497 },
  { tipo: 'nfse', texto: 'Pacote consultoria 10h', valor: 15000 },
  { tipo: 'nfe', texto: 'Livro impresso — Storytelling', valor: 69.9 },
  { tipo: 'nfe', texto: 'Kit de materiais digitais', valor: 247 },
  { tipo: 'nfe', texto: 'Template de landing page', valor: 197 },
  { tipo: 'nfe', texto: 'E-book — Storytelling pra vender', valor: 97 },
  { tipo: 'nfe', texto: 'Planner impresso 2026', valor: 89 },
];

function fakeChaveNFe(seed: number) {
  let s = String(seed * 31 + 1001);
  while (s.length < 44) s += String(seed * 7 + s.length);
  return s.slice(0, 44);
}

function fakeChaveNFSe(numero: string) {
  return `NFSE-${numero.replace('.', '')}-2026`;
}

function generate(): NotaLista[] {
  const baseDate = new Date('2026-04-19T00:00:00');

  // Casos específicos — apareçam bem no topo/filtros.
  const handPicked: NotaLista[] = [
    {
      id: 'nota_001',
      numero: '002.050',
      serie: '1',
      tipo: 'nfse',
      cliente: clientes[0],
      descricao: 'Curso online — Copy Que Converte',
      valor: 1997,
      dataEmissao: '2026-04-19',
      status: 'autorizada',
      chaveAcesso: fakeChaveNFSe('002.050'),
    },
    {
      id: 'nota_002',
      numero: '002.049',
      serie: '1',
      tipo: 'nfse',
      cliente: clientes[2],
      descricao: 'Consultoria estratégica',
      valor: 2500,
      dataEmissao: '2026-04-19',
      status: 'processando',
      chaveAcesso: fakeChaveNFSe('002.049'),
    },
    {
      id: 'nota_003',
      numero: '002.048',
      serie: '1',
      tipo: 'nfse',
      cliente: clientes[1],
      descricao: 'Workshop ao vivo — Branding',
      valor: 397,
      dataEmissao: '2026-04-18',
      status: 'rejeitada',
      chaveAcesso: fakeChaveNFSe('002.048'),
      motivoRejeicao:
        'Código de serviço não bate com o CNAE da empresa. Confere o item 1.04 vs CNAE 8599-6/04.',
      codigoRejeicao: 'E-521',
    },
    {
      id: 'nota_004',
      numero: '002.047',
      serie: '1',
      tipo: 'nfe',
      cliente: clientes[3],
      descricao: 'Kit de materiais digitais',
      valor: 247,
      dataEmissao: '2026-04-18',
      status: 'autorizada',
      chaveAcesso: fakeChaveNFe(47),
    },
    {
      id: 'nota_005',
      numero: '002.046',
      serie: '1',
      tipo: 'nfse',
      cliente: clientes[5],
      descricao: 'Mentoria 1:1 — 4 sessões',
      valor: 5000,
      dataEmissao: '2026-04-17',
      status: 'cancelada',
      chaveAcesso: fakeChaveNFSe('002.046'),
    },
    {
      id: 'nota_006',
      numero: '002.045',
      serie: '1',
      tipo: 'nfe',
      cliente: clientes[4],
      descricao: 'Livro impresso — Storytelling',
      valor: 69.9,
      dataEmissao: '2026-04-16',
      status: 'rejeitada',
      chaveAcesso: fakeChaveNFe(45),
      motivoRejeicao:
        'CNPJ do tomador não foi encontrado na base da Receita.',
      codigoRejeicao: 'E-110',
    },
    {
      id: 'nota_007',
      numero: '002.044',
      serie: '1',
      tipo: 'nfse',
      cliente: clientes[6],
      descricao: 'Curso Instagram do zero ao topo',
      valor: 497,
      dataEmissao: '2026-04-15',
      status: 'processando',
      chaveAcesso: fakeChaveNFSe('002.044'),
    },
    {
      id: 'nota_008',
      numero: '002.043',
      serie: '1',
      tipo: 'nfse',
      cliente: clientes[7],
      descricao: 'Pacote consultoria 10h',
      valor: 15000,
      dataEmissao: '2026-04-14',
      status: 'cancelada',
      chaveAcesso: fakeChaveNFSe('002.043'),
    },
  ];

  // Outras 42 autorizadas distribuídas nos últimos ~90 dias.
  const remaining: NotaLista[] = Array.from({ length: 42 }, (_, i) => {
    const idx = i;
    const numeroInt = 2042 - i;
    const numero = `002.${String(numeroInt).padStart(3, '0')}`;
    const cliente = clientes[(idx + 3) % clientes.length];
    const desc = descricoes[(idx + 5) % descricoes.length];
    const daysBack = 3 + Math.floor((idx * 90) / 42);
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysBack);
    const dataIso = d.toISOString().slice(0, 10);
    // 1 em cada 15 fica "processando" pra variar.
    const status: NotaListaStatus = idx % 15 === 7 ? 'processando' : 'autorizada';
    return {
      id: `nota_${String(idx + 10).padStart(3, '0')}`,
      numero,
      serie: '1',
      tipo: desc.tipo,
      cliente,
      descricao: desc.texto,
      valor: desc.valor,
      dataEmissao: dataIso,
      status,
      chaveAcesso:
        desc.tipo === 'nfe' ? fakeChaveNFe(numeroInt) : fakeChaveNFSe(numero),
    };
  });

  return [...handPicked, ...remaining];
}

export const mockNotas: NotaLista[] = generate();
