export type TomadorTipo = 'pf' | 'pj';

export type Tomador = {
  id: string;
  tipo: TomadorTipo;
  nome: string;
  documento: string;
  email: string;
  endereco: string;
};

export const mockTomadores: Tomador[] = [
  {
    id: 'tom_01',
    tipo: 'pf',
    nome: 'Marina Couto',
    documento: '456.789.123-00',
    email: 'marina.couto@gmail.com',
    endereco: 'Rua Aspicuelta, 230 — Vila Madalena, São Paulo/SP',
  },
  {
    id: 'tom_02',
    tipo: 'pj',
    nome: 'Acme Educação LTDA',
    documento: '12.345.678/0001-90',
    email: 'financeiro@acmeedu.com.br',
    endereco: 'Av. Brigadeiro Faria Lima, 4440 — Itaim Bibi, São Paulo/SP',
  },
  {
    id: 'tom_03',
    tipo: 'pf',
    nome: 'Rafael Nunes',
    documento: '321.654.987-11',
    email: 'rafa.nunes@hotmail.com',
    endereco: 'Rua Augusta, 1200 — Consolação, São Paulo/SP',
  },
  {
    id: 'tom_04',
    tipo: 'pj',
    nome: 'Estúdio Meia Hora LTDA',
    documento: '55.667.788/0001-34',
    email: 'contato@estudiomeiahora.com',
    endereco: 'Av. Atlântica, 500 — Copacabana, Rio de Janeiro/RJ',
  },
  {
    id: 'tom_05',
    tipo: 'pf',
    nome: 'Luísa Bastos',
    documento: '789.123.456-22',
    email: 'luisa@bastosdesign.com',
    endereco: 'Rua Girassol, 320 — Vila Madalena, São Paulo/SP',
  },
  {
    id: 'tom_06',
    tipo: 'pj',
    nome: 'Inovação Consultoria S/A',
    documento: '09.876.543/0001-22',
    email: 'fiscal@inovacao.com.br',
    endereco: 'Av. Paulista, 1500 — Bela Vista, São Paulo/SP',
  },
  {
    id: 'tom_07',
    tipo: 'pf',
    nome: 'Caio Prado',
    documento: '234.567.890-33',
    email: 'caio.prado@outlook.com',
    endereco: 'Rua das Laranjeiras, 450 — Laranjeiras, Rio de Janeiro/RJ',
  },
  {
    id: 'tom_08',
    tipo: 'pj',
    nome: 'Semente Marketing LTDA',
    documento: '22.334.455/0001-66',
    email: 'pedro@semente.ag',
    endereco: 'Rua Padre João Manuel, 300 — Jardins, São Paulo/SP',
  },
  {
    id: 'tom_09',
    tipo: 'pf',
    nome: 'Júlia Medeiros',
    documento: '567.890.123-44',
    email: 'ju.medeiros@gmail.com',
    endereco: 'Rua Teodoro Sampaio, 950 — Pinheiros, São Paulo/SP',
  },
  {
    id: 'tom_10',
    tipo: 'pj',
    nome: 'Horizonte Educação ME',
    documento: '88.776.655/0001-10',
    email: 'financeiro@horizonte.edu.br',
    endereco: 'Av. Beira Mar, 2000 — Meireles, Fortaleza/CE',
  },
];
