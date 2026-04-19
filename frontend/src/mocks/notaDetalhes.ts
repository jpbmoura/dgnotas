import { mockNotas, type NotaLista } from './notas';
import { mockTomadores } from './tomadores';

export type NotaEventoTipo =
  | 'criada'
  | 'enviada'
  | 'autorizada'
  | 'rejeitada'
  | 'cancelada'
  | 'correcao';

export type NotaEvento = {
  tipo: NotaEventoTipo;
  timestamp: string; // ISO
  titulo: string;
  descricao: string;
};

export type NotaItem = {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  unidade: string;
};

export type ImpostosNFSe = {
  baseCalculo: number;
  aliqIss: number;
  valorIss: number;
  issRetido: boolean;
  retencoes: {
    pis: { aliq: number; valor: number };
    cofins: { aliq: number; valor: number };
    csll: { aliq: number; valor: number };
    irrf: { aliq: number; valor: number };
    inss: { aliq: number; valor: number };
  };
};

export type ImpostosNFe = {
  baseIcms: number;
  aliqIcms: number;
  valorIcms: number;
  baseIpi: number;
  aliqIpi: number;
  valorIpi: number;
  basePis: number;
  aliqPis: number;
  valorPis: number;
  baseCofins: number;
  aliqCofins: number;
  valorCofins: number;
};

export type ImpostosIbsCbs = {
  cst: string;
  cClassTrib: string;
  valorIbs: number;
  valorCbs: number;
};

export type NotaDetalhes = NotaLista & {
  dataHoraEmissao: string;
  protocoloAutorizacao: string | null;
  dataHoraAutorizacao: string | null;
  ambiente: 'producao' | 'homologacao';
  itens: NotaItem[];
  discriminacao: string;
  observacoes: string;
  tomadorEndereco: string;
  tomadorEmail: string;
  tomadorInscricaoMunicipal: string | null;
  impostosNfse: ImpostosNFSe | null;
  impostosNfe: ImpostosNFe | null;
  impostosIbsCbs: ImpostosIbsCbs;
  timeline: NotaEvento[];
  motivoCancelamento: string | null;
  dataHoraCancelamento: string | null;
  desconto: number;
  retidoTotal: number;
  valorLiquido: number;
  empresaId: string;
};

function buildTimeline(base: NotaLista): {
  timeline: NotaEvento[];
  emissao: Date;
  envio: Date;
  autorizacao: Date;
  cancelamento: Date | null;
} {
  const emissao = new Date(base.dataEmissao + 'T10:00:00');
  const envio = new Date(emissao.getTime() + 60_000);
  const autorizacao = new Date(envio.getTime() + 45_000);
  const cancelamento = base.status === 'cancelada'
    ? new Date(autorizacao.getTime() + 12 * 3_600_000)
    : null;

  const timeline: NotaEvento[] = [
    {
      tipo: 'criada',
      timestamp: emissao.toISOString(),
      titulo: 'Nota criada',
      descricao: 'Rascunho gerado a partir do formulário.',
    },
    {
      tipo: 'enviada',
      timestamp: envio.toISOString(),
      titulo: 'Enviada à prefeitura',
      descricao: 'Assinada com certificado digital e transmitida.',
    },
  ];

  if (base.status === 'autorizada' || base.status === 'cancelada') {
    timeline.push({
      tipo: 'autorizada',
      timestamp: autorizacao.toISOString(),
      titulo: 'Autorizada',
      descricao: `Protocolo ${protocoloFor(base)}.`,
    });
  }

  if (base.status === 'rejeitada') {
    timeline.push({
      tipo: 'rejeitada',
      timestamp: autorizacao.toISOString(),
      titulo: 'Rejeitada pela prefeitura',
      descricao:
        base.codigoRejeicao
          ? `Código ${base.codigoRejeicao}: ${base.motivoRejeicao ?? 'Motivo não informado.'}`
          : (base.motivoRejeicao ?? 'Motivo não informado.'),
    });
  }

  if (base.status === 'cancelada' && cancelamento) {
    timeline.push({
      tipo: 'cancelada',
      timestamp: cancelamento.toISOString(),
      titulo: 'Cancelada pelo emissor',
      descricao: 'Cancelamento a pedido do tomador, dentro do prazo legal.',
    });
  }

  return { timeline, emissao, envio, autorizacao, cancelamento };
}

function protocoloFor(base: NotaLista) {
  const n = base.numero.replace('.', '').padStart(6, '0');
  return `3525${n}${base.chaveAcesso.slice(-8)}`.slice(0, 15);
}

function findTomadorMatch(nome: string) {
  return mockTomadores.find((t) => t.nome === nome) ?? null;
}

