import React, { useEffect } from 'react';
import { Bell, Flame, X, Share2, ChevronRight, Volume2 } from 'lucide-react';
import { AlertaDivulgacao, ProposicaoLegislativa } from '../types/legislative';
import { tocarAlertaSonoro } from '../utils/alertAudio';

interface ModalAlertaAtivoProps {
  alerta: AlertaDivulgacao;
  proposicao?: ProposicaoLegislativa;
  onFechar: () => void;
  onVerImpacto: (proposicao: ProposicaoLegislativa) => void;
  somAtivado: boolean;
}

export const ModalAlertaAtivo: React.FC<ModalAlertaAtivoProps> = ({
  alerta,
  proposicao,
  onFechar,
  onVerImpacto,
  somAtivado,
}) => {
  // Toca o som de alerta ao montar se o som estiver ativado
  useEffect(() => {
    if (somAtivado) {
      tocarAlertaSonoro();
    }
  }, [somAtivado]);

  const textoWhatsApp = encodeURIComponent(
    `*🚨 ALERTA LEGISLATIVO: ${alerta.proposicaoCodigo}*\n${alerta.titulo}\n\n${alerta.mensagem}\n\nAcompanhe no Radar Legislativo: https://radarlegislativo.gov.br`
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alerta em Tempo Real"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 overflow-hidden transform transition-all animate-slide-down">
        {/* Header do Alerta */}
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase">
              <Bell className="w-4 h-4 text-emerald-300" />
              <span>Alerta de Votação em Tempo Real</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {somAtivado && (
              <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" /> Som ativo
              </span>
            )}
            <button
              onClick={onFechar}
              aria-label="Fechar alerta"
              className="p-1 rounded-lg hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Alerta */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded">
              {alerta.proposicaoCodigo}
            </span>
            <span>·</span>
            <span>{alerta.dataHora}</span>
            <span>·</span>
            <span className="text-emerald-700 font-semibold">{alerta.status}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {alerta.titulo}
          </h3>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
            {alerta.mensagem}
          </div>

          {proposicao && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <span className="text-slate-500 text-[11px]">Quórum Constitucional:</span>
                <div className="font-bold text-emerald-950 font-mono">
                  {proposicao.quorum.minimoVotos} votos ({proposicao.quorum.tipo})
                </div>
              </div>
              <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <span className="text-slate-500 text-[11px]">Probabilidade de Aprovação:</span>
                <div className="font-bold text-emerald-950 font-mono">
                  {proposicao.probabilidadeAprovacao}% estimada
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações Imediatas */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <a
            href={`https://wa.me/?text=${textoWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar no WhatsApp</span>
          </a>

          <div className="flex items-center gap-2">
            {proposicao && (
              <button
                onClick={() => {
                  onFechar();
                  onVerImpacto(proposicao);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
              >
                <span>Ver Impacto</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onFechar}
              className="px-3 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Dispensar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
