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
    valorEstimadoBi: number | null; // null quando não quantificado nos dados oficiais
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
  governista: number; // parlamentares em exercício na base
  oposicao: number;   // parlamentares em exercício na oposição
  centrao: number;    // parlamentares em exercício no bloco de centro
  indecisos: number;  // sem partido / independentes
}

export interface HistoricoEvento {
  data: string;
  descricao: string;
  local: string;
}

export interface ProposicaoLegislativa {
  id: string;
  codigo: string; // ex: "PL 479/2025"
  siglaTipo: string; // ex: "PLP", "PEC", "PL", "MPV", "PLN"
  numero: number;
  ano: number;
  tituloCurto: string;
  ementa: string;
  resumoCidadao: string; // Síntese oficial ou explicação gerada por IA
  casa: CasaLegislativa;
  orgaoAtual: string; // ex: "Plenário da Câmara dos Deputados"
  statusTramitacao: string;
  regimeUrgencia: boolean;
  dataPrevistaVotacao: string; // Data real da pauta ou última movimentação
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
  fonteOficial?: string;
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
  linkCompartilhavel?: string;
  webhookEntrega?: {
    enviado: boolean;
    statusHttp?: number;
    erro?: string;
  };
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
