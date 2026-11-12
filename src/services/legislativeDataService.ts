import {
  BancadasPosicionamento,
  CasaLegislativa,
  HistoricoEvento,
  ProposicaoLegislativa,
  RelatorParlamentar,
} from '../types/legislative';
import {
  calcularQuorumRequerido,
  estimarProbabilidadeAprovacao,
  simularPlacarVotacao,
} from '../utils/parliamentaryMath';

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>
): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      ...(headers ? { headers } : {}),
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

const PARTIDOS_GOVERNISTAS = new Set(['PT', 'PSB', 'PCDOB', 'PV', 'PDT', 'PSOL', 'REDE']);
const PARTIDOS_OPOSICAO = new Set(['PL', 'NOVO', 'MISSÃO', 'MISSAO', 'PSDB']);
const PARTIDOS_CENTRAO = new Set([
  'PSD',
  'MDB',
  'UNIÃO',
  'UNIAO',
  'PP',
  'REPUBLICANOS',
  'PODE',
  'PODEMOS',
  'AVANTE',
  'SOLIDARIEDADE',
  'PRD',
  'CIDADANIA',
]);

interface BancadasCache {
  camara: BancadasPosicionamento;
  senado: BancadasPosicionamento;
  congresso: BancadasPosicionamento;
  atualizadoEm: number;
}

let bancadasCache: BancadasCache | null = null;
const BANCADAS_TTL_MS = 1000 * 60 * 30; // 30 minutos

function classificarBancadasPorPartidos(contagemPartidos: Record<string, number>): BancadasPosicionamento {
  let governista = 0;
  let centrao = 0;
  let oposicao = 0;
  let indecisos = 0;

  for (const [partidoRaw, qtd] of Object.entries(contagemPartidos)) {
    const partido = (partidoRaw || '').trim().toUpperCase();
    if (PARTIDOS_GOVERNISTAS.has(partido)) {
      governista += qtd;
    } else if (PARTIDOS_OPOSICAO.has(partido)) {
      oposicao += qtd;
    } else if (PARTIDOS_CENTRAO.has(partido)) {
      centrao += qtd;
    } else {
      indecisos += qtd;
    }
  }

  return { governista, centrao, oposicao, indecisos };
}

/**
 * Busca a composição real e atualizada dos 513 Deputados e 81 Senadores em exercício.
 */
export async function obterBancadasReais(): Promise<BancadasCache> {
  if (bancadasCache && Date.now() - bancadasCache.atualizadoEm < BANCADAS_TTL_MS) {
    return bancadasCache;
  }

  const [camaraRes, senadoRes] = await Promise.allSettled([
    fetchJsonWithTimeout(`${CAMARA_BASE}/deputados?itens=1000`, 7000),
    fetchJsonWithTimeout(`${SENADO_BASE}/senador/lista/atual`, 7000, {
      Accept: 'application/json',
    }),
  ]);

  const camaraPartidos: Record<string, number> = {};
  if (camaraRes.status === 'fulfilled' && Array.isArray(camaraRes.value?.dados)) {
    for (const dep of camaraRes.value.dados) {
      const sigla = dep.siglaPartido || 'S/P';
      camaraPartidos[sigla] = (camaraPartidos[sigla] || 0) + 1;
    }
  }

  const senadoPartidos: Record<string, number> = {};
  const listaSen = senadoRes.status === 'fulfilled'
    ? senadoRes.value?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar
    : null;
  if (Array.isArray(listaSen)) {
    for (const sen of listaSen) {
      const sigla = sen?.IdentificacaoParlamentar?.SiglaPartidoParlamentar || 'S/P';
      senadoPartidos[sigla] = (senadoPartidos[sigla] || 0) + 1;
    }
  }

  const camara = classificarBancadasPorPartidos(camaraPartidos);
  const senado = classificarBancadasPorPartidos(senadoPartidos);
  const congresso: BancadasPosicionamento = {
    governista: camara.governista + senado.governista,
    centrao: camara.centrao + senado.centrao,
    oposicao: camara.oposicao + senado.oposicao,
    indecisos: camara.indecisos + senado.indecisos,
  };

  bancadasCache = {
    camara,
    senado,
    congresso,
    atualizadoEm: Date.now(),
  };

  return bancadasCache;
}

