import {
  AlertaDivulgacao,
  CasaLegislativa,
  ConfiguracaoRobo,
  ProposicaoLegislativa,
} from '../types/legislative';
import { carregarProposicoesReais } from './legislativeDataService';

const STORAGE_ALERTAS_KEY = 'radar_legislativo_alertas_v1';
const STORAGE_CONFIG_KEY = 'radar_legislativo_config_v1';

export const CONFIG_PADRAO: ConfiguracaoRobo = {
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

let backendIndisponivelDetectado = false;
let proposicoesMemoriaStatic: ProposicaoLegislativa[] = [];

export function getApiBaseUrl(): string {
  const envBase =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '';
  return String(envBase).replace(/\/+$/, '');
}

export function isStaticMode(): boolean {
  if (getApiBaseUrl()) return false;
  if (backendIndisponivelDetectado) return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host.endsWith('.github.io') ||
      host.endsWith('.gitlab.io') ||
      window.location.protocol === 'file:'
    ) {
      return true;
    }
  }
  return false;
}

function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}

async function fetchBackendJson(path: string, init?: RequestInit): Promise<any> {
  const resp = await fetch(buildApiUrl(path), init);
  const contentType = resp.headers.get('content-type') || '';
  if (resp.status === 404 || (!contentType.includes('application/json') && resp.ok)) {
    // Hospedagem estática (ex.: GitHub Pages / Netlify SPA fallback) sem backend Express
    backendIndisponivelDetectado = true;
    throw Object.assign(new Error('BACKEND_UNAVAILABLE'), { isStaticFallback: true });
  }
  const data = await resp.json().catch(() => null);
  return { resp, data };
}

function readLocalAlertas(): AlertaDivulgacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_ALERTAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAlertas(alertas: AlertaDivulgacao[]) {
  try {
    localStorage.setItem(STORAGE_ALERTAS_KEY, JSON.stringify(alertas.slice(0, 50)));
  } catch {
    // Ignora limite de quota
  }
}

function readLocalConfig(): ConfiguracaoRobo {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return { ...CONFIG_PADRAO };
    return { ...CONFIG_PADRAO, ...JSON.parse(raw) };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

function writeLocalConfig(config: ConfiguracaoRobo) {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignora limite de quota
  }
}

export async function fetchProposicoesReais(forcar = false): Promise<{
  sucesso: boolean;
  dados: ProposicaoLegislativa[];
  erro?: string;
}> {
  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson(
        forcar ? '/api/proposicoes?refresh=true' : '/api/proposicoes'
      );
      if (resp.ok && data?.sucesso && Array.isArray(data.dados)) {
        proposicoesMemoriaStatic = data.dados;
        return { sucesso: true, dados: data.dados };
      }
      if (data?.erro) {
        return { sucesso: false, dados: data.dados || [], erro: data.erro };
      }
    } catch (err: any) {
      if (!err?.isStaticFallback) {
        return {
          sucesso: false,
          dados: [],
          erro: err?.message || 'Erro de conexão com o servidor backend.',
        };
      }
    }
  }

  // Modo estático direto no navegador (ex.: GitHub Pages) usando APIs oficiais com CORS
  const { proposicoes } = await carregarProposicoesReais();
  proposicoesMemoriaStatic = proposicoes;
  if (proposicoes.length === 0) {
    return {
      sucesso: false,
      dados: [],
      erro: 'Não foi possível obter proposições das APIs da Câmara e do Senado no navegador.',
    };
  }
  return { sucesso: true, dados: proposicoes };
}

export async function fetchAlertasReais(): Promise<AlertaDivulgacao[]> {
  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson('/api/alertas');
      if (resp.ok && data?.sucesso && Array.isArray(data.dados)) {
        return data.dados;
      }
    } catch (err: any) {
      if (!err?.isStaticFallback) return [];
    }
  }
  return readLocalAlertas();
}

export async function fetchConfigRobo(): Promise<ConfiguracaoRobo> {
  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson('/api/config');
      if (resp.ok && data?.sucesso && data.config) {
        return { ...CONFIG_PADRAO, ...data.config };
      }
    } catch (err: any) {
      if (!err?.isStaticFallback) return { ...CONFIG_PADRAO };
    }
  }
  return readLocalConfig();
}

export async function saveConfigRobo(
  novaConfig: ConfiguracaoRobo
): Promise<{ ok: boolean; persistidoServidor: boolean }> {
  writeLocalConfig(novaConfig);
  if (!isStaticMode()) {
    try {
      const { resp } = await fetchBackendJson('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: novaConfig }),
      });
      if (resp.ok) return { ok: true, persistidoServidor: true };
    } catch (err: any) {
      if (!err?.isStaticFallback) return { ok: false, persistidoServidor: false };
    }
  }
  return { ok: true, persistidoServidor: false };
}

