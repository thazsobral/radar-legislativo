import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Share2,
  Building2,
  Leaf,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { ProposicaoLegislativa } from '../types/legislative';
import {
  simularPlacarVotacao,
  estimarProbabilidadeAprovacao,
  formatarValorImpacto,
} from '../utils/parliamentaryMath';
import { obterAnaliseLegislativa } from '../utils/aiAnalysisClient';

interface DashboardImpactoProps {
  proposicoes: ProposicaoLegislativa[];
  proposicaoSelecionada: ProposicaoLegislativa;
  onSelecionarProposicao: (proposicao: ProposicaoLegislativa) => void;
  onIrParaDivulgacao: (proposicao: ProposicaoLegislativa) => void;
}

export const DashboardImpacto: React.FC<DashboardImpactoProps> = ({
  proposicoes,
  proposicaoSelecionada,
  onSelecionarProposicao,
  onIrParaDivulgacao,
}) => {
  // Simulator state: interactive alliance sliders
  const [adesaoCentrao, setAdesaoCentrao] = useState<number>(70);
  const [adesaoOposicao, setAdesaoOposicao] = useState<number>(5);

  // AI Analysis state
  const [analiseIa, setAnaliseIa] = useState<{
    resumoCidadao?: string;
    impactoFiscalAnalise?: string;
    quemGanha?: string[];
    quemPerde?: string[];
    cenarioVotacao?: string;
    recomendacaoEstrategica?: string;
  } | null>(null);
  const [fonteAnalise, setFonteAnalise] = useState<string | null>(null);
  const [carregandoIa, setCarregandoIa] = useState(false);
  const [erroIa, setErroIa] = useState<string | null>(null);

  // Recalculate voting simulator dynamically
  const placarSimulado = useMemo(() => {
    return simularPlacarVotacao({
      totalMembros: proposicaoSelecionada.quorum.totalMembros,
      governista: proposicaoSelecionada.bancadas.governista,
      centrao: proposicaoSelecionada.bancadas.centrao,
      oposicao: proposicaoSelecionada.bancadas.oposicao,
      indecisos: proposicaoSelecionada.bancadas.indecisos,
      adesaoCentraoAoGovernoPercentual: adesaoCentrao,
      adesaoOposicaoAoGovernoPercentual: adesaoOposicao,
    });
  }, [proposicaoSelecionada, adesaoCentrao, adesaoOposicao]);

  const probabilidadeSimulada = useMemo(() => {
    return estimarProbabilidadeAprovacao(
      placarSimulado.votosFavoraveis,
      proposicaoSelecionada.quorum.minimoVotos,
      proposicaoSelecionada.regimeUrgencia
    );
  }, [placarSimulado, proposicaoSelecionada]);

  const atingeQuorum = placarSimulado.votosFavoraveis >= proposicaoSelecionada.quorum.minimoVotos;
  const margemQuorum = placarSimulado.votosFavoraveis - proposicaoSelecionada.quorum.minimoVotos;

  // Handler to call Gemini AI analysis endpoint on the server
  const executarAnaliseIa = async () => {
    setCarregandoIa(true);
    setErroIa(null);
    try {
      const resultado = await obterAnaliseLegislativa(proposicaoSelecionada);
      if (resultado.sucesso && resultado.analiseIa) {
        setAnaliseIa(resultado.analiseIa);
        setFonteAnalise(resultado.fonte);
        if (resultado.aviso) {
          setErroIa(resultado.aviso);
        }
      } else {
        setAnaliseIa(resultado.analiseIa || null);
        setFonteAnalise(resultado.fonte);
        setErroIa(resultado.erro || 'Não foi possível gerar análise com IA no momento.');
      }
    } catch (err: any) {
      setErroIa(err?.message || 'Erro ao processar análise legislativa.');
    } finally {
      setCarregandoIa(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector & Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs text-slate-500 font-medium">
              Painel de Análise de Impacto Parlamentar
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-xl font-bold font-mono text-slate-950">
                {proposicaoSelecionada.codigo}
              </h2>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {proposicaoSelecionada.casa === 'CAMARA'
                  ? 'Câmara dos Deputados'
                  : proposicaoSelecionada.casa === 'SENADO'
                  ? 'Senado Federal'
                  : 'Congresso Nacional'}
              </span>
              <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {proposicaoSelecionada.statusTramitacao}
              </span>
            </div>
          </div>

          {/* Bill Dropdown Switcher */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-prop" className="text-xs text-slate-500 whitespace-nowrap">
              Selecionar Matéria:
            </label>
            <select
              id="select-prop"
              value={proposicaoSelecionada.id}
              onChange={(e) => {
                const found = proposicoes.find((p) => p.id === e.target.value);
                if (found) {
                  onSelecionarProposicao(found);
                  setAnaliseIa(null);
                }
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {proposicoes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.tituloCurto.substring(0, 40)}...
                </option>
              ))}
            </select>

            <button
              onClick={() => onIrParaDivulgacao(proposicaoSelecionada)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Divulgar</span>
            </button>
          </div>
        </div>

        {/* Ementa and Official Links */}
        <div className="pt-4 space-y-2">
          <h3 className="text-base font-bold text-slate-900">
            {proposicaoSelecionada.tituloCurto}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">Ementa Oficial:</span> {proposicaoSelecionada.ementa}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
            <span>
              Autor: <strong className="text-slate-700">{proposicaoSelecionada.autor}</strong>
            </span>
            <span>·</span>
            <span>
              Relator: <strong className="text-slate-700">{proposicaoSelecionada.relator.nome} ({proposicaoSelecionada.relator.partido}/{proposicaoSelecionada.relator.uf})</strong>
            </span>
            <span>·</span>
            <a
              href={proposicaoSelecionada.linkOficial}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Página de Tramitação Oficial <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid of Key Analytical Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dimension 1: Fiscal & Budget Impact */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Impacto Orçamentário & Fiscal</h4>
            </div>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-medium ${
              proposicaoSelecionada.impacto.fiscal.nivelRisco === 'ALTO' || proposicaoSelecionada.impacto.fiscal.nivelRisco === 'CRITICO'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              Risco {proposicaoSelecionada.impacto.fiscal.nivelRisco}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
            <div className="text-xs text-slate-500 font-medium">Valor Projetado</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {formatarValorImpacto(proposicaoSelecionada.impacto.fiscal.valorEstimadoBi)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Classificação: <strong>{proposicaoSelecionada.impacto.fiscal.tipo}</strong>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {proposicaoSelecionada.impacto.fiscal.descricao}
          </p>
        </div>

        {/* Dimension 2: Social Impact */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Impacto Social & Direitos</h4>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-3.5 rounded-lg border border-blue-100/60">
            {proposicaoSelecionada.impacto.social}
          </p>

          <div className="space-y-2 pt-1 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Governança Institucional:
            </div>
            <div className="text-slate-600 leading-relaxed">
              {proposicaoSelecionada.impacto.governanca}
            </div>
          </div>
        </div>

        {/* Dimension 3: Regulatory & Industry Sectors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Setores Regulados & Mercado</h4>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-500 font-medium">Setores com Maior Alteração:</div>
            <div className="flex flex-wrap gap-1.5">
              {proposicaoSelecionada.impacto.regulatorio.map((setor) => (
                <span
                  key={setor}
                  className="text-xs bg-slate-100 text-slate-800 font-medium px-2.5 py-1 rounded"
                >
                  {setor}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Sustentabilidade & Clima:
            </div>
            <div className="text-slate-600 leading-relaxed">
              {proposicaoSelecionada.impacto.ambiental}
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Section: Interactive Parliamentary Quorum & Alliance Calculator */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">
                Simulador Dinâmico de Placar & Quórum Constitucional
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajuste as tendências de bancada para recalcular a projeção de aprovação e margem contra o quórum mínimo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border font-mono ${
              atingeQuorum
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {atingeQuorum
                ? `Quórum Atingido (+${margemQuorum} votos)`
                : `Abaixo do Quórum (${margemQuorum} votos)`}
            </span>
          </div>
        </div>

        {/* Voting Gauge Visual */}
        <div className="space-y-2">
          <div className="flex justify-between items-end text-xs">
            <div>
              <span className="text-slate-500 font-medium">Votos Favoráveis Projetados: </span>
              <strong className="text-base font-mono text-slate-950 font-bold">
                {placarSimulado.votosFavoraveis}
              </strong>
              <span className="text-slate-400 font-mono"> / {proposicaoSelecionada.quorum.totalMembros} membros</span>
            </div>
            <div>
              <span className="text-slate-500">Quórum Mínimo Exigido: </span>
              <strong className="font-mono text-slate-800 font-semibold">
                {proposicaoSelecionada.quorum.minimoVotos} votos ({proposicaoSelecionada.quorum.tipo})
              </strong>
            </div>
          </div>

          {/* Progress bar with quorum target line */}
          <div className="relative w-full h-5 bg-slate-200 rounded-lg overflow-hidden">
            {/* Projected votes */}
            <div
              className={`h-full transition-all duration-300 ${
                atingeQuorum ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{
                width: `${Math.min(100, (placarSimulado.votosFavoraveis / proposicaoSelecionada.quorum.totalMembros) * 100)}%`,
              }}
            />

            {/* Quorum cutoff indicator line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-slate-950 z-10 shadow"
              style={{
                left: `${(proposicaoSelecionada.quorum.minimoVotos / proposicaoSelecionada.quorum.totalMembros) * 100}%`,
              }}
              title={`Linha de Quórum: ${proposicaoSelecionada.quorum.minimoVotos} votos`}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0 votos</span>
            <span className="font-bold text-slate-900">
              Quórum Obrigatório: {proposicaoSelecionada.quorum.minimoVotos} ({((proposicaoSelecionada.quorum.minimoVotos / proposicaoSelecionada.quorum.totalMembros) * 100).toFixed(0)}%)
            </span>
            <span>{proposicaoSelecionada.quorum.totalMembros} total</span>
          </div>
        </div>

        {/* Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200/80">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="centrao-slider" className="font-medium text-slate-800">
                Adesão da Bancada do Centrão ao Texto:
              </label>
              <span className="font-mono font-bold text-emerald-700">{adesaoCentrao}%</span>
            </div>
            <input
              id="centrao-slider"
              type="range"
              min="0"
              max="100"
              value={adesaoCentrao}
              onChange={(e) => setAdesaoCentrao(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>0% (Resistência total)</span>
              <span>100% (Apoio unânime)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="oposicao-slider" className="font-medium text-slate-800">
                Adesão / Dissidência na Bancada de Oposição:
              </label>
              <span className="font-mono font-bold text-slate-700">{adesaoOposicao}%</span>
            </div>
            <input
              id="oposicao-slider"
              type="range"
              min="0"
              max="50"
              value={adesaoOposicao}
              onChange={(e) => setAdesaoOposicao(Number(e.target.value))}
              className="w-full accent-slate-600 cursor-pointer"
            />
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>0% (Fechamento de questão contra)</span>
              <span>50% (Votação liberada)</span>
            </div>
          </div>
        </div>

        {/* Breakdown of Seats by Alliance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-slate-500">Base Governista</div>
            <div className="text-lg font-mono font-bold text-emerald-700">
              {proposicaoSelecionada.bancadas.governista} votos
            </div>
            <div className="text-[11px] text-slate-400">Fidelidade alta</div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-slate-500">Centrão (Em negociação)</div>
            <div className="text-lg font-mono font-bold text-amber-700">
              {proposicaoSelecionada.bancadas.centrao} parlamentares
            </div>
            <div className="text-[11px] text-slate-400">
              {Math.round((proposicaoSelecionada.bancadas.centrao * adesaoCentrao) / 100)} projetados SIM
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-slate-500">Oposição</div>
            <div className="text-lg font-mono font-bold text-slate-800">
              {proposicaoSelecionada.bancadas.oposicao} parlamentares
            </div>
            <div className="text-[11px] text-slate-400">
              {Math.round((proposicaoSelecionada.bancadas.oposicao * adesaoOposicao) / 100)} projetados SIM
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-slate-500">Probabilidade de Aprovação</div>
            <div className="text-lg font-mono font-bold text-slate-900">
              {probabilidadeSimulada}%
            </div>
            <div className="text-[11px] text-slate-400">Com margem e urgência</div>
          </div>
        </div>
      </div>

      {/* AI Deep Analysis Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Parecer Inteligente & Explicador Cidadão com IA
                </h3>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Google Gemini 3.8 Flash (Servidor)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Desmistificação de termos técnicos, análise de riscos políticos e mapeamento de interesses processados no servidor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={executarAnaliseIa}
              disabled={carregandoIa}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoIa ? 'animate-spin' : ''}`} />
              <span>{carregandoIa ? 'Processando com Gemini...' : 'Gerar Análise IA Agora'}</span>
            </button>
          </div>
        </div>

        {erroIa && (
          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-0.5">
              <span className="font-semibold">{erroIa}</span>
            </div>
          </div>
        )}

        {analiseIa ? (
          <div className="space-y-4 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Resultado do Parecer:</span>
              {fonteAnalise === 'GEMINI_AI_SERVER' ? (
                <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Processado via Google Gemini 3.8 Flash (Servidor)
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Parecer Heurístico Legislativo Integrado
                </span>
              )}
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-lg border border-emerald-100 space-y-1">
              <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Resumo Cidadão em Linguagem Acessível:
              </div>
              <p className="text-emerald-950 leading-relaxed text-sm">
                {analiseIa.resumoCidadao}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Quem Ganha com a Aprovação:
                </div>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                  {analiseIa.quemGanha?.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Quem Perde ou Enfrenta Resistência:
                </div>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                  {analiseIa.quemPerde?.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="font-semibold text-slate-900">
                Cenário Político & Recomendação Estratégica:
              </div>
              <p className="text-slate-700 leading-relaxed">
                {analiseIa.cenarioVotacao}
              </p>
              {analiseIa.recomendacaoEstrategica && (
                <div className="text-slate-600 italic pt-1 border-t border-slate-200">
                  {analiseIa.recomendacaoEstrategica}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p>
              Clique em <strong>"Gerar Análise IA Agora"</strong> para obter a síntese cidadã e a decomposição de ganhos/perdas por bancada.
            </p>
          </div>
        )}
      </div>

      {/* Pros & Cons Comparison + Recent Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Pontos Positivos & Justificativas do Autor
          </h4>
          <ul className="space-y-2 text-xs text-slate-700">
            {proposicaoSelecionada.pontosPositivos.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Pontos Críticos & Alertas de Atenção
          </h4>
          <ul className="space-y-2 text-xs text-slate-700">
            {proposicaoSelecionada.pontosCriticos.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
