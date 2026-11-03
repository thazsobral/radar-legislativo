import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularQuorumRequerido,
  simularPlacarVotacao,
  estimarProbabilidadeAprovacao,
  formatarValorImpacto,
  gerarTextoDivulgacao,
} from './parliamentaryMath';
import { ProposicaoLegislativa } from '../types/legislative';

test('calcularQuorumRequerido: PEC na Câmara requer 308 votos', () => {
  const quorum = calcularQuorumRequerido('CAMARA', 'PEC');
  assert.equal(quorum.tipo, 'QUALIFICADA_PEC');
  assert.equal(quorum.minimoVotos, 308);
  assert.equal(quorum.totalMembros, 513);
});

test('calcularQuorumRequerido: PEC no Senado requer 49 votos', () => {
  const quorum = calcularQuorumRequerido('SENADO', 'PEC');
  assert.equal(quorum.tipo, 'QUALIFICADA_PEC');
  assert.equal(quorum.minimoVotos, 49);
  assert.equal(quorum.totalMembros, 81);
});

test('calcularQuorumRequerido: PLP na Câmara requer 257 votos', () => {
  const quorum = calcularQuorumRequerido('CAMARA', 'PLP');
  assert.equal(quorum.tipo, 'ABSOLUTA');
  assert.equal(quorum.minimoVotos, 257);
});

test('calcularQuorumRequerido: PL ordinário na Câmara requer maioria simples', () => {
  const quorum = calcularQuorumRequerido('CAMARA', 'PL');
  assert.equal(quorum.tipo, 'SIMPLES');
  assert.equal(quorum.minimoVotos, 129);
});

test('simularPlacarVotacao: projeta votos somando base e adesão do centrão', () => {
  const placar = simularPlacarVotacao({
    totalMembros: 513,
    governista: 140,
    centrao: 200,
    oposicao: 120,
    indecisos: 53,
    adesaoCentraoAoGovernoPercentual: 70, // 140 votos do centrão
    adesaoOposicaoAoGovernoPercentual: 5,  // 6 votos da oposição
  });

  // governista (140) + centrão (140) + oposição (6) + indecisos (13) = 299
  assert.ok(placar.votosFavoraveis >= 290);
  assert.ok(placar.votosContrarios >= 150);
});

test('estimarProbabilidadeAprovacao: calcula porcentagem ponderada por margem e urgência', () => {
  const probAlta = estimarProbabilidadeAprovacao(330, 308, true);
  assert.ok(probAlta >= 80, `Probabilidade esperada alta, recebida: ${probAlta}`);

  const probBaixa = estimarProbabilidadeAprovacao(200, 308, false);
  assert.ok(probBaixa <= 35, `Probabilidade esperada baixa, recebida: ${probBaixa}`);
});

test('formatarValorImpacto: formata bilhões e milhões corretamente', () => {
  assert.equal(formatarValorImpacto(25.4), 'R$ 25,4 bilhões');
  assert.equal(formatarValorImpacto(0.85), 'R$ 850 milhões');
  assert.equal(formatarValorImpacto(0), 'Neutro / Não quantificado');
});

test('gerarTextoDivulgacao: formata mensagem para Twitter e WhatsApp', () => {
  const mockProposta: ProposicaoLegislativa = {
    id: '123',
    codigo: 'PLP 68/2024',
    siglaTipo: 'PLP',
    numero: 68,
    ano: 2024,
    tituloCurto: 'Regulamentação da Reforma Tributária',
    ementa: 'Institui o Imposto sobre Bens e Serviços (IBS) e a Contribuição sobre Bens e Serviços (CBS).',
    resumoCidadao: 'Cria o IVA Dual e define a cesta básica nacional isenta.',
    casa: 'CAMARA',
    orgaoAtual: 'Plenário',
    statusTramitacao: 'Na Pauta de Votação',
    regimeUrgencia: true,
    dataPrevistaVotacao: 'Hoje',
    prioridadeGoverno: 'ALTA',
    autor: 'Poder Executivo',
    relator: { nome: 'Reginaldo Lopes', partido: 'PT', uf: 'MG', parecer: 'FAVORAVEL' },
    quorum: { tipo: 'ABSOLUTA', minimoVotos: 257, totalMembros: 513, descricaoRegra: 'Maioria Absoluta (257)' },
    impacto: {
      fiscal: { valorEstimadoBi: 45.0, tipo: 'RECEITA', nivelRisco: 'MEDIO', descricao: 'Aumento de eficiência fiscal' },
      social: 'Redução da regressividade tributária',
      regulatorio: ['Setor de Serviços', 'Indústria', 'Comércio'],
      ambiental: 'Imposto Seletivo para produtos poluentes',
      governanca: 'Criação do Comitê Gestor do IBS',
    },
    bancadas: { governista: 140, centrao: 200, oposicao: 120, indecisos: 53 },
    probabilidadeAprovacao: 84,
    tags: ['Tributário', 'Economia', 'Reforma'],
    linkOficial: 'https://www.camara.leg.br',
    historicoEventos: [],
    pontosPositivos: ['Cesta básica com alíquota zero', 'Fim do efeito cascata'],
    pontosCriticos: ['Impacto no setor de serviços'],
  };

  const tweet = gerarTextoDivulgacao(mockProposta, 'TWITTER');
  assert.ok(tweet.includes('PLP 68/2024'));
  assert.ok(tweet.includes('Câmara dos Deputados'));
  assert.ok(tweet.length <= 280);

  const zap = gerarTextoDivulgacao(mockProposta, 'WHATSAPP');
  assert.ok(zap.includes('*PLP 68/2024*'));
  assert.ok(zap.includes('84%'));
});
