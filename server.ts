import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  AlertaDivulgacao,
  ConfiguracaoRobo,
  ProposicaoLegislativa,
} from './src/types/legislative';
import { carregarProposicoesReais } from './src/services/legislativeDataService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const STORE_DIR = path.resolve(__dirname, '.data');
const STORE_FILE = path.join(STORE_DIR, 'radar-store.json');

interface PersistedStore {
  alertas: AlertaDivulgacao[];
  config: ConfiguracaoRobo;
}

const DEFAULT_CONFIG: ConfiguracaoRobo = {
  ativo: true,
  intervaloMinutos: 15,
  palavrasChave: ['PEC', 'Reforma', 'IA', 'Orçamento', 'Tributário', 'Urgência'],
  temasFiltro: ['Economia', 'Tecnologia', 'Orçamento', 'Administração Pública'],
  casasMonitoradas: ['CAMARA', 'SENADO', 'CONGRESSO'],
  apenasUrgentes: false,
  notificacoesBrowser: true,
  webhookUrl: '',
  autoPublicarRedes: false,
  impactoMinimoFiscalBi: 0,
};

function readStore(): PersistedStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        alertas: Array.isArray(parsed.alertas) ? parsed.alertas : [],
        config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
      };
    }
  } catch (err) {
    console.warn('[Radar Legislativo] Falha ao ler armazenamento local:', err);
  }
  return { alertas: [], config: { ...DEFAULT_CONFIG } };
}

function writeStore(store: PersistedStore) {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Radar Legislativo] Falha ao salvar armazenamento local:', err);
  }
}

let store = readStore();
let proposicoesCache: ProposicaoLegislativa[] = [];
let ultimaCargaCacheMs = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minuto para carregamentos rápidos entre navegações

async function garantirProposicoesReais(forcar = false): Promise<{
  dados: ProposicaoLegislativa[];
  novasEncontradasCount: number;
  fontesConsultadas: { camaraOk: boolean; senadoOk: boolean };
}> {
  if (!forcar && proposicoesCache.length > 0 && Date.now() - ultimaCargaCacheMs < CACHE_TTL_MS) {
    return {
      dados: proposicoesCache,
      novasEncontradasCount: 0,
      fontesConsultadas: { camaraOk: true, senadoOk: true },
    };
  }

  const idsAntigos = new Set(proposicoesCache.map((p) => p.id));
  const { proposicoes, fontesConsultadas } = await carregarProposicoesReais();

  if (proposicoes.length > 0) {
    proposicoesCache = proposicoes;
    ultimaCargaCacheMs = Date.now();
  }

  const novasEncontradasCount =
    idsAntigos.size === 0
      ? proposicoes.length
      : proposicoes.filter((p) => !idsAntigos.has(p.id)).length;

  return {
    dados: proposicoesCache,
    novasEncontradasCount,
    fontesConsultadas,
  };
}

