export type PresetTipo = 'produto' | 'servico';

export type ProdutoPresetData = {
  ncm?: string;
  origem?: string;
  cfop?: string;
  cstOrCsosn?: string;
  aliqIcms?: number;
  cstPis?: string;
  aliqPis?: number;
  cstCofins?: string;
  aliqCofins?: number;
  cstIbsCbs?: string;
  cClassTrib?: string;
};

export type ServicoPresetData = {
  lc116?: string;
  aliqIss?: number;
  issRetido?: boolean;
  localIncidencia?: 'prestador' | 'tomador';
  retPis?: { enabled: boolean; aliq: number };
  retCofins?: { enabled: boolean; aliq: number };
  retCsll?: { enabled: boolean; aliq: number };
  retIrrf?: { enabled: boolean; aliq: number };
  retInss?: { enabled: boolean; aliq: number };
  cstIbsCbs?: string;
  cClassTrib?: string;
};

export type Preset =
  | {
      id: string;
      tipo: 'produto';
      nome: string;
      descricao: string;
      data: ProdutoPresetData;
    }
  | {
      id: string;
      tipo: 'servico';
      nome: string;
      descricao: string;
      data: ServicoPresetData;
    };

export const mockPresets: Preset[] = [
  {
    id: 'prod-livro',
    tipo: 'produto',
    nome: 'Livro impresso',
    descricao: 'Imunidade tributária — ICMS/PIS/COFINS zerados.',
    data: {
      ncm: '49019900',
      origem: '0',
      cfop: '5102',
      cstOrCsosn: '40',
      aliqIcms: 0,
      cstPis: '06',
      aliqPis: 0,
      cstCofins: '06',
      aliqCofins: 0,
      cstIbsCbs: '000',
      cClassTrib: '000001',
    },
  },
  {
    id: 'prod-ebook-fisico',
    tipo: 'produto',
    nome: 'Produto físico padrão',
    descricao: 'CFOP 5102, CST PIS/COFINS básicos, sem substituição tributária.',
    data: {
      ncm: '49119900',
      origem: '0',
      cfop: '5102',
      cstOrCsosn: '00',
      aliqIcms: 18,
      cstPis: '01',
      aliqPis: 1.65,
      cstCofins: '01',
      aliqCofins: 7.6,
      cstIbsCbs: '000',
      cClassTrib: '000001',
    },
  },
  {
    id: 'prod-eletronico',
    tipo: 'produto',
    nome: 'Eletrônico com ST',
    descricao: 'Substituição tributária e CFOP 5405.',
    data: {
      ncm: '85176231',
      origem: '0',
      cfop: '5405',
      cstOrCsosn: '60',
      aliqIcms: 18,
      cstPis: '01',
      aliqPis: 1.65,
      cstCofins: '01',
      aliqCofins: 7.6,
      cstIbsCbs: '010',
      cClassTrib: '000010',
    },
  },
  {
    id: 'serv-curso',
    tipo: 'servico',
    nome: 'Curso online',
    descricao: 'Treinamento à distância — ISS 5% no município do prestador.',
    data: {
      lc116: '8.02',
      aliqIss: 5,
      issRetido: false,
      localIncidencia: 'prestador',
      retPis: { enabled: false, aliq: 0 },
      retCofins: { enabled: false, aliq: 0 },
      retCsll: { enabled: false, aliq: 0 },
      retIrrf: { enabled: false, aliq: 0 },
      retInss: { enabled: false, aliq: 0 },
      cstIbsCbs: '000',
      cClassTrib: '000001',
    },
  },
  {
    id: 'serv-consultoria',
    tipo: 'servico',
    nome: 'Consultoria PJ',
    descricao: 'Retenções padrão quando o tomador é PJ.',
    data: {
      lc116: '17.01',
      aliqIss: 5,
      issRetido: true,
      localIncidencia: 'tomador',
      retPis: { enabled: true, aliq: 0.65 },
      retCofins: { enabled: true, aliq: 3 },
      retCsll: { enabled: true, aliq: 1 },
      retIrrf: { enabled: true, aliq: 1.5 },
      retInss: { enabled: false, aliq: 0 },
      cstIbsCbs: '000',
      cClassTrib: '000001',
    },
  },
  {
    id: 'serv-software',
    tipo: 'servico',
    nome: 'Licenciamento de software',
    descricao: 'SaaS — item 1.04 da LC 116.',
    data: {
      lc116: '1.04',
      aliqIss: 2,
      issRetido: false,
      localIncidencia: 'prestador',
      retPis: { enabled: false, aliq: 0 },
      retCofins: { enabled: false, aliq: 0 },
      retCsll: { enabled: false, aliq: 0 },
      retIrrf: { enabled: false, aliq: 0 },
      retInss: { enabled: false, aliq: 0 },
      cstIbsCbs: '010',
      cClassTrib: '000010',
    },
  },
];
