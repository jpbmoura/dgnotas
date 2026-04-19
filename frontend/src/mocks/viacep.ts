export type ViaCEPResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  municipio: string;
  uf: string;
};

const regions: { range: [number, number]; logradouro: string; bairro: string; municipio: string; uf: string }[] = [
  { range: [1000, 19999], logradouro: 'Av. Paulista', bairro: 'Bela Vista', municipio: 'São Paulo', uf: 'SP' },
  { range: [20000, 28999], logradouro: 'Av. Rio Branco', bairro: 'Centro', municipio: 'Rio de Janeiro', uf: 'RJ' },
  { range: [29000, 29999], logradouro: 'Av. Nossa Senhora da Penha', bairro: 'Praia do Canto', municipio: 'Vitória', uf: 'ES' },
  { range: [30000, 39999], logradouro: 'Av. Afonso Pena', bairro: 'Centro', municipio: 'Belo Horizonte', uf: 'MG' },
  { range: [40000, 48999], logradouro: 'Av. Tancredo Neves', bairro: 'Pituba', municipio: 'Salvador', uf: 'BA' },
  { range: [49000, 49999], logradouro: 'Av. Beira Mar', bairro: 'Atalaia', municipio: 'Aracaju', uf: 'SE' },
  { range: [50000, 56999], logradouro: 'Av. Boa Viagem', bairro: 'Boa Viagem', municipio: 'Recife', uf: 'PE' },
  { range: [57000, 57999], logradouro: 'Av. Dr. Antônio Gouveia', bairro: 'Pajuçara', municipio: 'Maceió', uf: 'AL' },
  { range: [60000, 63999], logradouro: 'Av. Beira Mar', bairro: 'Meireles', municipio: 'Fortaleza', uf: 'CE' },
  { range: [64000, 64999], logradouro: 'Av. Frei Serafim', bairro: 'Centro', municipio: 'Teresina', uf: 'PI' },
  { range: [70000, 73999], logradouro: 'Setor Comercial Sul', bairro: 'Asa Sul', municipio: 'Brasília', uf: 'DF' },
  { range: [74000, 76799], logradouro: 'Av. 85', bairro: 'Setor Marista', municipio: 'Goiânia', uf: 'GO' },
  { range: [80000, 87999], logradouro: 'Av. Sete de Setembro', bairro: 'Centro', municipio: 'Curitiba', uf: 'PR' },
  { range: [88000, 89999], logradouro: 'Av. Beira Mar Norte', bairro: 'Centro', municipio: 'Florianópolis', uf: 'SC' },
  { range: [90000, 99999], logradouro: 'Av. Ipiranga', bairro: 'Centro', municipio: 'Porto Alegre', uf: 'RS' },
];

export function mockViaCEP(rawCep: string): ViaCEPResult | null {
  const digits = rawCep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const prefix = Number(digits.slice(0, 5));
  const region = regions.find(
    (r) => prefix >= r.range[0] && prefix <= r.range[1],
  );
  if (!region) return null;
  return {
    cep: `${digits.slice(0, 5)}-${digits.slice(5)}`,
    logradouro: region.logradouro,
    bairro: region.bairro,
    municipio: region.municipio,
    uf: region.uf,
  };
}