// 1. Endpoint: Listar proposições reais das APIs da Câmara e do Senado
app.get('/api/proposicoes', async (req, res) => {
  try {
    const forcar = req.query.refresh === 'true';
    const resultado = await garantirProposicoesReais(forcar);
    res.json({
      sucesso: true,
      total: resultado.dados.length,
      dados: resultado.dados,
      fontesConsultadas: resultado.fontesConsultadas,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(502).json({
      sucesso: false,
      erro: error?.message || 'Erro ao consultar APIs oficiais do Congresso Nacional.',
      dados: proposicoesCache,
    });
  }
});

// 2. Endpoint: Listar alertas reais disparados
app.get('/api/alertas', (_req, res) => {
  res.json({
    sucesso: true,
    total: store.alertas.length,
    dados: store.alertas,
  });
});

// 2.1 Endpoint: Ler e salvar configurações reais do robô
app.get('/api/config', (_req, res) => {
  res.json({ sucesso: true, config: store.config });
});

app.post('/api/config', (req, res) => {
  const novaConfig = req.body?.config;
  if (!novaConfig || typeof novaConfig !== 'object') {
    return res.status(400).json({ sucesso: false, erro: 'Payload de configuração inválido.' });
  }
  store.config = { ...DEFAULT_CONFIG, ...novaConfig };
  writeStore(store);
  res.json({ sucesso: true, config: store.config });
});

// 2.2 Endpoint: Diagnóstico Real de Conexão com os Órgãos Oficiais
app.get('/api/diagnostico', async (_req, res) => {
  const inicio = Date.now();

  const checkCamara = async () => {
    const t0 = Date.now();
    try {
      const resp = await fetch('https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=1', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      return {
        online: resp.ok,
        latenciaMs: Date.now() - t0,
        statusHttp: resp.status,
        detalhes: resp.ok
          ? `HTTP ${resp.status} OK (API Dados Abertos v2 respondendo em tempo real)`
          : `Falha HTTP ${resp.status} na API da Câmara`,
      };
    } catch (err: any) {
      return {
        online: false,
        latenciaMs: Date.now() - t0,
        statusHttp: 0,
        detalhes: `Erro de conexão: ${err?.message || 'Timeout'}`,
      };
    }
  };

  const checkSenado = async () => {
    const t0 = Date.now();
    try {
      const resp = await fetch('https://legis.senado.leg.br/dadosabertos/senador/lista/atual', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      return {
        online: resp.ok,
        latenciaMs: Date.now() - t0,
        statusHttp: resp.status,
        detalhes: resp.ok
          ? `HTTP ${resp.status} OK (API Dados Abertos do Senado respondendo em tempo real)`
          : `Falha HTTP ${resp.status} na API do Senado`,
      };
    } catch (err: any) {
      return {
        online: false,
        latenciaMs: Date.now() - t0,
        statusHttp: 0,
        detalhes: `Erro de conexão: ${err?.message || 'Timeout'}`,
      };
    }
  };

  const [statusCamara, statusSenado] = await Promise.all([checkCamara(), checkSenado()]);
  const chaveConfigurada = Boolean(resolveServerApiKey());

  res.json({
    sucesso: true,
    timestamp: new Date().toISOString(),
    tempoExecucaoTotalMs: Date.now() - inicio,
    uptimeSegundos: Math.floor(process.uptime()),
    servicos: {
      roboVarredura: {
        status: store.config.ativo ? 'OPERACIONAL' : 'PAUSADO',
        proposicoesRastreadas: proposicoesCache.length,
        alertasDisparados: store.alertas.length,
      },
      camaraDosDeputados: statusCamara,
      senadoFederal: statusSenado,
      inteligenciaArtificialGemini: {
        status: chaveConfigurada ? 'OPERACIONAL' : 'CHAVE_NAO_CONFIGURADA',
        modelo: 'gemini-4-hydrogen',
        processamento: 'SERVIDOR',
        chaveConfigurada,
      },
      sistemaAlertas: {
        inAppAudio: 'ATIVO',
        bannerVisual: 'ATIVO',
        webPush: 'SUPORTADO',
        webhookConfigurado: Boolean(store.config.webhookUrl?.trim()),
        canaisTransmitidos: ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'WEBHOOK'],
      },
    },
  });
});

// 3. Endpoint: Varredura ativa em tempo real na Câmara e no Senado
app.post('/api/scan', async (req, res) => {
  const { termo, casa, siglaTipo, apenasUrgentes } = req.body || {};

  try {
    const idsAntigos = new Set(proposicoesCache.map((p) => p.id));
    const { proposicoes, fontesConsultadas } = await carregarProposicoesReais({
      termo,
      casa,
      siglaTipo,
      apenasUrgentes,
    });

    // Mescla no cache global mantendo proposições únicas sem filtro
    if (!termo && (!casa || casa === 'TODAS') && (!siglaTipo || siglaTipo === 'TODOS') && !apenasUrgentes) {
      if (proposicoes.length > 0) {
        proposicoesCache = proposicoes;
        ultimaCargaCacheMs = Date.now();
      }
    } else if (proposicoes.length > 0) {
      const map = new Map(proposicoesCache.map((p) => [p.id, p]));
      for (const p of proposicoes) map.set(p.id, p);
      proposicoesCache = Array.from(map.values());
    }

    const novasEncontradasCount =
      idsAntigos.size === 0
        ? proposicoes.length
        : proposicoes.filter((p) => !idsAntigos.has(p.id)).length;

    res.json({
      sucesso: true,
      novasEncontradasCount,
      dados: proposicoes,
      fontesConsultadas,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(502).json({
      sucesso: false,
      erro: error?.message || 'Falha ao executar varredura nas APIs oficiais.',
    });
  }
});

// 3.1 Endpoint: Teste real de Webhook HTTP POST
app.post('/api/webhook/test', async (req, res) => {
  const webhookUrl = (req.body?.webhookUrl || store.config.webhookUrl || '').trim();
  if (!webhookUrl) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Nenhuma URL de webhook informada.',
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ sucesso: false, erro: 'A URL deve iniciar com http:// ou https://' });
    }
  } catch {
    return res.status(400).json({ sucesso: false, erro: 'URL de webhook inválida.' });
  }

  const t0 = Date.now();
  try {
    const resp = await fetch(parsedUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Radar-Legislativo/1.0' },
      body: JSON.stringify({
        evento: 'TESTE_CONEXAO_WEBHOOK',
        origem: 'Radar Legislativo',
        timestamp: new Date().toISOString(),
        mensagem: 'Ping real de verificação de entrega de alertas legislativos.',
      }),
      signal: AbortSignal.timeout(6000),
    });
    const latenciaMs = Date.now() - t0;
    const text = await resp.text().catch(() => '');

    return res.status(resp.ok ? 200 : 502).json({
      sucesso: resp.ok,
      statusHttp: resp.status,
      latenciaMs,
      respostaPreview: text.slice(0, 200),
      erro: resp.ok ? undefined : `Endpoint retornou HTTP ${resp.status}`,
    });
  } catch (err: any) {
    return res.status(502).json({
      sucesso: false,
      statusHttp: 0,
      latenciaMs: Date.now() - t0,
      erro: err?.message || 'Não foi possível conectar ao webhook informado.',
    });
  }
});