function formatarDataBr(isoStr?: string | null): string {
  if (!isoStr) return 'Sem data registrada';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) {
    // Tenta YYYY-MM-DD simples
    const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return isoStr;
  }
  const hoje = new Date();
  const ehHoje =
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate();

  const hora = isoStr.includes('T')
    ? ` às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';
  return ehHoje
    ? `Hoje${hora}`
    : `${d.toLocaleDateString('pt-BR')}${hora}`;
}

function criarTituloCurto(ementa?: string, fallbackCodigo?: string): string {
  const texto = (ementa || '').replace(/\s+/g, ' ').trim();
  if (!texto) return `Proposição ${fallbackCodigo || ''}`.trim();
  if (texto.length <= 85) return texto;
  return texto.slice(0, 82).trimEnd() + '...';
}

function extrairRelatorDeParecerSenado(parecerTxt?: string): RelatorParlamentar {
  if (!parecerTxt) {
    return { nome: 'A designar / Plenário', partido: '—', uf: '—', parecer: 'AGUARDANDO' };
  }
  const match = parecerTxt.match(/Relator(?:a)?:\s*(?:Senador(?:a)?|Deputado(?:a)?\s+Federal)?\s*([^,.\n(]+)/i);
  const nome = match ? match[1].trim() : 'Comissão / Plenário';
  const lower = parecerTxt.toLowerCase();
  let parecer: RelatorParlamentar['parecer'] = 'AGUARDANDO';
  if (lower.includes('favorável')) parecer = 'FAVORAVEL';
  else if (lower.includes('contrário')) parecer = 'CONTRARIO';
  else if (lower.includes('emenda') || lower.includes('substitutivo')) parecer = 'COM_EMENDAS';

  return { nome, partido: '—', uf: '—', parecer };
}

/**
 * Busca proposições reais da Câmara dos Deputados (priorizando Pauta do Plenário + recentes PEC/PLP/PL/MPV).
 */
async function buscarProposicoesCamara(
  bancadasCamara: BancadasPosicionamento,
  opcoes?: { termo?: string; siglaTipo?: string }
): Promise<ProposicaoLegislativa[]> {
  interface CandidatoCamara {
    id: number;
    siglaTipo: string;
    numero: number;
    ano: number;
    ementa: string;
    origemPauta?: {
      dataEvento?: string;
      topico?: string;
      regime?: string;
      situacaoItem?: string;
      relator?: any;
      eventoDesc?: string;
    };
  }

  const candidatosMap = new Map<number, CandidatoCamara>();

  // 1. Se não há busca por termo específico, buscar a Pauta real das sessões deliberativas do Plenário (idOrgao=180)
  if (!opcoes?.termo) {
    try {
      const evJson = await fetchJsonWithTimeout(
        `${CAMARA_BASE}/eventos?idOrgao=180&ordem=DESC&ordenarPor=dataHoraInicio&itens=6`,
        6000
      );
      if (evJson) {
        const eventosDelib = (evJson.dados || []).filter((e: any) =>
          (e.descricao || '').toLowerCase().includes('deliberativa') ||
          (e.descricaoTipo || '').toLowerCase().includes('deliberativa')
        );

        for (const ev of eventosDelib.slice(0, 2)) {
          try {
            const pautaJson = await fetchJsonWithTimeout(
              `${CAMARA_BASE}/eventos/${ev.id}/pauta`,
              5000
            );
            if (pautaJson) {
              for (const item of pautaJson.dados || []) {
                const propAlvo = item.proposicaoRelacionada_?.id
                  ? item.proposicaoRelacionada_
                  : item.proposicao_;
                if (!propAlvo?.id) continue;
                const sigla = (propAlvo.siglaTipo || '').toUpperCase();
                if (opcoes?.siglaTipo && opcoes.siglaTipo !== 'TODOS' && sigla !== opcoes.siglaTipo) {
                  continue;
                }
                if (!['PL', 'PLP', 'PEC', 'MPV', 'PDL'].includes(sigla)) continue;

                if (!candidatosMap.has(propAlvo.id) && candidatosMap.size < 6) {
                  candidatosMap.set(propAlvo.id, {
                    id: Number(propAlvo.id),
                    siglaTipo: sigla,
                    numero: Number(propAlvo.numero),
                    ano: Number(propAlvo.ano),
                    ementa: propAlvo.ementa || '',
                    origemPauta: {
                      dataEvento: ev.dataHoraInicio,
                      topico: item.topico,
                      regime: item.regime,
                      situacaoItem: item.situacaoItem,
                      relator: item.relator,
                      eventoDesc: ev.descricao,
                    },
                  });
                }
              }
            }
          } catch (_e) {
            // Segue para próximo evento
          }
        }
      }
    } catch (_e) {
      // Segue para busca geral de proposições
    }
  }

  // 2. Complementar com proposições recentes da API /proposicoes
  const params = new URLSearchParams({
    ordem: 'DESC',
    ordenarPor: 'id',
    itens: '8',
  });
  if (opcoes?.siglaTipo && opcoes.siglaTipo !== 'TODOS') {
    params.set('siglaTipo', opcoes.siglaTipo);
  } else {
    params.set('siglaTipo', 'PEC,PLP,MPV,PL');
  }
  if (opcoes?.termo) {
    params.set('keywords', opcoes.termo);
  }

  const propJson = await fetchJsonWithTimeout(
    `${CAMARA_BASE}/proposicoes?${params.toString()}`,
    7000
  );

  if (propJson) {
    for (const item of propJson.dados || []) {
      if (!candidatosMap.has(item.id) && candidatosMap.size < 10) {
        candidatosMap.set(item.id, {
          id: Number(item.id),
          siglaTipo: item.siglaTipo,
          numero: Number(item.numero),
          ano: Number(item.ano),
          ementa: item.ementa || '',
        });
      }
    }
  }

  const candidatos = Array.from(candidatosMap.values()).slice(0, 8);

  // 3. Enriquecer cada proposição com detalhes reais, autores, tramitações e temas
  const resultados = await Promise.allSettled(
    candidatos.map(async (cand): Promise<ProposicaoLegislativa> => {
      const [detRes, autRes, tramRes, temRes] = await Promise.allSettled([
        fetchJsonWithTimeout(`${CAMARA_BASE}/proposicoes/${cand.id}`, 5000),
        fetchJsonWithTimeout(`${CAMARA_BASE}/proposicoes/${cand.id}/autores`, 5000),
        fetchJsonWithTimeout(`${CAMARA_BASE}/proposicoes/${cand.id}/tramitacoes`, 5000),
        fetchJsonWithTimeout(`${CAMARA_BASE}/proposicoes/${cand.id}/temas`, 5000),
      ]);

      const det = detRes.status === 'fulfilled' ? detRes.value?.dados : null;
      const statusProp = det?.statusProposicao || {};
      const autoresList = autRes.status === 'fulfilled' ? autRes.value?.dados || [] : [];
      const tramList = tramRes.status === 'fulfilled' ? tramRes.value?.dados || [] : [];
      const temasList = temRes.status === 'fulfilled' ? temRes.value?.dados || [] : [];

      const codigo = `${cand.siglaTipo} ${cand.numero}/${cand.ano}`;
      const ementaOficial = det?.ementa || cand.ementa || 'Ementa não informada pela API.';
      const ementaDetalhada = det?.ementaDetalhada ? ` ${det.ementaDetalhada}` : '';
      const quorum = calcularQuorumRequerido('CAMARA', cand.siglaTipo);

      const regimeTexto = `${statusProp.regime || ''} ${cand.origemPauta?.topico || ''} ${cand.origemPauta?.regime || ''}`;
      const regimeUrgencia =
        regimeTexto.toLowerCase().includes('urgência') ||
        regimeTexto.toLowerCase().includes('urgencia') ||
        cand.siglaTipo === 'MPV';

      const autorNomes = autoresList
        .slice(0, 2)
        .map((a: any) => a.nome)
        .filter(Boolean)
        .join(', ');
      const autorStr = autorNomes
        ? autoresList.length > 2
          ? `${autorNomes} e outros (${autoresList.length})`
          : autorNomes
        : 'Câmara dos Deputados';

      const relatorPauta = cand.origemPauta?.relator;
      const relator: RelatorParlamentar = relatorPauta?.nome
        ? {
            nome: relatorPauta.nome,
            partido: relatorPauta.siglaPartido || '—',
            uf: relatorPauta.siglaUf || '—',
            parecer: 'AGUARDANDO',
          }
        : {
            nome: 'A designar / Comissão',
            partido: '—',
            uf: '—',
            parecer: 'AGUARDANDO',
          };

      const historicoEventos: HistoricoEvento[] = tramList
        .slice(-5)
        .reverse()
        .map((t: any) => ({
          data: formatarDataBr(t.dataHora),
          descricao: t.despacho || t.descricaoTramitacao || 'Tramitação registrada',
          local: t.siglaOrgao || 'Câmara dos Deputados',
        }));

      const tagsSet = new Set<string>();
      for (const tm of temasList) {
        if (tm?.tema) tagsSet.add(tm.tema);
      }
      if (cand.origemPauta) tagsSet.add('Pauta do Plenário');
      if (regimeUrgencia) tagsSet.add('Urgência');
      tagsSet.add(cand.siglaTipo);

      const placarBase = simularPlacarVotacao({
        totalMembros: quorum.totalMembros,
        governista: bancadasCamara.governista,
        centrao: bancadasCamara.centrao,
        oposicao: bancadasCamara.oposicao,
        indecisos: bancadasCamara.indecisos,
        adesaoCentraoAoGovernoPercentual: 60,
        adesaoOposicaoAoGovernoPercentual: 5,
      });

      const probabilidadeAprovacao = estimarProbabilidadeAprovacao(
        placarBase.votosFavoraveis,
        quorum.minimoVotos,
        regimeUrgencia
      );

      const orgaoSigla = statusProp.siglaOrgao || (cand.origemPauta ? 'PLEN' : 'MESA');
      const orgaoAtual =
        orgaoSigla === 'PLEN'
          ? 'Plenário da Câmara dos Deputados'
          : orgaoSigla === 'MESA'
          ? 'Mesa Diretora da Câmara'
          : `Órgão / Comissão: ${orgaoSigla}`;

      const statusTramitacao =
        cand.origemPauta?.situacaoItem ||
        statusProp.descricaoSituacao ||
        statusProp.descricaoTramitacao ||
        'Em tramitação na Câmara';

      const dataPrevistaVotacao = cand.origemPauta?.dataEvento
        ? formatarDataBr(cand.origemPauta.dataEvento)
        : formatarDataBr(statusProp.dataHora || det?.dataApresentacao);

      const resumoOficial = statusProp.despacho
        ? `${ementaOficial}${ementaDetalhada} — Último despacho oficial: ${statusProp.despacho}`
        : `${ementaOficial}${ementaDetalhada}`;

      return {
        id: `camara-${cand.id}`,
        codigo,
        siglaTipo: cand.siglaTipo,
        numero: cand.numero,
        ano: cand.ano,
        tituloCurto: criarTituloCurto(ementaOficial, codigo),
        ementa: ementaOficial,
        resumoCidadao: resumoOficial,
        casa: 'CAMARA',
        orgaoAtual,
        statusTramitacao,
        regimeUrgencia,
        dataPrevistaVotacao,
        prioridadeGoverno: regimeUrgencia ? 'ALTA' : 'MEDIA',
        autor: autorStr,
        relator,
        quorum,
        impacto: {
          fiscal: {
            valorEstimadoBi: null,
            tipo: 'INCERTO',
            nivelRisco: 'BAIXO',
            descricao:
              'Sem estimativa orçamentária estruturada na API de Dados Abertos. Utilize "Gerar Análise IA Agora" para leitura técnica.',
          },
          social: ementaOficial,
          regulatorio: Array.from(tagsSet).filter((t) => t !== cand.siglaTipo && t !== 'Urgência'),
          ambiental: 'Consultar parecer técnico ou análise de IA para impactos setoriais.',
          governanca: `Tramitação oficial em ${orgaoAtual} (${statusProp.ambito || 'Regimental'}).`,
        },
        bancadas: bancadasCamara,
        probabilidadeAprovacao,
        tags: Array.from(tagsSet).slice(0, 5),
        linkOficial: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${cand.id}`,
        historicoEventos,
        pontosPositivos: [],
        pontosCriticos: [],
        fonteOficial: 'API Dados Abertos da Câmara dos Deputados (v2)',
      };
    })
  );

  return resultados
    .filter((r): r is PromiseFulfilledResult<ProposicaoLegislativa> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Busca proposições reais da pauta do Senado Federal e Sessões Conjuntas do Congresso Nacional.
 */
async function buscarProposicoesSenado(
  bancadasSenado: BancadasPosicionamento,
  bancadasCongresso: BancadasPosicionamento,
  opcoes?: { termo?: string; siglaTipo?: string }
): Promise<ProposicaoLegislativa[]> {
  const listaFinal: ProposicaoLegislativa[] = [];
  const vistos = new Set<string>();

  // 1. Agenda oficial do Plenário do Senado e Congresso Nacional no mês corrente
  try {
    const hoje = new Date();
    const inicioMes = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}01`;
    const agJson = await fetchJsonWithTimeout(
      `${SENADO_BASE}/plenario/agenda/mes/${inicioMes}`,
      7000,
      { Accept: 'application/json' }
    );

    if (agJson) {
      const sessoesRaw = agJson?.AgendaPlenario?.Sessoes?.Sessao || [];
      const sessoes = (Array.isArray(sessoesRaw) ? sessoesRaw : [sessoesRaw]).reverse();

      for (const sessao of sessoes) {
        if (!sessao?.Materias?.Materia) continue;
        const mats = Array.isArray(sessao.Materias.Materia)
          ? sessao.Materias.Materia
          : [sessao.Materias.Materia];

        const isCongresso =
          (sessao.TipoSessao || '').toUpperCase().includes('CONJUNTA') ||
          (sessao.LocalSessao || '').toUpperCase().includes('CONGRESSO');

        for (const mat of mats) {
          const codMat = String(mat.CodigoMateria || '').trim();
          const sigla = (mat.SiglaMateria || '').trim().toUpperCase();
          if (!codMat || !sigla || vistos.has(codMat)) continue;
          if (opcoes?.siglaTipo && opcoes.siglaTipo !== 'TODOS' && sigla !== opcoes.siglaTipo) {
            continue;
          }

          const ementa = (mat.Ementa || mat.EmentaPapeleta || '').trim();
          const codigo = (mat.DescricaoIdentificacaoMateria || `${sigla} ${mat.NumeroMateria}/${mat.AnoMateria}`).trim();

          if (opcoes?.termo) {
            const t = opcoes.termo.toLowerCase();
            if (
              !codigo.toLowerCase().includes(t) &&
              !ementa.toLowerCase().includes(t) &&
              !(mat.Cabecalho || '').toLowerCase().includes(t)
            ) {
              continue;
            }
          }

          vistos.add(codMat);

          const casa: CasaLegislativa =
            isCongresso || sigla === 'PLN' ? 'CONGRESSO' : 'SENADO';
          const bancadas = casa === 'CONGRESSO' ? bancadasCongresso : bancadasSenado;
          const quorum = calcularQuorumRequerido(casa === 'CONGRESSO' ? 'CAMARA' : 'SENADO', sigla);
          const relator = extrairRelatorDeParecerSenado(mat.Parecer);
          const regimeUrgencia =
            (mat.Apreciacao || '').toLowerCase().includes('urgência') ||
            (mat.DescricaoTipoPauta || '').toLowerCase().includes('urgência') ||
            sigla === 'MPV';

          const placar = simularPlacarVotacao({
            totalMembros: quorum.totalMembros,
            governista: bancadas.governista,
            centrao: bancadas.centrao,
            oposicao: bancadas.oposicao,
            indecisos: bancadas.indecisos,
            adesaoCentraoAoGovernoPercentual: 60,
            adesaoOposicaoAoGovernoPercentual: 5,
          });

          const probabilidadeAprovacao = estimarProbabilidadeAprovacao(
            placar.votosFavoraveis,
            quorum.minimoVotos,
            regimeUrgencia
          );

          const tags = [
            casa === 'CONGRESSO' ? 'Congresso Nacional' : 'Plenário do Senado',
            sigla,
          ];
          if (mat.Cabecalho) tags.push(criarTituloCurto(mat.Cabecalho).slice(0, 32));
          if (regimeUrgencia) tags.push('Urgência');

          listaFinal.push({
            id: `senado-${codMat}`,
            codigo,
            siglaTipo: sigla,
            numero: Number(mat.NumeroMateria) || 0,
            ano: Number(mat.AnoMateria) || hoje.getFullYear(),
            tituloCurto: criarTituloCurto(mat.Cabecalho || ementa, codigo),
            ementa: ementa || 'Ementa oficial registrada na pauta do Senado Federal.',
            resumoCidadao: mat.Parecer
              ? `${ementa} — Parecer registrado: ${mat.Parecer}`
              : ementa || 'Matéria pautada para deliberação em Plenário.',
            casa,
            orgaoAtual: (sessao.LocalSessao || 'Plenário do Senado Federal').trim(),
            statusTramitacao: (mat.Apreciacao || sessao.TipoSessao || 'Em Pauta').trim(),
            regimeUrgencia,
            dataPrevistaVotacao: `${formatarDataBr(sessao.Data)}${sessao.Hora ? ` às ${sessao.Hora}` : ''}`,
            prioridadeGoverno: regimeUrgencia || sigla === 'PLN' ? 'ALTA' : 'MEDIA',
            autor: mat.Origem || mat.SiglaCasaIniciadora || 'Senado Federal / Congresso',
            relator,
            quorum,
            impacto: {
              fiscal: {
                valorEstimadoBi: null,
                tipo: sigla === 'PLN' ? 'DESPESA' : 'INCERTO',
                nivelRisco: sigla === 'PLN' ? 'MEDIO' : 'BAIXO',
                descricao:
                  sigla === 'PLN'
                    ? 'Projeto de Lei Orçamentária/Crédito do Congresso Nacional. Consulte o texto oficial ou Análise IA para valores exatos.'
                    : 'Sem estimativa numérica automática na API do Senado. Utilize "Gerar Análise IA Agora" para avaliação.',
              },
              social: ementa,
              regulatorio: mat.Cabecalho ? [mat.Cabecalho.replace(/\.$/, '')] : [sigla],
              ambiental: 'Consultar parecer oficial ou análise via IA.',
              governanca: `${(sessao.TipoSessao || 'Sessão Plenária').trim()} — ${(mat.DescricaoTipoPauta || 'Pauta').trim()}`,
            },
            bancadas,
            probabilidadeAprovacao,
            tags: tags.slice(0, 5),
            linkOficial: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codMat}`,
            historicoEventos: [
              {
                data: formatarDataBr(sessao.Data),
                descricao: `${(mat.Apreciacao || 'Incluído na pauta').trim()}${mat.Parecer ? ` — ${mat.Parecer}` : ''}`,
                local: (sessao.LocalSessao || 'Senado Federal').trim(),
              },
            ],
            pontosPositivos: [],
            pontosCriticos: [],
            fonteOficial: 'API Dados Abertos do Senado Federal (Agenda Plenário)',
          });

          if (listaFinal.length >= 6) break;
        }
        if (listaFinal.length >= 6) break;
      }
    }
  } catch (_e) {
    // Segue para /processo
  }

  // 2. Complementar com processos legislativos recentes (PEC / PL) via endpoint oficial /processo
  if (listaFinal.length < 4) {
    try {
      const anoAtual = new Date().getFullYear();
      const siglaConsulta = opcoes?.siglaTipo && opcoes.siglaTipo !== 'TODOS' ? opcoes.siglaTipo : 'PEC';
      const procs = await fetchJsonWithTimeout(
        `${SENADO_BASE}/processo?sigla=${siglaConsulta}&ano=${anoAtual}`,
        6000,
        { Accept: 'application/json' }
      );
      if (procs) {
        if (Array.isArray(procs)) {
          for (const p of procs.slice(-10).reverse()) {
            const codMat = String(p.codigoMateria || p.id || '').trim();
            if (!codMat || vistos.has(codMat)) continue;
            const ementa = (p.ementa || '').trim();
            const codigo = (p.identificacao || '').trim();
            if (!codigo) continue;

            if (opcoes?.termo) {
              const t = opcoes.termo.toLowerCase();
              if (!codigo.toLowerCase().includes(t) && !ementa.toLowerCase().includes(t)) {
                continue;
              }
            }

            vistos.add(codMat);
            const parts = codigo.split(/\s+/);
            const sigla = (parts[0] || siglaConsulta).toUpperCase();
            const numAno = (parts[1] || '').split('/');
            const quorum = calcularQuorumRequerido('SENADO', sigla);

            const placar = simularPlacarVotacao({
              totalMembros: quorum.totalMembros,
              governista: bancadasSenado.governista,
              centrao: bancadasSenado.centrao,
              oposicao: bancadasSenado.oposicao,
              indecisos: bancadasSenado.indecisos,
              adesaoCentraoAoGovernoPercentual: 60,
              adesaoOposicaoAoGovernoPercentual: 5,
            });

            listaFinal.push({
              id: `senado-${codMat}`,
              codigo,
              siglaTipo: sigla,
              numero: Number(numAno[0]) || 0,
              ano: Number(numAno[1]) || anoAtual,
              tituloCurto: criarTituloCurto(ementa, codigo),
              ementa,
              resumoCidadao: ementa,
              casa: 'SENADO',
              orgaoAtual: 'Senado Federal',
              statusTramitacao: p.situacaoAtual || 'Em tramitação',
              regimeUrgencia: false,
              dataPrevistaVotacao: formatarDataBr(p.dataSituacaoAtual || p.dataApresentacao),
              prioridadeGoverno: sigla === 'PEC' ? 'ALTA' : 'MEDIA',
              autor: p.autoria || 'Senado Federal',
              relator: { nome: 'A designar', partido: '—', uf: '—', parecer: 'AGUARDANDO' },
              quorum,
              impacto: {
                fiscal: {
                  valorEstimadoBi: null,
                  tipo: 'INCERTO',
                  nivelRisco: 'BAIXO',
                  descricao: 'Sem estimativa orçamentária oficial na listagem de processos.',
                },
                social: ementa,
                regulatorio: [p.tipoDocumento || sigla],
                ambiental: 'Consultar parecer técnico ou análise via IA.',
                governanca: `Objetivo: ${p.objetivo || 'Tramitação no Senado Federal'}`,
              },
              bancadas: bancadasSenado,
              probabilidadeAprovacao: estimarProbabilidadeAprovacao(placar.votosFavoraveis, quorum.minimoVotos, false),
              tags: ['Senado Federal', sigla, p.tipoConteudo || 'Processo Legislativo'].filter(Boolean).slice(0, 4),
              linkOficial: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codMat}`,
              historicoEventos: [
                {
                  data: formatarDataBr(p.dataSituacaoAtual || p.dataApresentacao),
                  descricao: `Situação atual: ${p.situacaoAtual || 'Em tramitação'}`,
                  local: 'Senado Federal',
                },
              ],
              pontosPositivos: [],
              pontosCriticos: [],
              fonteOficial: 'API Dados Abertos do Senado Federal (/processo)',
            });

            if (listaFinal.length >= 6) break;
          }
        }
      }
    } catch (_e) {
      // Ignora erro secundário
    }
  }

  return listaFinal;
}

/**
 * Carrega proposições 100% reais das APIs oficiais da Câmara e do Senado.
 */
export async function carregarProposicoesReais(opcoes?: {
  termo?: string;
  casa?: 'TODAS' | CasaLegislativa;
  siglaTipo?: string;
  apenasUrgentes?: boolean;
}): Promise<{
  proposicoes: ProposicaoLegislativa[];
  fontesConsultadas: { camaraOk: boolean; senadoOk: boolean };
}> {
  const bancadas = await obterBancadasReais();
  const casaAlvo = opcoes?.casa || 'TODAS';

  const deveBuscarCamara = casaAlvo === 'TODAS' || casaAlvo === 'CAMARA';
  const deveBuscarSenado = casaAlvo === 'TODAS' || casaAlvo === 'SENADO' || casaAlvo === 'CONGRESSO';

  const [camaraRes, senadoRes] = await Promise.allSettled([
    deveBuscarCamara
      ? buscarProposicoesCamara(bancadas.camara, {
          termo: opcoes?.termo,
          siglaTipo: opcoes?.siglaTipo,
        })
      : Promise.resolve([]),
    deveBuscarSenado
      ? buscarProposicoesSenado(bancadas.senado, bancadas.congresso, {
          termo: opcoes?.termo,
          siglaTipo: opcoes?.siglaTipo,
        })
      : Promise.resolve([]),
  ]);

  const camaraItems = camaraRes.status === 'fulfilled' ? camaraRes.value : [];
  const senadoItems = senadoRes.status === 'fulfilled' ? senadoRes.value : [];

  let combinadas = [...camaraItems, ...senadoItems];

  if (casaAlvo !== 'TODAS') {
    combinadas = combinadas.filter((p) => p.casa === casaAlvo);
  }
  if (opcoes?.siglaTipo && opcoes.siglaTipo !== 'TODOS') {
    combinadas = combinadas.filter((p) => p.siglaTipo === opcoes.siglaTipo);
  }
  if (opcoes?.apenasUrgentes) {
    combinadas = combinadas.filter((p) => p.regimeUrgencia);
  }

  return {
    proposicoes: combinadas,
    fontesConsultadas: {
      camaraOk: camaraRes.status === 'fulfilled' && camaraItems.length > 0,
      senadoOk: senadoRes.status === 'fulfilled' && senadoItems.length > 0,
    },
  };
}
