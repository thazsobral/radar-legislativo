export type CasaLegislativa = 'CAMARA' | 'SENADO' | 'CONGRESSO';

export type TipoQuorum = 'SIMPLES' | 'ABSOLUTA' | 'QUALIFICADA_PEC';

export interface QuorumConfig {
  tipo: TipoQuorum;
  minimoVotos: number;
  totalMembros: number;
  descricaoRegra: string;
}

export type ImpactoFiscalTipo = 'RECEITA' | 'DESPESA' | 'NEUTRO' | 'INCERTO';
export type NivelRisco = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface ImpactoLegislativo {
  fiscal: {
    valorEstimadoBi: number; // Ex: 12.5 para R$ 12,5 bilhões
    tipo: ImpactoFiscalTipo;
    nivelRisco: NivelRisco;
    descricao: string;
  };
  social: string;
  regulatorio: string[];
  ambiental: string;
  governanca: string;
}

export interface RelatorParlamentar {
  nome: string;
  partido: string;
  uf: string;
  fotoUrl?: string;
  parecer?: 'FAVORAVEL' | 'CONTRARIO' | 'COM_EMENDAS' | 'AGUARDANDO';
}

export interface BancadasPosicionamento {
  governista: number; // percentual ou número de parlamentares favoráveis
  oposicao: number;   // votos contrários estimados
  centrao: number;    // votos em disputa ou com tendência
  indecisos: number;  // parlamentares flutuantes
}

export interface HistoricoEvento {
  data: string;
  descricao: string;
  local: string;
}

export interface ProposicaoLegislativa {
  id: string;
  codigo: string; // ex: "PLP 68/2024"
  siglaTipo: string; // ex: "PLP", "PEC", "PL", "MPV"
  numero: number;
  ano: number;
  tituloCurto: string;
  ementa: string;
  resumoCidadao: string; // Linguagem simples traduzida do juridiquês
  casa: CasaLegislativa;
  orgaoAtual: string; // ex: "Plenário da Câmara", "CCJ - Comissão de Constituição e Justiça"
  statusTramitacao: string; // ex: "Pauta de Votação Hoje", "Regime de Urgência Aprovado", "Pronto para Deliberação"
  regimeUrgencia: boolean;
  dataPrevistaVotacao: string; // ISO date ou "Hoje", "Amanhã", "Próxima Sessão"
  prioridadeGoverno: 'ALTA' | 'MEDIA' | 'NEUTRA' | 'OPOSICAO';
  autor: string;
  relator: RelatorParlamentar;
  quorum: QuorumConfig;
  impacto: ImpactoLegislativo;
  bancadas: BancadasPosicionamento;
  probabilidadeAprovacao: number; // 0 a 100%
  tags: string[];
  linkOficial: string;
  historicoEventos: HistoricoEvento[];
  pontosPositivos: string[];
  pontosCriticos: string[];
}

export type CanalDivulgacao = 'WHATSAPP' | 'TELEGRAM' | 'TWITTER' | 'WEBHOOK' | 'PUSH';

export interface AlertaDivulgacao {
  id: string;
  proposicaoId: string;
  proposicaoCodigo: string;
  titulo: string;
  mensagem: string;
  canais: CanalDivulgacao[];
  status: 'DISPARADO' | 'AGENDADO' | 'PENDENTE';
  dataHora: string;
  destinatariosSimulados?: number;
  linkCompartilhavel?: string;
}

export interface ConfiguracaoRobo {
  ativo: boolean;
  intervaloMinutos: number; // 5, 15, 30, 60
  palavrasChave: string[];
  temasFiltro: string[];
  casasMonitoradas: CasaLegislativa[];
  apenasUrgentes: boolean;
  notificacoesBrowser: boolean;
  webhookUrl: string;
  autoPublicarRedes: boolean;
  impactoMinimoFiscalBi: number;
}
