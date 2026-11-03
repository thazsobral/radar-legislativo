import { CasaLegislativa, QuorumConfig, TipoQuorum, ProposicaoLegislativa, CanalDivulgacao } from '../types/legislative';

/**
 * Retorna as regras constitucionais de quórum para uma Casa Legislativa e tipo de proposição.
 */
export function calcularQuorumRequerido(casa: CasaLegislativa, siglaTipo: string): QuorumConfig {
  const isCamara = casa === 'CAMARA';
  const totalMembros = isCamara ? 513 : 81;
  const tipoUpper = (siglaTipo || '').toUpperCase();

  if (tipoUpper.includes('PEC')) {
    const minimoVotos = isCamara ? 308 : 49;
    return {
      tipo: 'QUALIFICADA_PEC',
      minimoVotos,
      totalMembros,
      descricaoRegra: `Quórum Qualificado de 3/5 (${minimoVotos} de ${totalMembros} votos em 2 turnos)`,
    };
  }

  if (tipoUpper.includes('PLP') || tipoUpper.includes('COMPLEMENTAR')) {
    const minimoVotos = isCamara ? 257 : 41;
    return {
      tipo: 'ABSOLUTA',
      minimoVotos,
      totalMembros,
      descricaoRegra: `Maioria Absoluta (${minimoVotos} de ${totalMembros} votos SIM)`,
    };
  }

  // PL, MPV, PDC, PLO, etc.
  const minimoPresentes = isCamara ? 257 : 41;
  return {
    tipo: 'SIMPLES',
    minimoVotos: Math.ceil(minimoPresentes / 2),
    totalMembros,
    descricaoRegra: `Maioria Simples (mínimo de ${minimoPresentes} presentes para votação)`,
  };
}

/**
 * Simula a contagem de votos projetados com base no alinhamento das bancadas.
 */
export interface SimuladorBancadasParam {
  totalMembros: number;
  governista: number;
  oposicao: number;
  centrao: number;
  indecisos: number;
  adesaoCentraoAoGovernoPercentual: number; // 0 a 100%
  adesaoOposicaoAoGovernoPercentual?: number; // 0 a 100%
}

export function simularPlacarVotacao(params: SimuladorBancadasParam): {
  votosFavoraveis: number;
  votosContrarios: number;
  abstencoes: number;
} {
  const {
    governista,
    oposicao,
    centrao,
    indecisos,
    adesaoCentraoAoGovernoPercentual,
    adesaoOposicaoAoGovernoPercentual = 5,
  } = params;

  const taxaCentrao = Math.max(0, Math.min(100, adesaoCentraoAoGovernoPercentual)) / 100;
  const taxaOposicao = Math.max(0, Math.min(100, adesaoOposicaoAoGovernoPercentual)) / 100;

  const centraoSim = Math.round(centrao * taxaCentrao);
  const centraoNao = centrao - centraoSim;

  const oposicaoSim = Math.round(oposicao * taxaOposicao);
  const oposicaoNao = oposicao - oposicaoSim;

  // Indecisos costumam abster-se ou dividir-se
  const indecisosSim = Math.round(indecisos * 0.25);
  const abstencoes = indecisos - indecisosSim;

  const votosFavoraveis = governista + centraoSim + oposicaoSim + indecisosSim;
  const votosContrarios = oposicaoNao + centraoNao;

  return {
    votosFavoraveis,
    votosContrarios,
    abstencoes,
  };
}

/**
 * Estima a probabilidade de aprovação de uma proposição
 */
export function estimarProbabilidadeAprovacao(
  votosFavoraveis: number,
  quorumMinimo: number,
  regimeUrgencia: boolean
): number {
  if (quorumMinimo <= 0) return 50;

  const margem = votosFavoraveis / quorumMinimo;
  let probBase = 50;

  if (margem >= 1.20) {
    probBase = 92;
  } else if (margem >= 1.05) {
    probBase = 80;
  } else if (margem >= 1.0) {
    probBase = 68;
  } else if (margem >= 0.9) {
    probBase = 44;
  } else if (margem >= 0.8) {
    probBase = 28;
  } else {
    probBase = 12;
  }

  if (regimeUrgencia) {
    probBase += 6; // Urgência aprovada reflete acordo prévio no Colégio de Líderes
  }

  return Math.min(98, Math.max(5, probBase));
}

/**
 * Formata números de moeda/impacto em bilhões ou milhões de reais (BRL).
 */
export function formatarValorImpacto(valorBi: number): string {
  if (!valorBi || valorBi === 0) return 'Neutro / Não quantificado';
  if (Math.abs(valorBi) >= 1) {
    return `R$ ${valorBi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} bilhões`;
  }
  const valorMi = Math.round(valorBi * 1000);
  return `R$ ${valorMi.toLocaleString('pt-BR')} milhões`;
}

/**
 * Gera texto formatado e limpo para canais de divulgação (WhatsApp, Telegram, Twitter/X, etc.)
 */
export function gerarTextoDivulgacao(
  proposta: ProposicaoLegislativa,
  canal: CanalDivulgacao
): string {
  const quorumTxt = `${proposta.quorum.minimoVotos} votos (${proposta.quorum.tipo})`;
  const casaNome = proposta.casa === 'CAMARA' ? 'Câmara dos Deputados' : proposta.casa === 'SENADO' ? 'Senado Federal' : 'Congresso Nacional';

  if (canal === 'TWITTER') {
    const tweet = `🚨 VOTAÇÃO NO CONGRESSO: ${proposta.codigo}
Casa: ${casaNome}
Pauta: ${proposta.tituloCurto}

⚖️ Quórum: ${quorumTxt}
📊 Probabilidade de aprovação: ${proposta.probabilidadeAprovacao}%
🏛️ Relator: ${proposta.relator.nome} (${proposta.relator.partido}/${proposta.relator.uf})

Saiba mais e veja o impacto: ${proposta.linkOficial || 'https://radarlegislativo.gov.br'}
#CongressoNacional #Politica #${proposta.siglaTipo}`;
    return tweet.length > 280 ? tweet.substring(0, 277) + '...' : tweet;
  }

  if (canal === 'WHATSAPP' || canal === 'TELEGRAM') {
    return `*🔔 ALERTA LEGISLATIVO:* *${proposta.codigo}*
*${casaNome}* | Status: _${proposta.statusTramitacao}_

*Assunto:* ${proposta.tituloCurto}
*Resumo Cidadão:* ${proposta.resumoCidadao}

*📊 Termômetro de Votação:*
• Probabilidade de aprovação: *${proposta.probabilidadeAprovacao}%*
• Quórum exigido: *${proposta.quorum.descricaoRegra}*
• Relatoria: Dep./Sen. ${proposta.relator.nome} (${proposta.relator.partido}-${proposta.relator.uf})
• Impacto Fiscal Estimado: *${formatarValorImpacto(proposta.impacto.fiscal.valorEstimadoBi)}* (${proposta.impacto.fiscal.tipo})

*Pontos Chave:*
${proposta.pontosPositivos.slice(0, 2).map((p) => `✅ ${p}`).join('\n')}
${proposta.pontosCriticos.slice(0, 2).map((c) => `⚠️ ${c}`).join('\n')}

🔗 Link de Acompanhamento: ${proposta.linkOficial}`;
  }

  // Webhook payload ou padrão limpo
  return `[RADAR LEGISLATIVO] Proposta ${proposta.codigo} entrou na pauta de votação: "${proposta.tituloCurto}". Quórum: ${quorumTxt}. Probabilidade estimada: ${proposta.probabilidadeAprovacao}%.`;
}