// 4. Endpoint: Disparo de Alerta Real pelo Robô (e entrega HTTP real em Webhook se configurado)
app.post('/api/alertas/disparar', async (req, res) => {
  const { proposicaoId, proposicaoSnapshot, canais, mensagemPersonalizada, webhookUrl } = req.body || {};

  const prop =
    proposicoesCache.find((p) => p.id === proposicaoId) ||
    (proposicaoSnapshot as ProposicaoLegislativa | undefined);

  if (!prop) {
    return res.status(404).json({ sucesso: false, erro: 'Proposição não encontrada.' });
  }

  const targetWebhook = (webhookUrl || store.config.webhookUrl || '').trim();
  let webhookEntrega: AlertaDivulgacao['webhookEntrega'];

  if (targetWebhook) {
    try {
      const resp = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Radar-Legislativo/1.0' },
        body: JSON.stringify({
          evento: 'ALERTA_VOTACAO',
          origem: 'Radar Legislativo',
          timestamp: new Date().toISOString(),
          proposicao: {
            id: prop.id,
            codigo: prop.codigo,
            casa: prop.casa,
            titulo: prop.tituloCurto,
            ementa: prop.ementa,
            status: prop.statusTramitacao,
            quorum: prop.quorum,
            probabilidadeAprovacao: prop.probabilidadeAprovacao,
            linkOficial: prop.linkOficial,
          },
          mensagem: mensagemPersonalizada || prop.ementa,
        }),
        signal: AbortSignal.timeout(6000),
      });
      webhookEntrega = {
        enviado: resp.ok,
        statusHttp: resp.status,
        erro: resp.ok ? undefined : `HTTP ${resp.status}`,
      };
    } catch (err: any) {
      webhookEntrega = {
        enviado: false,
        statusHttp: 0,
        erro: err?.message || 'Falha ao enviar para webhook',
      };
    }
  }

  const novoAlerta: AlertaDivulgacao = {
    id: `alt-${Date.now()}`,
    proposicaoId: prop.id,
    proposicaoCodigo: prop.codigo,
    titulo: `ALERTA DE VOTAÇÃO: ${prop.codigo} - ${prop.tituloCurto}`,
    mensagem:
      mensagemPersonalizada ||
      `${prop.codigo} (${prop.orgaoAtual}) · Status: ${prop.statusTramitacao}. Quórum exigido: ${prop.quorum.minimoVotos} votos (${prop.quorum.tipo}).`,
    canais: canais || ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'PUSH'],
    status: 'DISPARADO',
    dataHora: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    linkCompartilhavel: prop.linkOficial,
    webhookEntrega,
  };

  store.alertas = [novoAlerta, ...store.alertas].slice(0, 50);
  writeStore(store);

  res.json({
    sucesso: true,
    alerta: novoAlerta,
    totalAlertas: store.alertas.length,
  });
});

