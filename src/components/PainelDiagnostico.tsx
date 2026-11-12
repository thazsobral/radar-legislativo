import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  Bell,
  Radio,
  Server,
  Sparkles,
  Activity,
  Send,
  Database,
  HelpCircle,
  ArrowRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface PainelDiagnosticoProps {
  onDispararAlertaTeste: () => void;
  somAtivado: boolean;
  onToggleSom: () => void;
}

interface DiagnosticoResposta {
  sucesso: boolean;
  tempoExecucaoTotalMs?: number;
  uptimeSegundos?: number;
  timestamp?: string;
  servicos?: {
    roboVarredura: { status: string; proposicoesRastreadas: number; alertasDisparados: number };
    camaraDosDeputados: { online: boolean; latenciaMs: number; statusHttp?: number; detalhes: string };
    senadoFederal: { online: boolean; latenciaMs: number; statusHttp?: number; detalhes: string };
    inteligenciaArtificialGemini?: {
      status: string;
      modelo: string;
      processamento: string;
      chaveConfigurada: boolean;
    };
    sistemaAlertas: {
      inAppAudio: string;
      bannerVisual: string;
      webPush: string;
      webhookConfigurado?: boolean;
      canaisTransmitidos: string[];
    };
  };
}

export const PainelDiagnostico: React.FC<PainelDiagnosticoProps> = ({
  onDispararAlertaTeste,
  somAtivado,
  onToggleSom,
}) => {
  const [carregando, setCarregando] = useState(true);
  const [erroDiagnostico, setErroDiagnostico] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>('—');
  const [dadosDiagnostico, setDadosDiagnostico] = useState<DiagnosticoResposta | null>(null);

  const executarDiagnostico = async () => {
    setCarregando(true);
    setErroDiagnostico(null);
    try {
      const resp = await fetch('/api/diagnostico');
      if (!resp.ok) {
        throw new Error(`Servidor retornou HTTP ${resp.status}`);
      }
      const data: DiagnosticoResposta = await resp.json();
      setDadosDiagnostico(data);
      setUltimaAtualizacao(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err: any) {
      setErroDiagnostico(
        err?.message || 'Não foi possível comunicar com o backend para verificar os serviços.'
      );
      setDadosDiagnostico(null);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    executarDiagnostico();
  }, []);

  const servicos = dadosDiagnostico?.servicos;
  const camaraOnline = servicos?.camaraDosDeputados?.online ?? false;
  const senadoOnline = servicos?.senadoFederal?.online ?? false;
  const geminiChave = servicos?.inteligenciaArtificialGemini?.chaveConfigurada ?? false;
  const modeloGemini = servicos?.inteligenciaArtificialGemini?.modelo || 'gemini-4-hydrogen';
  const roboAtivo = servicos?.roboVarredura?.status === 'OPERACIONAL';
  const webhookConfigurado = servicos?.sistemaAlertas?.webhookConfigurado ?? false;

  const totalProposicoes = servicos?.roboVarredura?.proposicoesRastreadas ?? 0;
  const totalAlertas = servicos?.roboVarredura?.alertasDisparados ?? 0;
  const latenciaCamara = servicos?.camaraDosDeputados?.latenciaMs ?? 0;
  const latenciaSenado = servicos?.senadoFederal?.latenciaMs ?? 0;

  const apisAtivasCount = [camaraOnline, senadoOnline].filter(Boolean).length;
  const disponibilidadeApisPct = dadosDiagnostico
    ? Math.round((apisAtivasCount / 2) * 100)
    : 0;

  const latenciaMedia =
    apisAtivasCount > 0
      ? Math.round(
          ((camaraOnline ? latenciaCamara : 0) + (senadoOnline ? latenciaSenado : 0)) /
            apisAtivasCount
        )
      : 0;

  const subsistemasOperacionais = [
    camaraOnline,
    senadoOnline,
    geminiChave,
    roboAtivo,
    true, // Alertas Web Audio & Pop-up in-app
    true, // Canais de compartilhamento social
  ].filter(Boolean).length;

  const todosCriticosOnline = Boolean(dadosDiagnostico && camaraOnline && senadoOnline);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Painel de Status do Serviço */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Status Header Bar */}
        <div className="p-6 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative flex h-3.5 w-3.5">
                  {todosCriticosOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                      carregando && !dadosDiagnostico
                        ? 'bg-slate-400'
                        : todosCriticosOnline
                        ? 'bg-emerald-600'
                        : erroDiagnostico
                        ? 'bg-rose-600'
                        : 'bg-amber-500'
                    }`}
                  ></span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Painel de Status do Serviço
                </h2>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    carregando && !dadosDiagnostico
                      ? 'text-slate-700 bg-slate-100 border-slate-200'
                      : todosCriticosOnline
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : erroDiagnostico
                      ? 'text-rose-800 bg-rose-50 border-rose-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                  }`}
                >
                  {carregando && !dadosDiagnostico
                    ? 'Verificando Conexões...'
                    : todosCriticosOnline
                    ? 'APIs Oficiais Operacionais'
                    : erroDiagnostico
                    ? 'Erro de Comunicação'
                    : 'Degradação Parcial'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Telemetria em tempo real medida diretamente nos portais de Dados Abertos</span>
                <span>·</span>
                <span className="font-mono flex items-center gap-1 text-slate-600">
                  <Clock className="w-3 h-3 text-slate-400" /> Atualizado às {ultimaAtualizacao}
                </span>
                {dadosDiagnostico?.tempoExecucaoTotalMs !== undefined && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-slate-500">
                      Varredura de ping: {dadosDiagnostico.tempoExecucaoTotalMs} ms
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onToggleSom}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  somAtivado
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
                title={somAtivado ? 'Silenciar som de alerta' : 'Ativar som de alerta'}
              >
                {somAtivado ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{somAtivado ? 'Áudio Ativo' : 'Áudio Mudo'}</span>
              </button>

              <button
                type="button"
                onClick={onDispararAlertaTeste}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Testar Alerta Imediato</span>
              </button>

              <button
                type="button"
                onClick={executarDiagnostico}
                disabled={carregando}
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors disabled:opacity-50"
                title="Atualizar métricas de status agora"
              >
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin text-emerald-700' : ''}`} />
              </button>
            </div>
          </div>

          {erroDiagnostico && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{erroDiagnostico}</span>
              </div>
              <button
                type="button"
                onClick={executarDiagnostico}
                className="px-2.5 py-1 rounded bg-rose-700 text-white font-semibold hover:bg-rose-800 cursor-pointer shrink-0"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Key Metric Counters (Real Telemetry) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" /> APIs Oficiais Online
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {carregando && !dadosDiagnostico ? '—' : `${disponibilidadeApisPct}%`}
              </div>
              <div
                className={`text-[10px] font-medium mt-0.5 ${
                  apisAtivasCount === 2 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {dadosDiagnostico
                  ? `${apisAtivasCount} de 2 portais respondendo`
                  : 'Aguardando verificação'}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" /> Matérias em Memória
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {totalProposicoes}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pautas ativas Câmara e Senado</div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-600" /> Alertas Disparados
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {totalAlertas}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Persistidos em histórico real</div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" /> Latência Média APIs
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {latenciaMedia > 0 ? `${latenciaMedia} ms` : '—'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Medição HTTP direta do servidor
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Subsystem Status Cards */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Subsistemas & Conexões Oficiais
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {dadosDiagnostico ? `${subsistemasOperacionais} de 6 ativos` : 'Consultando...'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* 1. API Câmara dos Deputados */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Server className={`w-4 h-4 ${camaraOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <span>Câmara dos Deputados</span>
                </div>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    camaraOnline
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-rose-800 bg-rose-50 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${camaraOnline ? 'bg-emerald-600' : 'bg-rose-600'}`}
                  ></span>{' '}
                  {camaraOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {servicos?.camaraDosDeputados?.detalhes || 'Aguardando resposta da API Dados Abertos v2'}
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Latência: <strong>{latenciaCamara} ms</strong>
                </span>
                <span>
                  Endpoint: <strong>api/v2</strong>
                </span>
              </div>
            </div>

            {/* 2. API Senado Federal */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Server className={`w-4 h-4 ${senadoOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <span>Senado Federal</span>
                </div>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    senadoOnline
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-rose-800 bg-rose-50 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${senadoOnline ? 'bg-emerald-600' : 'bg-rose-600'}`}
                  ></span>{' '}
                  {senadoOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {servicos?.senadoFederal?.detalhes || 'Aguardando resposta da API Dados Abertos do Senado'}
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Latência: <strong>{latenciaSenado} ms</strong>
                </span>
                <span>
                  Fonte: <strong>dadosabertos</strong>
                </span>
              </div>
            </div>

            {/* 3. IA Google Gemini 4 Hydrogen */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles className={`w-4 h-4 ${geminiChave ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>IA Gemini 4 Hydrogen</span>
                </div>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    geminiChave
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${geminiChave ? 'bg-emerald-600' : 'bg-amber-600'}`}
                  ></span>{' '}
                  {geminiChave ? 'NO SERVIDOR' : 'CHAVE PENDENTE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {geminiChave
                  ? 'Parecer inteligente, análise fiscal e streaming SSE ativos no backend Node.js.'
                  : 'Informe sua chave na aba Análise de Impacto ou configure GEMINI_API_KEY no servidor.'}
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Modelo: <strong>{modeloGemini}</strong>
                </span>
                <span>
                  SDK: <strong>@google/genai</strong>
                </span>
              </div>
            </div>

            {/* 4. Robô de Varredura de Pauta */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Radio className={`w-4 h-4 ${roboAtivo ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>Robô de Varredura</span>
                </div>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    roboAtivo
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${roboAtivo ? 'bg-emerald-600' : 'bg-amber-600'}`}
                  ></span>{' '}
                  {servicos?.roboVarredura?.status || 'VERIFICANDO'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Varredura contínua das pautas reais de Plenário (PECs, PLs, PLPs e MPVs) e tramitações oficiais.
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Proposições: <strong>{totalProposicoes}</strong>
                </span>
                <span>
                  Modo: <strong>Tempo Real</strong>
                </span>
              </div>
            </div>

            {/* 5. Sistema de Alertas Sonoros & Visuais */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span>Alertas Sonoros & Pop-up</span>
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> PRONTO
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sinal sonoro parlamentar via Web Audio API e pop-up instantâneo em tela ao disparar alertas reais.
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Áudio: <strong>{somAtivado ? 'Ativado' : 'Silenciado'}</strong>
                </span>
                <span>
                  Tela: <strong>Modal Instantâneo</strong>
                </span>
              </div>
            </div>

            {/* 6. Conectores de Divulgação Multicanal & Webhook */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Divulgação & Webhook HTTP</span>
                </div>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    webhookConfigurado
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-slate-700 bg-slate-100 border-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      webhookConfigurado ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}
                  ></span>{' '}
                  {webhookConfigurado ? 'WEBHOOK ATIVO' : 'CANAL SOCIAL'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Compartilhamento com links oficiais no WhatsApp, Telegram e X, além de disparo POST real para Webhook.
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Disparos: <strong>{totalAlertas}</strong>
                </span>
                <span>
                  Webhook: <strong>{webhookConfigurado ? 'Configurado' : 'Opcional'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Seção: Como Garantir que o Robô está Funcionando? */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Como Garantir que o Robô está Funcionando?
              </h3>
              <p className="text-xs text-slate-500">
                4 passos rápidos para testar e comprovar o funcionamento real de cada módulo.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 w-fit">
            Guia de Validação Rápida
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Passo 1 */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                1
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                Confira a Telemetria Real das APIs
              </h4>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              No painel acima, verifique o status HTTP e a latência medida em milissegundos diretamente nos portais oficiais da Câmara e do Senado. Clique no ícone de atualização para executar um novo ping em tempo real.
            </p>
            <div className="pt-2 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Conexão HTTP direta sem dados fictícios</span>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                2
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                Dispare um Alerta Real da Pauta Ativa
              </h4>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Clique em <strong>"Testar Alerta Imediato"</strong> no topo desta tela para disparar um alerta real sobre a proposição prioritária da pauta atual, ativando o pop-up em tela, o áudio Web Audio e o envio para seu Webhook se configurado.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onDispararAlertaTeste}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Testar alerta sonoro e visual agora</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                3
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                Execute a Varredura Ao Vivo da Pauta Oficial
              </h4>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Na aba <strong>"Radar de Votações & Pauta"</strong>, clique em <strong>"Escanear Agora"</strong>. O robô consulta em tempo real a pauta do Plenário da Câmara e do Senado, além de proposições recentes com tramitação ativa.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Filtre por tipo (PEC, PL, PLP, MPV) e regime de urgência</span>
            </div>
          </div>

          {/* Passo 4 */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                4
              </span>
              <h4 className="font-bold text-slate-900 text-sm">
                Gere o Parecer de IA com Bancadas Reais
              </h4>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Na aba <strong>"Análise de Impacto Parlamentar"</strong>, confira o cálculo de quórum com a composição real dos 513 deputados ou 81 senadores em exercício e gere o parecer estruturado via Google Gemini 4 Hydrogen no servidor.
            </p>
            <div className="pt-2 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>IA Google Gemini 4 Hydrogen integrada no backend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