export async function scanProposicoesReais(opcoes?: {
  casa?: 'TODAS' | CasaLegislativa;
  termo?: string;
  siglaTipo?: string;
  apenasUrgentes?: boolean;
}): Promise<{
  sucesso: boolean;
  novasEncontradasCount: number;
  dados: ProposicaoLegislativa[];
  erro?: string;
}> {
  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opcoes || { casa: 'TODAS', apenasUrgentes: false }),
      });
      if (!resp.ok || !data?.sucesso) {
        throw new Error(data?.erro || `HTTP ${resp.status}`);
      }
      proposicoesMemoriaStatic = data.dados || [];
      return {
        sucesso: true,
        novasEncontradasCount: data.novasEncontradasCount || 0,
        dados: data.dados || [],
      };
    } catch (err: any) {
      if (!err?.isStaticFallback) {
        return {
          sucesso: false,
          novasEncontradasCount: 0,
          dados: [],
          erro: err?.message || 'Erro ao executar varredura no servidor.',
        };
      }
    }
  }

  const idsAntigos = new Set(proposicoesMemoriaStatic.map((p) => p.id));
  const { proposicoes } = await carregarProposicoesReais(opcoes);
  if (proposicoes.length > 0) {
    proposicoesMemoriaStatic = proposicoes;
  }
  const novasEncontradasCount =
    idsAntigos.size === 0
      ? proposicoes.length
      : proposicoes.filter((p) => !idsAntigos.has(p.id)).length;

  return {
    sucesso: true,
    novasEncontradasCount,
    dados: proposicoes,
  };
}

export async function dispararAlertaRobo(params: {
  proposicao: ProposicaoLegislativa;
  canais?: string[];
  mensagemPersonalizada?: string;
  webhookUrl?: string;
}): Promise<{ sucesso: boolean; alerta?: AlertaDivulgacao; erro?: string }> {
  const { proposicao, canais, mensagemPersonalizada, webhookUrl } = params;

  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson('/api/alertas/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposicaoId: proposicao.id,
          proposicaoSnapshot: proposicao,
          canais,
          mensagemPersonalizada,
          webhookUrl: webhookUrl || undefined,
        }),
      });
      if (resp.ok && data?.sucesso && data.alerta) {
        return { sucesso: true, alerta: data.alerta };
      }
      return { sucesso: false, erro: data?.erro || 'Erro ao registrar disparo no servidor.' };
    } catch (err: any) {
      if (!err?.isStaticFallback) {
        return { sucesso: false, erro: err?.message || 'Falha de rede ao enviar alerta.' };
      }
    }
  }

  // Modo estático: disparo direto com persistência em localStorage + Webhook HTTP real (sujeito a CORS do destino)
  let webhookEntrega: AlertaDivulgacao['webhookEntrega'];
  const targetWebhook = (webhookUrl || readLocalConfig().webhookUrl || '').trim();
  if (targetWebhook) {
    try {
      const resp = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento: 'ALERTA_VOTACAO',
          origem: 'Radar Legislativo',
          timestamp: new Date().toISOString(),
          proposicao: {
            id: proposicao.id,
            codigo: proposicao.codigo,
            casa: proposicao.casa,
            titulo: proposicao.tituloCurto,
            ementa: proposicao.ementa,
            status: proposicao.statusTramitacao,
            quorum: proposicao.quorum,
            probabilidadeAprovacao: proposicao.probabilidadeAprovacao,
            linkOficial: proposicao.linkOficial,
          },
          mensagem: mensagemPersonalizada || proposicao.ementa,
        }),
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
        erro: err?.message || 'Bloqueado por CORS ou falha de rede no navegador.',
      };
    }
  }

  const novoAlerta: AlertaDivulgacao = {
    id: `alt-${Date.now()}`,
    proposicaoId: proposicao.id,
    proposicaoCodigo: proposicao.codigo,
    titulo: `ALERTA DE VOTAÇÃO: ${proposicao.codigo} - ${proposicao.tituloCurto}`,
    mensagem:
      mensagemPersonalizada ||
      `${proposicao.codigo} (${proposicao.orgaoAtual}) · Status: ${proposicao.statusTramitacao}. Quórum exigido: ${proposicao.quorum.minimoVotos} votos (${proposicao.quorum.tipo}).`,
    canais: (canais as any) || ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'PUSH'],
    status: 'DISPARADO',
    dataHora: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    linkCompartilhavel: proposicao.linkOficial,
    webhookEntrega,
  };

  const atual = readLocalAlertas();
  writeLocalAlertas([novoAlerta, ...atual]);
  return { sucesso: true, alerta: novoAlerta };
}

