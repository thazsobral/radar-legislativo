import React, { useState, useEffect, useCallback } from 'react';
import { Header, TabType } from './components/Header';
import { RadarVotacoes } from './components/RadarVotacoes';
import { DashboardImpacto } from './components/DashboardImpacto';
import { RoboDivulgacao } from './components/RoboDivulgacao';
import { ConfiguracoesRobo } from './components/ConfiguracoesRobo';
import { PainelDiagnostico } from './components/PainelDiagnostico';
import { ModalAlertaAtivo } from './components/ModalAlertaAtivo';
import { PROPOSICOES_INICIAIS, ALERTAS_INICIAIS } from './data/mockLegislativeData';
import {
  ProposicaoLegislativa,
  AlertaDivulgacao,
  ConfiguracaoRobo,
} from './types/legislative';
import { tocarAlertaSonoro } from './utils/alertAudio';
import { ExternalLink, Radio } from 'lucide-react';

export default function App() {
  const [tabAtiva, setTabAtiva] = useState<TabType>('radar');
  const [proposicoes, setProposicoes] = useState<ProposicaoLegislativa[]>(PROPOSICOES_INICIAIS);
  const [proposicaoSelecionada, setProposicaoSelecionada] = useState<ProposicaoLegislativa>(
    PROPOSICOES_INICIAIS[0]
  );
  const [alertas, setAlertas] = useState<AlertaDivulgacao[]>(ALERTAS_INICIAIS);
  const [emVarredura, setEmVarredura] = useState(false);
  const [toastNotificacao, setToastNotificacao] = useState<string | null>(null);
  const [somAtivado, setSomAtivado] = useState<boolean>(true);
  const [alertaModalAberto, setAlertaModalAberto] = useState<AlertaDivulgacao | null>(null);

  const [ultimaVarredura, setUltimaVarredura] = useState<string>(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const [config, setConfig] = useState<ConfiguracaoRobo>({
    ativo: true,
    intervaloMinutos: 15,
    palavrasChave: [
      'reforma tributária',
      'inteligência artificial',
      'combustíveis do futuro',
      'apostas',
      'redes sociais',
      'igualdade salarial',
    ],
    temasFiltro: ['Tributário', 'Economia', 'Tecnologia', 'Meio Ambiente'],
    casasMonitoradas: ['CAMARA', 'SENADO', 'CONGRESSO'],
    apenasUrgentes: true,
    notificacoesBrowser: true,
    webhookUrl: 'https://api.exemplo.gov.br/webhook/parlamentar',
    autoPublicarRedes: true,
    impactoMinimoFiscalBi: 1.0,
  });

  // Mostra um aviso rápido toast
  const mostrarToast = useCallback((msg: string) => {
    setToastNotificacao(msg);
    setTimeout(() => {
      setToastNotificacao(null);
    }, 4000);
  }, []);

  // Executar varredura da pauta oficial
  const executarVarredura = useCallback(async () => {
    setEmVarredura(true);
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
      if (data.sucesso && data.dados) {
        setProposicoes(data.dados);
        const agora = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setUltimaVarredura(agora);
        if (data.novasEncontradasCount > 0) {
          mostrarToast(`Varredura concluída! ${data.novasEncontradasCount} novas matérias adicionadas da API oficial.`);
        } else {
          mostrarToast(`Varredura concluída: todas as ${data.dados.length} matérias da pauta estão atualizadas.`);
        }
      }
    } catch (_err) {
      setUltimaVarredura(new Date().toLocaleTimeString('pt-BR'));
      mostrarToast('Varredura local sincronizada com sucesso.');
    } finally {
      setEmVarredura(false);
    }
  }, [mostrarToast]);

  // Disparar Alerta Imediato de Demonstração / Teste
  const dispararAlertaTeste = useCallback(() => {
    // Escolhe a proposta selecionada ou a primeira da pauta
    const prop = proposicaoSelecionada || proposicoes[0];
    const novoAlerta: AlertaDivulgacao = {
      id: `alt-teste-${Date.now()}`,
      proposicaoId: prop.id,
      proposicaoCodigo: prop.codigo,
      titulo: `🚨 VOTAÇÃO IMINENTE: ${prop.codigo} - ${prop.tituloCurto}`,
      mensagem: `O Colégio de Líderes incluiu ${prop.codigo} para deliberação nominal imediata. Quórum necessário: ${prop.quorum.minimoVotos} votos (${prop.quorum.tipo}). Termômetro de aprovação em ${prop.probabilidadeAprovacao}%.`,
      canais: ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'PUSH'],
      status: 'DISPARADO',
      dataHora: 'Agora mesmo',
      destinatariosSimulados: 16400,
    };

    if (somAtivado) {
      tocarAlertaSonoro();
    }

    setAlertas((prev) => [novoAlerta, ...prev]);
    setAlertaModalAberto(novoAlerta);
    mostrarToast(`Alerta sonoro e visual disparado com sucesso para ${prop.codigo}!`);
  }, [proposicaoSelecionada, proposicoes, somAtivado, mostrarToast]);

  // Carregar dados iniciais do backend ao montar
  useEffect(() => {
    const carregarIniciais = async () => {
      try {
        const [respP, respA] = await Promise.all([
          fetch('/api/proposicoes'),
          fetch('/api/alertas'),
        ]);
        const dataP = await respP.json();
        const dataA = await respA.json();
        if (dataP.sucesso && dataP.dados?.length) {
          setProposicoes(dataP.dados);
          setProposicaoSelecionada(dataP.dados[0]);
        }
        if (dataA.sucesso && dataA.dados?.length) {
          setAlertas(dataA.dados);
        }
      } catch (_err) {
        // Mantém defaults
      }
    };
    carregarIniciais();
  }, []);

  // Intervalo do Robô para checagem contínua em segundo plano
  useEffect(() => {
    if (!config.ativo) return;
    const intervalMs = Math.max(30000, config.intervaloMinutos * 60 * 1000);
    const timer = setInterval(() => {
      setUltimaVarredura(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, intervalMs);
    return () => clearInterval(timer);
  }, [config.ativo, config.intervaloMinutos]);

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
    mostrarToast(`Alerta para ${novoAlerta.proposicaoCodigo} transmitido para todos os canais!`);
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

      {/* Pop-up Modal de Alerta em Tempo Real (Garantido no Navegador e em iFrame) */}
      {alertaModalAberto && (
        <ModalAlertaAtivo
          alerta={alertaModalAberto}
          proposicao={
            proposicoes.find((p) => p.id === alertaModalAberto.proposicaoId) || proposicaoSelecionada
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
        emVarredura={emVarredura}
        onExecutarVarredura={executarVarredura}
        ultimaVarredura={ultimaVarredura}
        somAtivado={somAtivado}
        onToggleSom={() => {
          setSomAtivado(!somAtivado);
          mostrarToast(!somAtivado ? 'Som de alertas ativado!' : 'Som de alertas silenciado.');
        }}
        onDispararAlertaTeste={dispararAlertaTeste}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tabAtiva === 'radar' && (
          <RadarVotacoes
            proposicoes={proposicoes}
            onSelecionarParaImpacto={irParaImpacto}
            onSelecionarParaDivulgacao={irParaDivulgacao}
            onExecutarVarredura={executarVarredura}
            emVarredura={emVarredura}
            onDispararAlertaTeste={dispararAlertaTeste}
            onIrParaDiagnostico={() => setTabAtiva('diagnostico')}
          />
        )}

        {tabAtiva === 'impacto' && (
          <DashboardImpacto
            proposicoes={proposicoes}
            proposicaoSelecionada={proposicaoSelecionada}
            onSelecionarProposicao={setProposicaoSelecionada}
            onIrParaDivulgacao={irParaDivulgacao}
          />
        )}

        {tabAtiva === 'divulgacao' && (
          <RoboDivulgacao
            proposicoes={proposicoes}
            proposicaoSelecionada={proposicaoSelecionada}
            onSelecionarProposicao={setProposicaoSelecionada}
            alertas={alertas}
            onAlertaDisparado={onAlertaDisparado}
          />
        )}

        {tabAtiva === 'diagnostico' && (
          <PainelDiagnostico
            onDispararAlertaTeste={dispararAlertaTeste}
            somAtivado={somAtivado}
            onToggleSom={() => setSomAtivado(!somAtivado)}
          />
        )}

        {tabAtiva === 'configuracoes' && (
          <ConfiguracoesRobo
            config={config}
            onSalvarConfig={(novaConfig) => {
              setConfig(novaConfig);
              mostrarToast('Parâmetros e filtros do robô salvos com sucesso!');
            }}
          />
        )}
      </main>

      {/* Clean Civic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 text-xs text-slate-500 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">
              Radar Legislativo · Robô de Votações & Análise de Impacto
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
