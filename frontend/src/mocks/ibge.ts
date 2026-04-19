export const ufs = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

export type UF = (typeof ufs)[number];

/** Lista pragmática de municípios (capitais + algumas cidades grandes). */
export const municipios: string[] = [
  'Aracaju', 'Belém', 'Belo Horizonte', 'Boa Vista', 'Brasília',
  'Campinas', 'Campo Grande', 'Cuiabá', 'Curitiba', 'Florianópolis',
  'Fortaleza', 'Goiânia', 'João Pessoa', 'Juiz de Fora', 'Londrina',
  'Macapá', 'Maceió', 'Manaus', 'Natal', 'Niterói',
  'Palmas', 'Porto Alegre', 'Porto Velho', 'Recife', 'Ribeirão Preto',
  'Rio Branco', 'Rio de Janeiro', 'Salvador', 'Santos', 'São Bernardo do Campo',
  'São José dos Campos', 'São Luís', 'São Paulo', 'Sorocaba', 'Teresina',
  'Uberlândia', 'Vitória',
];
