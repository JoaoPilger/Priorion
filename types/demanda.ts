// Fonte única de tipos do domínio Priorion.

export type StatusDemanda =
  | 'pendente_aprovacao'
  | 'aprovada_aberta'
  | 'em_execucao'
  | 'travada'
  | 'concluida';

export type Prioridade = 'critico' | 'alto' | 'medio' | 'baixo';

export type OrigemFator = 'informado' | 'inferido' | 'corrigido';

export interface FatorRic {
  valor: number;
  confianca: number; // 0..1, quanta certeza a IA tem sobre este fator
  origem: OrigemFator;
  justificativa: string; // uma linha, sempre presente
}

export interface AjusteRegra {
  regraId: string;
  descricao: string;
  efeito: string; // ex.: "+40", "Impact 2→3", "fixar em Priorizados"
}

export interface Demanda {
  id: string;
  titulo: string;
  cliente: string;
  sistemaAfetado: string;
  tipo: string;
  responsavel: string | null;
  status: StatusDemanda;

  textoOriginal: string;
  relatorioRefinado: string | null;

  reach: FatorRic;
  impact: FatorRic;
  confidence: FatorRic;

  // Metadado operacional. Não participa do score nem define prioridade.
  dataEntrega: string | null; // data civil ISO YYYY-MM-DD

  scoreBase: number;
  ajustesRegra: AjusteRegra[];
  scoreFinal: number;
  prioridade: Prioridade;
  fixada: boolean;
  motivoFixacao: string | null;

  posicaoAtual: number;
  posicaoAnterior: number | null;
  motivoDelta: string | null;

  criadaEm: string;
  atualizadaEm: string;
}
