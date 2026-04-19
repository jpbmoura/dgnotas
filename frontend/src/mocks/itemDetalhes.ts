import { mockItens, type Item } from './itens';

export type RetencaoField = { enabled: boolean; aliq: number };

export type ItemDetalhes = Item & {
  // Produto-specific
  gtin: string;
  sujeitoST: boolean;
  cest: string;
  origem: string;
  cfop: string;
  cstOrCsosn: string;
  aliqIcms: number;
  cstPis: string;
  aliqPis: number;
  cstCofins: string;
  aliqCofins: number;
  // Serviço-specific
  ctiss: string;
  cnaeRelacionado: string;
  aliqIss: number;
  issRetido: boolean;
  localIncidencia: 'prestador' | 'tomador';
  retPis: RetencaoField;
  retCofins: RetencaoField;
  retCsll: RetencaoField;
  retIrrf: RetencaoField;
  retInss: RetencaoField;
  // IBS/CBS — comum
  cstIbsCbs: string;
  cClassTrib: string;
};

const overrides: Partial<Record<string, Partial<ItemDetalhes>>> = {
  // Produtos ------------------------------------------------------------
  item_03: {
    // E-book PDF — produto digital, tributação básica.
    gtin: '',
    sujeitoST: false,
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
  item_04: {
    // Template digital — tratado como eletrônico com ST.
    gtin: '',
    sujeitoST: true,
    cest: '2106400',
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
  item_07: {
    // Livro impresso — imunidade constitucional.
    gtin: '9788555320214',
    sujeitoST: false,
    origem: '0',
    cfop: '5102',
    cstOrCsosn: '40',
    aliqIcms: 0,
    cstPis: '06',
    aliqPis: 0,
    cstCofins: '06',
    aliqCofins: 0,
    cstIbsCbs: '040',
    cClassTrib: '000040',
  },
  item_09: {
    // Kit de materiais digitais.
    gtin: '',
    sujeitoST: false,
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
  item_12: {
    // Planner impresso.
    gtin: '7898900023456',
    sujeitoST: false,
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
  // Serviços ------------------------------------------------------------
  item_01: {
    // Curso online — item 8.02 da LC 116.
    ctiss: '',
    cnaeRelacionado: '8599-6/04',
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
  item_02: {
    // Mentoria — 17.01 com retenções padrão quando tomador PJ.
    ctiss: '',
    cnaeRelacionado: '7020-4/00',
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
  item_05: {
    // Consultoria estratégica — 17.01 com retenções.
    ctiss: '',
    cnaeRelacionado: '7020-4/00',
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
  item_06: {
    // Curso Instagram — licenciamento via internet.
    ctiss: '',
    cnaeRelacionado: '6202-3/00',
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
  item_08: {
    // Pacote de consultoria.
    ctiss: '',
    cnaeRelacionado: '7020-4/00',
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
  item_10: {
    // Assinatura mensal — streaming 1.09.
    ctiss: '',
    cnaeRelacionado: '6311-9/00',
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
  item_11: {
    // Workshop — 8.02.
    ctiss: '',
    cnaeRelacionado: '8599-6/04',
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
};

function defaultsFor(base: Item): ItemDetalhes {
  return {
    ...base,
    gtin: '',
    sujeitoST: false,
    cest: '',
    origem: '',
    cfop: '',
    cstOrCsosn: '',
    aliqIcms: 0,
    cstPis: '',
    aliqPis: 0,
    cstCofins: '',
    aliqCofins: 0,
    ctiss: '',
    cnaeRelacionado: '',
    aliqIss: 0,
    issRetido: false,
    localIncidencia: 'prestador',
    retPis: { enabled: false, aliq: 0 },
    retCofins: { enabled: false, aliq: 0 },
    retCsll: { enabled: false, aliq: 0 },
    retIrrf: { enabled: false, aliq: 0 },
    retInss: { enabled: false, aliq: 0 },
    cstIbsCbs: '000',
    cClassTrib: '000001',
  };
}

export function getItemDetalhes(id: string): ItemDetalhes | null {
  const base = mockItens.find((i) => i.id === id);
  if (!base) return null;
  return { ...defaultsFor(base), ...(overrides[id] ?? {}) };
}
