import React, { useState, useRef } from 'react';
import {
  Activity,
  Bell,
  Radio,
  Landmark,
  SlidersHorizontal,
  Share2,
  ShieldCheck,
  Volume2,
  VolumeX,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { AlertaDivulgacao } from '../types/legislative';

export type TabType = 'radar' | 'impacto' | 'divulgacao' | 'diagnostico' | 'configuracoes';

interface HeaderProps {
  tabAtiva: TabType;
  setTabAtiva: (tab: TabType) => void;
  roboAtivo: boolean;
  totalAlertas: number;
  alertas: AlertaDivulgacao[];
  emVarredura: boolean;
  onExecutarVarredura: () => void;
  ultimaVarredura: string;
  somAtivado: boolean;
  onToggleSom: () => void;
  onDispararAlertaTeste: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabAtiva,
  setTabAtiva,
  roboAtivo,
  totalAlertas,
  alertas,
  emVarredura,
  onExecutarVarredura,
  ultimaVarredura,
  somAtivado,
  onToggleSom,
  onDispararAlertaTeste,
}) => {
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  const rolarNav = (direcao: 'esquerda' | 'direita') => {
    if (!navRef.current) return;
    const delta = direcao === 'esquerda' ? -220 : 220;
    navRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand & Identification */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
              <Landmark className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Radar Legislativo
                </h1>
                <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                  Robô de Votações
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Congresso Nacional · Varredura da Câmara & Senado em Tempo Real
              </p>
            </div>
          </div>

          {/* Scanner Controls, Audio Toggle & Robot Status */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex flex-col items-end text-xs mr-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    roboAtivo ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-medium">
                  {roboAtivo ? 'Robô de Varredura Ativo' : 'Robô em Pausa'}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                Última checagem: {ultimaVarredura}
              </span>
            </div>

            {/* Quick Test Alert Button */}
            <button
              onClick={onDispararAlertaTeste}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
              title="Disparar som e pop-up de teste imediatamente"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Testar Alerta</span>
            </button>

            {/* Audio chime toggle */}
            <button
              onClick={onToggleSom}
              aria-label={somAtivado ? 'Desativar som de alertas' : 'Ativar som de alertas'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={somAtivado ? 'Som de alerta ligado' : 'Som de alerta desativado'}
            >
              {somAtivado ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Scanner Button */}
            <button
              onClick={onExecutarVarredura}
              disabled={emVarredura}
              aria-label="Escanear pauta agora"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Radio
                className={`w-3.5 h-3.5 text-emerald-400 ${
                  emVarredura ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {emVarredura ? 'Varrendo...' : 'Escanear'}
              </span>
            </button>

            {/* Alerts Dropdown Drawer */}
            <div className="relative">
              <button
                onClick={() => setDropdownAberto(!dropdownAberto)}
                aria-label={`Visualizar alertas (${totalAlertas} disparados)`}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {totalAlertas > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono animate-pulse">
                    {totalAlertas}
                  </span>
                )}
              </button>

              {dropdownAberto && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-900 py-3 px-4 z-50 animate-fade-in text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Bell className="w-4 h-4 text-emerald-700" />
                      <span>Alertas de Votação ({alertas.length})</span>
                    </div>
                    <button
                      onClick={() => setDropdownAberto(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {alertas.slice(0, 4).map((alerta) => (
                      <div
                        key={alerta.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                          <span className="font-bold text-slate-900">{alerta.proposicaoCodigo}</span>
                          <span>{alerta.dataHora}</span>
                        </div>
                        <div className="font-medium text-slate-800 line-clamp-2">
                          {alerta.titulo}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setDropdownAberto(false);
                        onDispararAlertaTeste();
                      }}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" /> Testar Alerta Agora
                    </button>
                    <button
                      onClick={() => {
                        setDropdownAberto(false);
                        setTabAtiva('divulgacao');
                      }}
                      className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      Ver Todos & Compartilhar →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation (Barra de rolagem horizontal customizada para navegação entre módulos) */}
        <div
          ref={navRef}
          role="navigation"
          aria-label="Módulos do sistema"
          className="nav-scroll-bar flex items-center gap-1.5 overflow-x-auto pt-2 pb-2.5 border-t border-slate-800/80 -mx-2 px-2 scroll-smooth"
        >
          <button
            type="button"
            onClick={() => rolarNav('esquerda')}
            aria-label="Rolar módulos para a esquerda"
            className="p-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-700/60"
            title="Rolar módulos para esquerda"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setTabAtiva('radar')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              tabAtiva === 'radar'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radar de Votações & Pauta</span>
          </button>

          <button
            onClick={() => setTabAtiva('impacto')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              tabAtiva === 'impacto'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Análise de Impacto Parlamentar</span>
          </button>

          <button
            onClick={() => setTabAtiva('divulgacao')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              tabAtiva === 'divulgacao'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Robô Divulgador & Alertas</span>
            {totalAlertas > 0 && (
              <span className="ml-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                {totalAlertas}
              </span>
            )}
          </button>

          <button
            onClick={() => setTabAtiva('diagnostico')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              tabAtiva === 'diagnostico'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Como Garantir que Funciona?</span>
          </button>

          <button
            onClick={() => setTabAtiva('configuracoes')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              tabAtiva === 'configuracoes'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configuração do Robô</span>
          </button>

          <button
            type="button"
            onClick={() => rolarNav('direita')}
            aria-label="Rolar módulos para a direita"
            className="p-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-700/60"
            title="Rolar módulos para direita"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