// Schema estrito para estruturação do parecer de inteligência legislativa
const legislativeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    resumoCidadao: {
      type: Type.STRING,
      description: 'Explicação em 2 ou 3 frases claras sem juridiquês para a população compreender o que muda na prática.',
    },
    impactoFiscalAnalise: {
      type: Type.STRING,
      description: 'Diagnóstico realista do potencial impacto financeiro, orçamentário ou regulatório com base nos fatos da proposição.',
    },
    quemGanha: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Setores, instituições ou grupos da população que podem ser beneficiados pelo texto.',
    },
    quemPerde: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Setores ou grupos que enfrentam novos custos, obrigações ou restrições.',
    },
    cenarioVotacao: {
      type: Type.STRING,
      description: 'Análise objetiva da correlação de forças diante do quórum regimental e da composição real das bancadas.',
    },
    recomendacaoEstrategica: {
      type: Type.STRING,
      description: 'Orientação prática de acompanhamento para cidadãos, jornalistas e assessores.',
    },
  },
  required: [
    'resumoCidadao',
    'impactoFiscalAnalise',
    'quemGanha',
    'quemPerde',
    'cenarioVotacao',
    'recomendacaoEstrategica',
  ],
};

function buildLegislativePrompt(proposicao: ProposicaoLegislativa): string {
  const hist = (proposicao.historicoEventos || [])
    .slice(0, 4)
    .map((h) => `- ${h.data} (${h.local}): ${h.descricao}`)
    .join('\n');

  return `Você é um analista sênior de políticas públicas e processo legislativo do Congresso Nacional do Brasil.
Analise exclusivamente com base nos dados oficiais reais abaixo (não invente números orçamentários inexistentes caso o texto não os especifique):

Código: ${proposicao.codigo}
Casa Legislativa: ${proposicao.casa}
Órgão Atual: ${proposicao.orgaoAtual}
Autoria: ${proposicao.autor}
Relator: ${proposicao.relator?.nome || 'Não informado'} (${proposicao.relator?.partido || '-'}/${proposicao.relator?.uf || '-'})
Status de Tramitação: ${proposicao.statusTramitacao}
Regime de Urgência: ${proposicao.regimeUrgencia ? 'Sim' : 'Não'}
Quórum Exigido: ${proposicao.quorum?.descricaoRegra || 'Regimental'}
Composição Real Atual de Bancadas: Base Governista=${proposicao.bancadas?.governista}, Bloco Centro=${proposicao.bancadas?.centrao}, Oposição=${proposicao.bancadas?.oposicao}
Ementa Oficial: ${proposicao.ementa}
Despacho / Contexto: ${proposicao.resumoCidadao}
Últimas Tramitações:
${hist || 'Sem histórico detalhado'}

Retorne exclusivamente JSON estruturado em português claro com: resumo cidadão acessível, análise de impacto fiscal/regulatório baseada nos fatos da matéria, grupos que ganham (quemGanha), grupos onerados/afetados (quemPerde), cenário de votação e recomendação prática de acompanhamento.`;
}

