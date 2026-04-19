export type ServicoLC116 = {
  codigo: string;
  descricao: string;
};

/** Subset da lista de serviços da LC 116/2003 — com foco em infoprodutos e prestadores digitais. */
export const mockLC116: ServicoLC116[] = [
  { codigo: '1.01', descricao: 'Análise e desenvolvimento de sistemas' },
  { codigo: '1.02', descricao: 'Programação' },
  { codigo: '1.03', descricao: 'Processamento de dados e congêneres' },
  { codigo: '1.04', descricao: 'Licenciamento ou cessão de direito de uso de programas' },
  { codigo: '1.05', descricao: 'Assessoria e consultoria em informática' },
  { codigo: '1.06', descricao: 'Suporte técnico em informática' },
  { codigo: '1.07', descricao: 'Planejamento, confecção e manutenção de sites' },
  { codigo: '1.08', descricao: 'Armazenamento ou hospedagem de conteúdo digital' },
  { codigo: '1.09', descricao: 'Disponibilização de conteúdo, áudio, vídeo por streaming' },
  { codigo: '8.01', descricao: 'Ensino regular pré-escolar, fundamental, médio e superior' },
  { codigo: '8.02', descricao: 'Instrução, treinamento e orientação pedagógica' },
  { codigo: '10.01', descricao: 'Agenciamento, corretagem ou intermediação de câmbio' },
  { codigo: '10.02', descricao: 'Agenciamento, corretagem ou intermediação de seguros' },
  { codigo: '10.05', descricao: 'Agenciamento, corretagem ou intermediação de bens móveis e imóveis' },
  { codigo: '17.01', descricao: 'Assessoria ou consultoria de qualquer natureza' },
  { codigo: '17.06', descricao: 'Propaganda e publicidade, inclusive promoção de vendas' },
  { codigo: '17.19', descricao: 'Arbitragem de qualquer espécie' },
  { codigo: '17.23', descricao: 'Assessoria, análise, avaliação, atendimento e seleção em marketing' },
  { codigo: '35.01', descricao: 'Serviços de reportagem, assessoria de imprensa e jornalismo' },
  { codigo: '37.01', descricao: 'Serviços de artistas, atletas, modelos e manequins' },
];
