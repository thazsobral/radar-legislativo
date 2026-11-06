import React, { useState, useMemo, useEffect } from 'react';
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
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Trash2,
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

  // User Gemini API Key state with automatic localStorage recognition
  const [chaveUsuario, setChaveUsuario] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('RADAR_LEGISLATIVO_GEMINI_API_KEY') ||
        localStorage.getItem('gemini_api_key') ||
        ''
      );
    }
    return '';
  });
  const [chaveInput, setChaveInput] = useState<string>(chaveUsuario);
  const [mostrarChaveTexto, setMostrarChaveTexto] = useState<boolean>(false);
  const [painelChaveAberto, setPainelChaveAberto] = useState<boolean>(false);
  const [msgChave, setMsgChave] = useState<string>('');

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

  // Salvar chave no localStorage
  const salvarChaveNoStorage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const chaveLimpa = chaveInput.trim();
    if (chaveLimpa) {
      localStorage.setItem('RADAR_LEGISLATIVO_GEMINI_API_KEY', chaveLimpa);
      localStorage.setItem('gemini_api_key', chaveLimpa);
      setChaveUsuario(chaveLimpa);
      setMsgChave('Chave gravada com sucesso no localStorage do seu navegador!');
    } else {
      removerChaveDoStorage();
      return;
    }
    setTimeout(() => setMsgChave(''), 3500);
  };

  const removerChaveDoStorage = () => {
    localStorage.removeItem('RADAR_LEGISLATIVO_GEMINI_API_KEY');
    localStorage.removeItem('gemini_api_key');
    setChaveUsuario('');
    setChaveInput('');
    setMsgChave('Chave removida do armazenamento local.');
    setTimeout(() => setMsgChave(''), 3000);
  };

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

  // Handler to call Gemini AI analysis endpoint on the server with user's key if provided
  const executarAnaliseIa = async () => {
    setCarregandoIa(true);
    setErroIa(null);
    try {
      const resultado = await obterAnaliseLegislativa(proposicaoSelecionada, chaveUsuario);
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
        <div
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
          title="Dimensão 1: Impacto Fiscal e Orçamentário da matéria. Avalia a repercussão nas contas públicas, projeção de custos ou arrecadação e riscos de responsabilidade fiscal."
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Impacto Orçamentário & Fiscal</h4>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-medium cursor-help ${
                proposicaoSelecionada.impacto.fiscal.nivelRisco === 'ALTO' || proposicaoSelecionada.impacto.fiscal.nivelRisco === 'CRITICO'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
              title={`Nível de risco fiscal atribuído: ${proposicaoSelecionada.impacto.fiscal.nivelRisco}. Mede a probabilidade de pressão sobre as metas fiscais da União.`}
            >
              Risco {proposicaoSelecionada.impacto.fiscal.nivelRisco}
            </span>
          </div>

          <div
            className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center cursor-help"
            title={`Valor projetado de impacto financeiro: ${formatarValorImpacto(proposicaoSelecionada.impacto.fiscal.valorEstimadoBi)}. Classificado como impacto do tipo ${proposicaoSelecionada.impacto.fiscal.tipo}.`}
          >
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
        <div
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
          title="Dimensão 2: Impacto Social e Direitos Fundamentais. Diagnóstico de como a aprovação altera direitos trabalhistas, seguridade, serviços essenciais e transparência institucional."
        >
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
        <div
          className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
          title="Dimensão 3: Setores Econômicos Regulados e Sustentabilidade. Mapeamento das cadeias produtivas e obrigações de conformidade ambiental trazidas pela legislação."
        >
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
                  className="text-xs bg-slate-100 text-slate-800 font-medium px-2.5 py-1 rounded cursor-help"
                  title={`Setor produtivo impactado por novas regras: ${setor}`}
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
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border font-mono cursor-help ${
                atingeQuorum
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
              title={
                atingeQuorum
                  ? `Situação: A matéria atinge e supera o quórum mínimo necessário por uma margem de +${margemQuorum} votos favoráveis.`
                  : `Situação: Projeção insuficiente. Faltam ${Math.abs(margemQuorum)} votos para atingir o quórum constitucional de aprovação.`
              }
            >
              {atingeQuorum
                ? `Quórum Atingido (+${margemQuorum} votos)`
                : `Abaixo do Quórum (${margemQuorum} votos)`}
            </span>
          </div>
        </div>

        {/* Voting Gauge Visual */}
        <div
          className="space-y-2 cursor-help"
          title={`Simulação de Placar: ${placarSimulado.votosFavoraveis} votos favoráveis frente ao quórum de ${proposicaoSelecionada.quorum.minimoVotos} votos (${proposicaoSelecionada.quorum.tipo}) sobre ${proposicaoSelecionada.quorum.totalMembros} membros da Casa.`}
        >
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
              title={`Barra de votos favoráveis: ${placarSimulado.votosFavoraveis} votos`}
            />

            {/* Quorum cutoff indicator line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-slate-950 z-10 shadow"
              style={{
                left: `${(proposicaoSelecionada.quorum.minimoVotos / proposicaoSelecionada.quorum.totalMembros) * 100}%`,
              }}
              title={`Linha de Quórum Obrigatório: ${proposicaoSelecionada.quorum.minimoVotos} votos (${((proposicaoSelecionada.quorum.minimoVotos / proposicaoSelecionada.quorum.totalMembros) * 100).toFixed(0)}% do colegiado)`}
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
          <div
            className="space-y-2"
            title="Ajuste a estimativa percentual de apoio dos partidos de centro (Centrão) ao relatório governista para recalcular o placar."
          >
            <div className="flex justify-between text-xs">
              <label htmlFor="centrao-slider" className="font-medium text-slate-800 cursor-pointer">
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
              title="Mova o controle deslizante para simular entre 0% (rejeição total) e 100% (apoio unânime) da bancada do Centrão."
            />
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>0% (Resistência total)</span>
              <span>100% (Apoio unânime)</span>
            </div>
          </div>

          <div
            className="space-y-2"
            title="Ajuste a taxa de dissidência ou liberação de voto na oposição para simular apoios adicionais ao texto."
          >
            <div className="flex justify-between text-xs">
              <label htmlFor="oposicao-slider" className="font-medium text-slate-800 cursor-pointer">
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
              title="Mova o controle deslizante para simular votos favoráveis vindos de parlamentares de oposição."
            />
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>0% (Fechamento de questão contra)</span>
              <span>50% (Votação liberada)</span>
            </div>
          </div>
        </div>

        {/* Breakdown of Seats by Alliance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div
            className="p-3 bg-white rounded-lg border border-slate-200 cursor-help"
            title="Total de parlamentares integrantes dos partidos da base governista oficial na Casa."
          >
            <div className="text-slate-500">Base Governista</div>
            <div className="text-lg font-mono font-bold text-emerald-700">
              {proposicaoSelecionada.bancadas.governista} votos
            </div>
            <div className="text-[11px] text-slate-400">Fidelidade alta</div>
          </div>

          <div
            className="p-3 bg-white rounded-lg border border-slate-200 cursor-help"
            title={`Bancada do Centrão (${proposicaoSelecionada.bancadas.centrao} parlamentares). Com adesão simulada de ${adesaoCentrao}%, projeta-se ${Math.round((proposicaoSelecionada.bancadas.centrao * adesaoCentrao) / 100)} votos favoráveis.`}
          >
            <div className="text-slate-500">Centrão (Em negociação)</div>
            <div className="text-lg font-mono font-bold text-amber-700">
              {proposicaoSelecionada.bancadas.centrao} parlamentares
            </div>
            <div className="text-[11px] text-slate-400">
              {Math.round((proposicaoSelecionada.bancadas.centrao * adesaoCentrao) / 100)} projetados SIM
            </div>
          </div>

          <div
            className="p-3 bg-white rounded-lg border border-slate-200 cursor-help"
            title={`Bancada de Oposição (${proposicaoSelecionada.bancadas.oposicao} parlamentares). Com dissidência de ${adesaoOposicao}%, projeta-se ${Math.round((proposicaoSelecionada.bancadas.oposicao * adesaoOposicao) / 100)} votos favoráveis.`}
          >
            <div className="text-slate-500">Oposição</div>
            <div className="text-lg font-mono font-bold text-slate-800">
              {proposicaoSelecionada.bancadas.oposicao} parlamentares
            </div>
            <div className="text-[11px] text-slate-400">
              {Math.round((proposicaoSelecionada.bancadas.oposicao * adesaoOposicao) / 100)} projetados SIM
            </div>
          </div>

          <div
            className="p-3 bg-white rounded-lg border border-slate-200 cursor-help"
            title="Probabilidade matemática de aprovação estimada a partir do quórum regimental, da margem de votos projetada e do regime de urgência da proposta."
          >
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
              type="button"
              onClick={() => setPainelChaveAberto(!painelChaveAberto)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                chaveUsuario
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Configurar chave pessoal de IA (armazenada com segurança no seu navegador via localStorage para evitar que expire ou tenha que reconfigurar)."
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
              <span>{chaveUsuario ? 'Chave IA Ativa' : 'Configurar Chave IA'}</span>
            </button>

            <button
              onClick={executarAnaliseIa}
              disabled={carregandoIa}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              title="Dispara a geração do parecer de inteligência legislativa no servidor utilizando o modelo Google Gemini 3.8 Flash."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoIa ? 'animate-spin' : ''}`} />
              <span>{carregandoIa ? 'Processando com Gemini...' : 'Gerar Análise IA Agora'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible User Gemini API Key Form with localStorage Persistence */}
        {painelChaveAberto && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-slate-900">
                  Configuração de Chave de IA (Armazenamento Local)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                {chaveUsuario ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Chave salva no localStorage
                  </span>
                ) : (
                  'Utilizando chave padrão do servidor'
                )}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você pode utilizar sua própria chave de API do Google Gemini. Ela é salva com segurança no{' '}
              <strong>localStorage</strong> do seu navegador e reconhecida automaticamente toda vez que recarregar a página.
            </p>

            <form onSubmit={salvarChaveNoStorage} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={mostrarChaveTexto ? 'text' : 'password'}
                    placeholder="Cole sua chave Gemini (ex: AQ.Ab8... ou AIzaSy...)"
                    value={chaveInput}
                    onChange={(e) => setChaveInput(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                    title="Insira sua chave de API pessoal do Google Gemini"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarChaveTexto(!mostrarChaveTexto)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={mostrarChaveTexto ? 'Ocultar caracteres da chave' : 'Exibir chave digitada'}
                  >
                    {mostrarChaveTexto ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs"
                  title="Salva a chave no localStorage do seu navegador"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Gravar Chave</span>
                </button>

                {chaveUsuario && (
                  <button
                    type="button"
                    onClick={removerChaveDoStorage}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer transition-colors"
                    title="Remove a chave gravada no localStorage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </form>

            {msgChave && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{msgChave}</span>
              </div>
            )}
          </div>
        )}

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
