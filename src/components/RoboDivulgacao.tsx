import React, { useState } from 'react';
import {
  Send,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Bell,
  Globe,
  Radio,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ProposicaoLegislativa, CanalDivulgacao, AlertaDivulgacao } from '../types/legislative';
import { gerarTextoDivulgacao } from '../utils/parliamentaryMath';
import { CardVisualSocial } from './CardVisualSocial';

interface RoboDivulgacaoProps {
  proposicoes: ProposicaoLegislativa[];
  proposicaoSelecionada: ProposicaoLegislativa;
  onSelecionarProposicao: (proposicao: ProposicaoLegislativa) => void;
  alertas: AlertaDivulgacao[];
  onAlertaDisparado: (novoAlerta: AlertaDivulgacao) => void;
}

export const RoboDivulgacao: React.FC<RoboDivulgacaoProps> = ({
  proposicoes,
  proposicaoSelecionada,
  onSelecionarProposicao,
  alertas,
  onAlertaDisparado,
}) => {
  const [canalAtivo, setCanalAtivo] = useState<CanalDivulgacao>('WHATSAPP');
  const [copiado, setCopiado] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>('');

  const textoGerado = gerarTextoDivulgacao(proposicaoSelecionada, canalAtivo);

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(textoGerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (_err) {
      // Fallback
    }
  };

  // Disparar Alerta através do servidor e canais
  const dispararAlertaGeral = async () => {
    setDisparando(true);
    try {
      const resp = await fetch('/api/alertas/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposicaoId: proposicaoSelecionada.id,
          canais: ['WHATSAPP', 'TELEGRAM', 'TWITTER', 'PUSH'],
          mensagemPersonalizada: textoGerado,
        }),
      });
      const data = await resp.json();
      if (data.sucesso && data.alerta) {
        onAlertaDisparado(data.alerta);

        // Native HTML5 browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🚨 ALERTA: ${proposicaoSelecionada.codigo}`, {
            body: `Entrou na pauta de votação: ${proposicaoSelecionada.tituloCurto}`,
            icon: '/favicon.ico',
          });
        }
      }
    } catch (_err) {
      // Ignore
    } finally {
      setDisparando(false);
    }
  };

  // Solicitar permissão de notificação no navegador
  const ativarNotificacoesBrowser = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Seu navegador não suporta notificações nativas.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifStatus('Notificações ativadas com sucesso!');
        new Notification('Radar Legislativo', {
          body: 'Notificações de pautas e votações em tempo real ativadas!',
        });
      } else {
        setNotifStatus('Permissão de notificação negada pelo usuário.');
      }
    } catch (_err) {
      setNotifStatus('Erro ao solicitar permissão.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dissemination Control Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Robô Divulgador de Votações Multicanal
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dispare alertas automáticos para WhatsApp, Telegram, redes sociais ou webhooks externos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={proposicaoSelecionada.id}
              onChange={(e) => {
                const found = proposicoes.find((p) => p.id === e.target.value);
                if (found) onSelecionarProposicao(found);
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {proposicoes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.tituloCurto.substring(0, 35)}...
                </option>
              ))}
            </select>

            <button
              onClick={dispararAlertaGeral}
              disabled={disparando}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
            >
              <Send className={`w-3.5 h-3.5 ${disparando ? 'animate-bounce' : ''}`} />
              <span>{disparando ? 'Disparando...' : 'Disparar Alerta Geral'}</span>
            </button>
          </div>
        </div>

        {/* Browser Push Permission Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800">
                Notificações em Tempo Real no Navegador (Web Push)
              </span>
              <p className="text-slate-500 text-[11px]">
                Receba um aviso pop-up assim que o robô detectar início de votação nominal no Plenário.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifStatus && (
              <span className="text-[11px] text-emerald-700 font-medium">
                {notifStatus}
              </span>
            )}
            <button
              onClick={ativarNotificacoesBrowser}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors whitespace-nowrap"
            >
              Ativar Notificações
            </button>
          </div>
        </div>

        {/* Channel Selector Tabs (Segmented control) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Formato de Mensagem Pronto para Envio:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(
                [
                  { id: 'WHATSAPP', label: 'WhatsApp' },
                  { id: 'TELEGRAM', label: 'Telegram' },
                  { id: 'TWITTER', label: 'Twitter / X' },
                  { id: 'WEBHOOK', label: 'Webhook (JSON)' },
                ] as const
              ).map((canal) => (
                <button
                  key={canal.id}
                  onClick={() => setCanalAtivo(canal.id as CanalDivulgacao)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    canalAtivo === canal.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {canal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formatted Message Preview Box */}
          <div className="relative">
            <pre className="w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-72">
              {canalAtivo === 'WEBHOOK'
                ? JSON.stringify(
                    {
                      evento: 'VOTACAO_IMINENTE',
                      origem: 'ROBO_RADAR_LEGISLATIVO',
                      timestamp: new Date().toISOString(),
                      proposicao: {
                        codigo: proposicaoSelecionada.codigo,
                        casa: proposicaoSelecionada.casa,
                        titulo: proposicaoSelecionada.tituloCurto,
                        resumoCidadao: proposicaoSelecionada.resumoCidadao,
                        status: proposicaoSelecionada.statusTramitacao,
                        quorum: proposicaoSelecionada.quorum,
                        probabilidadeAprovacao: proposicaoSelecionada.probabilidadeAprovacao,
                        link: proposicaoSelecionada.linkOficial,
                      },
                    },
                    null,
                    2
                  )
                : textoGerado}
            </pre>

            <button
              onClick={copiarTexto}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors shadow-xs"
            >
              {copiado ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Social Card Visual Component */}
      <CardVisualSocial proposicao={proposicaoSelecionada} />

      {/* Alert Dispatch History / Recent Robot Broadcasts */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <h4 className="text-sm font-bold text-slate-900">
              Histórico de Disparos Realizados pelo Robô ({alertas.length})
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Logs de transmissão ativa
          </span>
        </div>

        <div className="space-y-3">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900">{alerta.proposicaoCodigo}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-700 font-semibold">{alerta.status}</span>
                </div>
                <span className="text-slate-500 font-mono">{alerta.dataHora}</span>
              </div>

              <div className="font-semibold text-slate-800">{alerta.titulo}</div>
              <p className="text-slate-600 leading-relaxed">{alerta.mensagem}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Canais:</span>
                  <div className="flex gap-1">
                    {alerta.canais.map((c) => (
                      <span
                        key={c}
                        className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {alerta.destinatariosSimulados && (
                  <span className="font-mono text-emerald-700 font-medium">
                    ~{alerta.destinatariosSimulados.toLocaleString('pt-BR')} destinatários alcançados
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