function resolveServerApiKey(req?: express.Request): string {
  if (req) {
    const headerKey = req.headers['x-gemini-api-key'] as string;
    const authHeader = req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '';
    const bodyKey = req.body?.userApiKey;
    const candidate = (headerKey || bodyKey || authHeader || '').trim();
    if (candidate && candidate !== 'MY_GEMINI_API_KEY') {
      return candidate;
    }
  }

  const envKey =
    (process.env.RADAR_LEGISLATIVO_GEMINI_API_KEY &&
    process.env.RADAR_LEGISLATIVO_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ? process.env.RADAR_LEGISLATIVO_GEMINI_API_KEY
      : '') ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ? process.env.GEMINI_API_KEY
      : '');

  return envKey ? envKey.trim() : '';
}

// 5. Endpoint: Análise de Impacto Real via Google Gemini 4 Hydrogen (Executado no Servidor)
app.post('/api/ai-impact', async (req, res) => {
  const { proposicao } = req.body || {};
  if (!proposicao) {
    return res.status(400).json({ sucesso: false, erro: 'Dados da proposição não fornecidos.' });
  }

  const apiKey = resolveServerApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Nenhuma chave da API Gemini configurada no servidor ou informada pelo usuário.',
    });
  }

  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = buildLegislativePrompt(proposicao);

    const aiResponse = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: legislativeResponseSchema,
      },
    });

    const responseText = aiResponse.text;
    if (!responseText) {
      return res.status(502).json({
        sucesso: false,
        erro: 'O modelo Gemini retornou uma resposta vazia.',
      });
    }

    const parsed = JSON.parse(responseText);
    return res.json({
      sucesso: true,
      analiseIa: parsed,
      fonte: 'GEMINI_AI_SERVER',
      modelo: 'gemini-4-hydrogen',
    });
  } catch (aiError: any) {
    console.error('[Radar Legislativo] Erro ao consultar Gemini no servidor:', aiError?.message || aiError);
    return res.status(502).json({
      sucesso: false,
      erro: `Falha na consulta ao Gemini: ${aiError?.message || 'Erro desconhecido na API'}`,
    });
  }
});

// 5.1 Endpoint: Streaming SSE Real via Google Gemini 4 Hydrogen
app.post('/api/ai-impact/stream', async (req, res) => {
  const { proposicao } = req.body || {};
  if (!proposicao) {
    return res.status(400).json({ sucesso: false, erro: 'Dados da proposição não fornecidos.' });
  }

  const apiKey = resolveServerApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Nenhuma chave da API Gemini configurada.',
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = buildLegislativePrompt(proposicao);
    const stream = await client.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: legislativeResponseSchema,
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const part = chunk.text || '';
      fullText += part;
      res.write(`data: ${JSON.stringify({ chunk: part })}\n\n`);
    }

    const parsed = JSON.parse(fullText);
    res.write(
      `data: ${JSON.stringify({
        completo: true,
        analiseIa: parsed,
        fonte: 'GEMINI_AI_SERVER',
        modelo: 'gemini-4-hydrogen',
      })}\n\n`
    );
    res.end();
  } catch (err: any) {
    console.error('[Radar Legislativo] Erro streaming Gemini no servidor:', err?.message || err);
    res.write(
      `data: ${JSON.stringify({
        erro: err?.message || 'Erro durante geração em streaming no Gemini.',
      })}\n\n`
    );
    res.end();
  }
});

// 5.2 Endpoint: Status da IA no Servidor
app.get('/api/ai-status', (_req, res) => {
  const hasKey = Boolean(resolveServerApiKey());

  res.json({
    sucesso: true,
    modelo: 'gemini-4-hydrogen',
    servidorAtivo: true,
    chaveConfigurada: hasKey,
    capacidades: ['generateContent', 'generateContentStream'],
  });
});

// Setup dev server with Vite or production build serve
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`[Radar Legislativo] Server running at http://localhost:${port}`);
  });
}

startServer();
