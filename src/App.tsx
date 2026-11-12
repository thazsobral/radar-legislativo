import React, { useState, useEffect, useCallback } from 'react';
import { Header, TabType } from './components/Header';
import { RadarVotacoes } from './components/RadarVotacoes';
import { DashboardImpacto } from './components/DashboardImpacto';
import { RoboDivulgacao } from './components/RoboDivulgacao';
import { ConfiguracoesRobo } from './components/ConfiguracoesRobo';
import { PainelDiagnostico } from './components/PainelDiagnostico';
import { ModalAlertaAtivo } from './components/ModalAlertaAtivo';
import {
  ProposicaoLegislativa,
  AlertaDivulgacao,
  ConfiguracaoRobo,
} from './types/legislative';
import { tocarAlertaSonoro } from './utils/alertAudio';
import { ExternalLink, Radio, RefreshCw, AlertCircle } from 'lucide-react';

const CONFIG_PADRAO: ConfiguracaoRobo = {
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

export default function App() {
  const [tabAtiva, setTabAtiva] = useState<TabType>('radar');
  const [proposicoes, setProposicoes] = useState<ProposicaoLegislativa[]>([]);
  const [proposicaoSelecionada, setProposicaoSelecionada] = useState<ProposicaoLegislativa | null>(null);
  const [alertas, setAlertas] = useState<AlertaDivulgacao[]>([]);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [emVarredura, setEmVarredura] = useState(false);
  const [toastNotificacao, setToastNotificacao] = useState<string | null>(null);
  const [somAtivado, setSomAtivado] = useState<boolean>(true);
  const [alertaModalAberto, setAlertaModalAberto] = useState<AlertaDivulgacao | null>(null);

  const [ultimaVarredura, setUltimaVarredura] = useState<string>(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const [config, setConfig] = useState<ConfiguracaoRobo>(CONFIG_PADRAO);

  const mostrarToast = useCallback((msg: string) => {
    setToastNotificacao(msg);
    setTimeout(() => {
      setToastNotificacao(null);
    }, 4500);
  }, []);

  // Carregar dados 100% reais do backend ao montar
  const carregarDadosReais = useCallback(async () => {
    setCarregandoInicial(true);
    setErroCarga(null);
    try {
      const [respP, respA, respC] = await Promise.all([
        fetch('/api/proposicoes'),
        fetch('/api/alertas'),
        fetch('/api/config'),
      ]);

      const dataP = await respP.json();
      const dataA = await respA.json();
      const dataC = await respC.json();

      if (dataP.sucesso && Array.isArray(dataP.dados)) {
        setProposicoes(dataP.dados);
        if (dataP.dados.length > 0) {
          setProposicaoSelecionada((prev) => prev || dataP.dados[0]);
        }
        setUltimaVarredura(
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } else {
        setErroCarga(dataP.erro || 'Falha ao consultar APIs da Câmara e do Senado.');
      }

      if (dataA.sucesso && Array.isArray(dataA.dados)) {
        setAlertas(dataA.dados);
      }

      if (dataC.sucesso && dataC.config) {
        setConfig({ ...CONFIG_PADRAO, ...dataC.config });
      }
    } catch (err: any) {
      setErroCarga(err?.message || 'Erro de conexão com o servidor backend.');
    } finally {
      setCarregandoInicial(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosReais();
  }, [carregarDadosReais]);

  // Executar varredura ao vivo da pauta oficial da Câmara e do Senado
  const executarVarredura = useCallback(async () => {
    setEmVarredura(true);
    setErroCarga(null);
    try {
      const resp = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          casa: 'TODAS',
          apenasUrgentes: false,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.sucesso) {
        throw new Error(data.erro || `HTTP ${resp.status}`);
      }

      setProposicoes(data.dados || []);
      if (data.dados?.length > 0) {
        setProposicaoSelecionada((prev) => {
          if (!prev) return data.dados[0];
          return data.dados.find((p: ProposicaoLegislativa) => p.id === prev.id) || data.dados[0];
        });
      }

      const agora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setUltimaVarredura(agora);

      if (data.novasEncontradasCount > 0) {
        mostrarToast(`Varredura ao vivo concluída! ${data.novasEncontradasCount} novas matérias sincronizadas das APIs oficiais.`);
      } else {
        mostrarToast(`Varredura concluída: ${data.dados?.length || 0} matérias oficiais atualizadas.`);
      }
    } catch (err: any) {
      mostrarToast(`Erro na varredura ao vivo: ${err?.message || 'falha de comunicação com as APIs'}`);
    } finally {
      setEmVarredura(false);
    }
  }, [mostrarToast]);

  // Disparar Alerta Real para a proposição selecionada
  const dispararAlertaReal = useCallback(async () => {
    const prop = proposicaoSelecionada || proposicoes[0];
    if (!prop) {
      mostrarToast('Aguarde o carregamento de uma matéria real antes de disparar o alerta.');
      return;
    }

    try {
      const resp = await fetch('/api/alertas/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposicaoId: prop.id,
          proposicaoSnapshot: prop,
          canais: ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'PUSH'],
          webhookUrl: config.webhookUrl || undefined,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.sucesso && data.alerta) {
        if (somAtivado) {
          tocarAlertaSonoro();
        }
        setAlertas((prev) => [data.alerta, ...prev]);
        setAlertaModalAberto(data.alerta);
        mostrarToast(`Alerta registrado e disparado para ${prop.codigo}!`);
      } else {
        mostrarToast(data.erro || 'Não foi possível disparar o alerta.');
      }
    } catch (err: any) {
      mostrarToast(err?.message || 'Erro ao disparar alerta no servidor.');
    }
  }, [proposicaoSelecionada, proposicoes, config.webhookUrl, somAtivado, mostrarToast]);

  // Intervalo do Robô para varredura automática real
  useEffect(() => {
    if (!config.ativo) return;
    const intervalMs = Math.max(60000, config.intervaloMinutos * 60 * 1000);
    const timer = setInterval(() => {
      executarVarredura();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [config.ativo, config.intervaloMinutos, executarVarredura]);

  // Handlers para navegação contextual
  const irParaImpacto = (prop: ProposicaoLegislativa) => {
    setProposicaoSelecionada(prop);
    setTabAtiva('impacto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const irParaDivulgacao = (prop: ProposicaoLegislativa) => {
    setProposicaoSelecionada(prop);
    setTabAtiva('divulgacao');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onAlertaDisparado = (novoAlerta: AlertaDivulgacao) => {
    setAlertas((prev) => [novoAlerta, ...prev]);
    if (somAtivado) {
      tocarAlertaSonoro();
    }
    setAlertaModalAberto(novoAlerta);
    mostrarToast(`Alerta para ${novoAlerta.proposicaoCodigo} registrado e transmitido!`);
  };

  const salvarConfiguracoes = async (novaConfig: ConfiguracaoRobo) => {
    setConfig(novaConfig);
    try {
      const resp = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: novaConfig }),
      });
      if (resp.ok) {
        mostrarToast('Parâmetros e filtros do robô salvos no servidor!');
      } else {
        mostrarToast('Parâmetros aplicados na sessão.');
      }
    } catch {
      mostrarToast('Parâmetros aplicados na sessão.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification Banner */}
      {toastNotificacao && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-fade-in"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
            ✓
          </div>
          <span>{toastNotificacao}</span>
        </div>
      )}

      {/* Pop-up Modal de Alerta em Tempo Real */}
      {alertaModalAberto && (
        <ModalAlertaAtivo
          alerta={alertaModalAberto}
          proposicao={
            proposicoes.find((p) => p.id === alertaModalAberto.proposicaoId) || proposicaoSelecionada || undefined
          }
          onFechar={() => setAlertaModalAberto(null)}
          onVerImpacto={irParaImpacto}
          somAtivado={somAtivado}
        />
      )}

      {/* Main Header with Robot Telemetry & Alert Controls */}
      <Header
        tabAtiva={tabAtiva}
        setTabAtiva={setTabAtiva}
        roboAtivo={config.ativo}
        totalAlertas={alertas.length}
        alertas={alertas}
        emVarredura={emVarredura || carregandoInicial}
        onExecutarVarredura={executarVarredura}
        ultimaVarredura={ultimaVarredura}
        somAtivado={somAtivado}
        onToggleSom={() => {
          setSomAtivado(!somAtivado);
          mostrarToast(!somAtivado ? 'Som de alertas ativado!' : 'Som de alertas silenciado.');
        }}
        onDispararAlertaTeste={dispararAlertaReal}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {erroCarga && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold">Falha ao consultar APIs oficiais do Congresso Nacional</div>
                <div className="text-rose-700">{erroCarga}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={carregarDadosReais}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold cursor-pointer whitespace-nowrap"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {carregandoInicial && proposicoes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <h2 className="text-base font-bold text-slate-900">
              Conectando às APIs Oficiais da Câmara dos Deputados e do Senado Federal...
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Buscando pautas deliberativas em tempo real, composição atual de bancadas (513 deputados e 81 senadores) e tramitações legislativas.
            </p>
          </div>
        ) : (
          <>
            {tabAtiva === 'radar' && (
              <RadarVotacoes
                proposicoes={proposicoes}
                onSelecionarParaImpacto={irParaImpacto}
                onSelecionarParaDivulgacao={irParaDivulgacao}
                onExecutarVarredura={executarVarredura}
                emVarredura={emVarredura}
                onDispararAlertaTeste={dispararAlertaReal}
                onIrParaDiagnostico={() => setTabAtiva('diagnostico')}
              />
            )}

            {tabAtiva === 'impacto' && proposicaoSelecionada && (
              <DashboardImpacto
                proposicoes={proposicoes}
                proposicaoSelecionada={proposicaoSelecionada}
                onSelecionarProposicao={setProposicaoSelecionada}
                onIrParaDivulgacao={irParaDivulgacao}
              />
            )}

            {tabAtiva === 'divulgacao' && proposicaoSelecionada && (
              <RoboDivulgacao
                proposicoes={proposicoes}
                proposicaoSelecionada={proposicaoSelecionada}
                onSelecionarProposicao={setProposicaoSelecionada}
                alertas={alertas}
                onAlertaDisparado={onAlertaDisparado}
                webhookUrl={config.webhookUrl}
              />
            )}

            {tabAtiva === 'diagnostico' && (
              <PainelDiagnostico
                onDispararAlertaTeste={dispararAlertaReal}
                somAtivado={somAtivado}
                onToggleSom={() => setSomAtivado(!somAtivado)}
              />
            )}

            {tabAtiva === 'configuracoes' && (
              <ConfiguracoesRobo
                config={config}
                onSalvarConfig={salvarConfiguracoes}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Civic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 text-xs text-slate-500 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">
              Radar Legislativo · Dados Oficiais em Tempo Real
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTabAtiva('diagnostico')}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Diagnóstico dos Serviços
            </button>
            <span>·</span>
            <a
              href="https://dadosabertos.camara.leg.br"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 inline-flex items-center gap-1"
            >
              API Câmara dos Deputados <ExternalLink className="w-3 h-3" />
            </a>
            <span>·</span>
            <a
              href="https://legis.senado.leg.br/dadosabertos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 inline-flex items-center gap-1"
            >
              API Senado Federal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-[11px] text-slate-400">
            Transparência e Controle Social · Brasil
          </div>
        </div>
      </footer>
    </div>
  );
}