export async function testarWebhookReal(webhookUrl: string): Promise<{
  sucesso: boolean;
  statusHttp?: number;
  latenciaMs?: number;
  erro?: string;
}> {
  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      return {
        sucesso: Boolean(resp.ok && data?.sucesso),
        statusHttp: data?.statusHttp ?? resp.status,
        latenciaMs: data?.latenciaMs,
        erro: data?.erro,
      };
    } catch (err: any) {
      if (!err?.isStaticFallback) {
        return { sucesso: false, erro: err?.message || 'Erro de rede ao testar webhook.' };
      }
    }
  }

  const t0 = Date.now();
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento: 'TESTE_CONEXAO_WEBHOOK',
        origem: 'Radar Legislativo',
        timestamp: new Date().toISOString(),
        mensagem: 'Ping real de verificação de entrega de alertas legislativos.',
      }),
    });
    return {
      sucesso: resp.ok,
      statusHttp: resp.status,
      latenciaMs: Date.now() - t0,
      erro: resp.ok ? undefined : `Endpoint retornou HTTP ${resp.status}`,
    };
  } catch (err: any) {
    return {
      sucesso: false,
      statusHttp: 0,
      latenciaMs: Date.now() - t0,
      erro:
        'Navegador bloqueado por CORS do destino ou endpoint inacessível. Para webhooks sem CORS, conecte o backend Node.js (VITE_API_BASE_URL).',
    };
  }
}

export async function fetchDiagnosticoReal(): Promise<any> {
  if (!isStaticMode()) {
    try {
      const { resp, data } = await fetchBackendJson('/api/diagnostico');
      if (resp.ok && data) {
        return { ...data, modoExecucao: 'BACKEND_SERVER' };
      }
    } catch (err: any) {
      if (!err?.isStaticFallback) {
        throw err;
      }
    }
  }

  // Modo estático: ping direto do navegador nas APIs oficiais da Câmara e do Senado
  const inicio = Date.now();
  const pingCamara = async () => {
    const t0 = Date.now();
    try {
      const resp = await fetch('https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=1');
      return {
        online: resp.ok,
        latenciaMs: Date.now() - t0,
        statusHttp: resp.status,
        detalhes: resp.ok
          ? `HTTP ${resp.status} OK (Consulta direta do navegador à API Dados Abertos v2)`
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

  const pingSenado = async () => {
    const t0 = Date.now();
    try {
      const resp = await fetch('https://legis.senado.leg.br/dadosabertos/senador/lista/atual', {
        headers: { Accept: 'application/json' },
      });
      return {
        online: resp.ok,
        latenciaMs: Date.now() - t0,
        statusHttp: resp.status,
        detalhes: resp.ok
          ? `HTTP ${resp.status} OK (Consulta direta do navegador à API Dados Abertos do Senado)`
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

  const [statusCamara, statusSenado] = await Promise.all([pingCamara(), pingSenado()]);
  const configLocal = readLocalConfig();
  const alertasLocal = readLocalAlertas();
  const userKey =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('RADAR_LEGISLATIVO_GEMINI_API_KEY') ||
        localStorage.getItem('gemini_api_key'))) ||
    '';

  return {
    sucesso: true,
    modoExecucao: 'STATIC_BROWSER',
    timestamp: new Date().toISOString(),
    tempoExecucaoTotalMs: Date.now() - inicio,
    servicos: {
      roboVarredura: {
        status: configLocal.ativo ? 'OPERACIONAL' : 'PAUSADO',
        proposicoesRastreadas: proposicoesMemoriaStatic.length,
        alertasDisparados: alertasLocal.length,
      },
      camaraDosDeputados: statusCamara,
      senadoFederal: statusSenado,
      inteligenciaArtificialGemini: {
        status: userKey.trim() ? 'OPERACIONAL' : 'CHAVE_NAO_CONFIGURADA',
        modelo: 'gemini-4-hydrogen',
        processamento: 'NAVEGADOR (CHAVE DO USUÁRIO)',
        chaveConfigurada: Boolean(userKey.trim()),
      },
      sistemaAlertas: {
        inAppAudio: 'ATIVO',
        bannerVisual: 'ATIVO',
        webPush: 'SUPORTADO',
        webhookConfigurado: Boolean(configLocal.webhookUrl?.trim()),
        canaisTransmitidos: ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'WEBHOOK'],
      },
    },
  };
}