function buildImpostosNFSe(base: NotaLista, desconto: number): ImpostosNFSe {
  const baseCalculo = base.valor - desconto;
  const aliqIss = 5;
  const valorIss = (baseCalculo * aliqIss) / 100;
  // Retenções variam: consultoria PJ (17.01) tem retenções cheias.
  const isConsultoriaPJ = /consultoria|mentoria|pacote/i.test(base.descricao);
  if (isConsultoriaPJ) {
    return {
      baseCalculo,
      aliqIss,
      valorIss,
      issRetido: false,
      retencoes: {
        pis: { aliq: 0.65, valor: (baseCalculo * 0.65) / 100 },
        cofins: { aliq: 3, valor: (baseCalculo * 3) / 100 },
        csll: { aliq: 1, valor: (baseCalculo * 1) / 100 },
        irrf: { aliq: 1.5, valor: (baseCalculo * 1.5) / 100 },
        inss: { aliq: 0, valor: 0 },
      },
    };
  }
  return {
    baseCalculo,
    aliqIss,
    valorIss,
    issRetido: false,
    retencoes: {
      pis: { aliq: 0, valor: 0 },
      cofins: { aliq: 0, valor: 0 },
      csll: { aliq: 0, valor: 0 },
      irrf: { aliq: 0, valor: 0 },
      inss: { aliq: 0, valor: 0 },
    },
  };
}

function buildImpostosNFe(base: NotaLista, desconto: number): ImpostosNFe {
  const baseCalculo = base.valor - desconto;
  // Livro imune — zera tributos.
  const isLivro = /livro/i.test(base.descricao);
  if (isLivro) {
    return {
      baseIcms: baseCalculo,
      aliqIcms: 0,
      valorIcms: 0,
      baseIpi: 0,
      aliqIpi: 0,
      valorIpi: 0,
      basePis: baseCalculo,
      aliqPis: 0,
      valorPis: 0,
      baseCofins: baseCalculo,
      aliqCofins: 0,
      valorCofins: 0,
    };
  }
  return {
    baseIcms: baseCalculo,
    aliqIcms: 18,
    valorIcms: (baseCalculo * 18) / 100,
    baseIpi: 0,
    aliqIpi: 0,
    valorIpi: 0,
    basePis: baseCalculo,
    aliqPis: 1.65,
    valorPis: (baseCalculo * 1.65) / 100,
    baseCofins: baseCalculo,
    aliqCofins: 7.6,
    valorCofins: (baseCalculo * 7.6) / 100,
  };
}

export function getNotaDetalhes(id: string): NotaDetalhes | null {
  const base = mockNotas.find((n) => n.id === id);
  if (!base) return null;

  const { timeline, emissao, autorizacao, cancelamento } = buildTimeline(base);
  const desconto = 0;
  const impostosNfse = base.tipo === 'nfse' ? buildImpostosNFSe(base, desconto) : null;
  const impostosNfe = base.tipo === 'nfe' ? buildImpostosNFe(base, desconto) : null;

  const retidoTotal = impostosNfse
    ? impostosNfse.retencoes.pis.valor +
      impostosNfse.retencoes.cofins.valor +
      impostosNfse.retencoes.csll.valor +
      impostosNfse.retencoes.irrf.valor +
      impostosNfse.retencoes.inss.valor
    : 0;

  const valorLiquido = base.valor - desconto - retidoTotal;

  const tom = findTomadorMatch(base.cliente.nome);
  const tomadorEndereco =
    tom?.endereco ?? 'Endereço não informado pelo tomador.';
  const tomadorEmail =
    tom?.email ??
    `${base.cliente.nome.toLowerCase().replace(/\s+/g, '.')}@exemplo.com.br`;

  return {
    ...base,
    dataHoraEmissao: emissao.toISOString(),
    protocoloAutorizacao:
      base.status === 'autorizada' || base.status === 'cancelada'
        ? protocoloFor(base)
        : null,
    dataHoraAutorizacao:
      base.status === 'autorizada' || base.status === 'cancelada'
        ? autorizacao.toISOString()
        : null,
    ambiente: 'producao',
    itens: [
      {
        descricao: base.descricao,
        quantidade: 1,
        valorUnitario: base.valor,
        unidade: base.tipo === 'nfe' ? 'UN' : 'SERV',
      },
    ],
    discriminacao: `Prestação de serviço conforme contratado, referente a: ${base.descricao}. Valor integral à vista.`,
    observacoes:
      base.status === 'cancelada'
        ? 'Nota cancelada — não tem efeito fiscal.'
        : '',
    tomadorEndereco,
    tomadorEmail,
    tomadorInscricaoMunicipal:
      tom && tom.tipo === 'pj' ? '12.345.678-9' : null,
    impostosNfse,
    impostosNfe,
    impostosIbsCbs: {
      cst: '000',
      cClassTrib: '000001',
      valorIbs: base.status === 'autorizada' || base.status === 'cancelada'
        ? (base.valor * 8.8) / 100
        : 0,
      valorCbs: base.status === 'autorizada' || base.status === 'cancelada'
        ? (base.valor * 8.8) / 100
        : 0,
    },
    timeline,
    motivoCancelamento:
      base.status === 'cancelada'
        ? 'Cancelamento solicitado pelo tomador — fora do escopo contratado.'
        : null,
    dataHoraCancelamento: cancelamento ? cancelamento.toISOString() : null,
    desconto,
    retidoTotal,
    valorLiquido,
    empresaId: 'emp_01',
  };
}
