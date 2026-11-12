import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Flame,
  Scale,
  Calendar,
  DollarSign,
  Share2,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  FileText,
  Sparkles,
  Radio,
} from 'lucide-react';
import { ProposicaoLegislativa, CasaLegislativa } from '../types/legislative';
import { formatarValorImpacto } from '../utils/parliamentaryMath';

interface RadarVotacoesProps {
  proposicoes: ProposicaoLegislativa[];
  onSelecionarParaImpacto: (proposicao: ProposicaoLegislativa) => void;
  onSelecionarParaDivulgacao: (proposicao: ProposicaoLegislativa) => void;
  onExecutarVarredura: () => void;
  emVarredura: boolean;
  onDispararAlertaTeste: () => void;
  onIrParaDiagnostico: () => void;
}

export const RadarVotacoes: React.FC<RadarVotacoesProps> = ({
  proposicoes,
  onSelecionarParaImpacto,
  onSelecionarParaDivulgacao,
  onExecutarVarredura,
  emVarredura,
  onDispararAlertaTeste,
  onIrParaDiagnostico,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroCasa, setFiltroCasa] = useState<'TODAS' | CasaLegislativa>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [apenasUrgentes, setApenasUrgentes] = useState(false);
  const [temaSelecionado, setTemaSelecionado] = useState<string>('TODOS');

  // Available unique tags
  const todosTemas = useMemo(() => {
    const set = new Set<string>();
    proposicoes.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [proposicoes]);

  // Filtered bills
  const proposicoesFiltradas = useMemo(() => {
    return proposicoes.filter((p) => {
      if (filtroCasa !== 'TODAS' && p.casa !== filtroCasa) return false;
      if (filtroTipo !== 'TODOS' && p.siglaTipo !== filtroTipo) return false;
      if (apenasUrgentes && !p.regimeUrgencia) return false;
      if (temaSelecionado !== 'TODOS' && !p.tags.includes(temaSelecionado)) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchCodigo = p.codigo.toLowerCase().includes(termo);
        const matchTitulo = p.tituloCurto.toLowerCase().includes(termo);
        const matchEmenta = p.ementa.toLowerCase().includes(termo);
        const matchRelator = p.relator.nome.toLowerCase().includes(termo);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(termo));
        if (!matchCodigo && !matchTitulo && !matchEmenta && !matchRelator && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [proposicoes, filtroCasa, filtroTipo, apenasUrgentes, temaSelecionado, busca]);

  // High-level summary metrics from live data
  const emPautaPlenario = proposicoes.filter(
    (p) =>
      p.dataPrevistaVotacao.toLowerCase().includes('hoje') ||
      p.tags.includes('Pauta do Plenário') ||
      p.casa === 'CONGRESSO'
  ).length;
  const pecsNaPauta = proposicoes.filter((p) => p.siglaTipo === 'PEC').length;
  const urgentesCount = proposicoes.filter((p) => p.regimeUrgencia).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm"
          title="Total de matérias legislativas reais carregadas das APIs oficiais da Câmara dos Deputados e do Senado Federal."
        >
          <div className="text-xs text-slate-500 font-medium">Matérias Oficiais Rastreadas</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {proposicoes.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Câmara, Senado e Congresso
          </div>
        </div>

        <div
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm"
          title="Proposições localizadas diretamente na pauta deliberativa do Plenário ou Sessões Conjuntas do Congresso Nacional."
        >
          <div className="text-xs text-slate-500 font-medium">Na Pauta do Plenário</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {emPautaPlenario}
          </div>
          <div className="text-xs text-emerald-700 mt-1">
            Ordem do dia e sessões ativas
          </div>
        </div>

        <div
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm"
          title="Propostas de Emenda à Constituição (PEC): exigem quórum qualificado de 3/5 dos parlamentares (308 na Câmara ou 49 no Senado) aprovados em 2 turnos."
        >
          <div className="text-xs text-slate-500 font-medium">PEC (3/5 de Quórum)</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {pecsNaPauta}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Exigem 308 dep. ou 49 sen.
          </div>
        </div>

        <div
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm"
          title="Proposições oficiais tramitando em Regime de Urgência ou Medidas Provisórias com rito acelerado para votação imediata."
        >
          <div className="text-xs text-slate-500 font-medium">Em Regime de Urgência</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {urgentesCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Prioridade de deliberação
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código (ex: PLP 68), relator, termo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick House Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['TODAS', 'CAMARA', 'SENADO', 'CONGRESSO'] as const).map((casa) => (
              <button
                key={casa}
                onClick={() => setFiltroCasa(casa)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filtroCasa === casa
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {casa === 'TODAS'
                  ? 'Todas as Casas'
                  : casa === 'CAMARA'
                  ? 'Câmara'
                  : casa === 'SENADO'
                  ? 'Senado'
                  : 'Congresso'}
              </button>
            ))}
          </div>

          {/* Urgency Toggle */}
          <button
            onClick={() => setApenasUrgentes(!apenasUrgentes)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              apenasUrgentes
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${apenasUrgentes ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Apenas Urgência</span>
          </button>
        </div>

        {/* Filter tags (Barra de rolagem horizontal para temas legislativos) */}
        <div className="theme-scroll-bar flex items-center gap-2 overflow-x-auto pt-2 pb-2.5 border-t border-slate-100 text-xs scroll-smooth">
          <span className="text-slate-500 flex items-center gap-1 font-medium whitespace-nowrap">
            <Filter className="w-3 h-3" /> Temas:
          </span>
          <button
            onClick={() => setTemaSelecionado('TODOS')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
              temaSelecionado === 'TODOS'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos os Temas
          </button>
          {todosTemas.map((tema) => (
            <button
              key={tema}
              onClick={() => setTemaSelecionado(tema)}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                temaSelecionado === tema
                  ? 'bg-emerald-700 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tema}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Exibindo <span className="font-semibold text-slate-900 font-mono">{proposicoesFiltradas.length}</span> propostas prioritárias
        </div>
        <div className="flex items-center gap-2">
          <span>Critério: Urgência e Ordem do Dia</span>
        </div>
      </div>

      {/* List of Bill Cards */}
      {proposicoesFiltradas.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Nenhuma proposta encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Nenhuma matéria legislativa corresponde aos filtros selecionados. Tente limpar os filtros ou realizar uma nova varredura.
          </p>
          <button
            onClick={() => {
              setBusca('');
              setFiltroCasa('TODAS');
              setTemaSelecionado('TODOS');
              setApenasUrgentes(false);
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors"
          >
            Limpar Todos os Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {proposicoesFiltradas.map((proposta) => {
            const isUrgente = proposta.regimeUrgencia;
            const prob = proposta.probabilidadeAprovacao;
            const probCor =
              prob >= 75 ? 'text-emerald-700' : prob >= 50 ? 'text-amber-700' : 'text-rose-700';
            const probBarCor =
              prob >= 75 ? 'bg-emerald-500' : prob >= 50 ? 'bg-amber-500' : 'bg-rose-500';

            return (
              <div
                key={proposta.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-5"
              >
                {/* Header line with clean unboxed metadata and rich tooltips */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <span
                      className="font-mono font-bold text-base text-slate-950 cursor-help hover:text-emerald-700 transition-colors"
                      title={`Código oficial da matéria legislativa: ${proposta.codigo} (${proposta.siglaTipo} nº ${proposta.numero} do ano ${proposta.ano}). Identificador único nos sistemas oficiais do Congresso.`}
                      tabIndex={0}
                    >
                      {proposta.codigo}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span
                      className="font-medium text-slate-800 cursor-help"
                      title={`Casa Legislativa: ${
                        proposta.casa === 'CAMARA'
                          ? 'Câmara dos Deputados (deliberação de 513 parlamentares federais)'
                          : proposta.casa === 'SENADO'
                          ? 'Senado Federal (deliberação de 81 senadores da República)'
                          : 'Congresso Nacional (sessão conjunta de deputados e senadores)'
                      }`}
                      tabIndex={0}
                    >
                      {proposta.casa === 'CAMARA'
                        ? 'Câmara dos Deputados'
                        : proposta.casa === 'SENADO'
                        ? 'Senado Federal'
                        : 'Congresso Nacional'}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span
                      className="text-slate-500 cursor-help truncate max-w-xs"
                      title={`Local de votação atual do texto: ${proposta.orgaoAtual}. Colegiado ou plenário regimental onde a matéria está sendo discutida e votada neste estágio.`}
                      tabIndex={0}
                    >
                      {proposta.orgaoAtual}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {isUrgente && (
                      <span
                        className="flex items-center gap-1 text-amber-700 font-semibold cursor-help bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                        title={`Nível de urgência da votação: Regime de Urgência Ativo. Dispensa certas formalidades e prazos de instrução em comissões temáticas para votação imediata no Plenário. Prioridade do governo: ${proposta.prioridadeGoverno || 'Média'}.`}
                        tabIndex={0}
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-600" /> Urgência
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1 text-slate-600 cursor-help"
                      title={`Data e momento previsto para a votação: ${proposta.dataPrevistaVotacao}. Indica se o texto já está pautado para a Ordem do Dia da sessão deliberativa atual ou se a pauta é iminente.`}
                      tabIndex={0}
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {proposta.dataPrevistaVotacao}
                    </span>
                  </div>
                </div>

                {/* Main Content Title and Plain Citizen Summary */}
                <div className="space-y-2 mb-4">
                  <h3
                    className="text-base font-bold text-slate-900 leading-snug cursor-help hover:text-emerald-900 transition-colors"
                    title={`Título do texto em aprovação: ${proposta.tituloCurto}\n\nEmenta Oficial: ${proposta.ementa}`}
                    tabIndex={0}
                  >
                    {proposta.tituloCurto}
                  </h3>
                  <div
                    className="bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-xs text-slate-700 leading-relaxed cursor-help"
                    title="Ementa e último despacho oficial registrado diretamente nos Dados Abertos do Congresso Nacional."
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                        <FileText className="w-3 h-3 text-emerald-600" /> Ementa & Despacho Oficial:
                      </span>
                      {proposta.fonteOficial && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {proposta.fonteOficial}
                        </span>
                      )}
                    </div>
                    {proposta.resumoCidadao}
                  </div>
                </div>

                {/* Metrics and Parliamentary Forecast Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-lg text-xs border border-slate-100 mb-4">
                  {/* Quorum requirement */}
                  <div
                    className="cursor-help"
                    title={`Quórum constitucional de votação: exige no mínimo ${proposta.quorum.minimoVotos} votos favoráveis (${proposta.quorum.tipo}) de um total de ${proposta.quorum.totalMembros} membros. Regra: ${proposta.quorum.descricaoRegra}.`}
                    tabIndex={0}
                  >
                    <div className="text-slate-500 font-medium flex items-center gap-1">
                      <Scale className="w-3 h-3 text-slate-400" /> Quórum Requerido
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {proposta.quorum.minimoVotos} votos ({proposta.quorum.tipo})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {proposta.quorum.descricaoRegra}
                    </div>
                  </div>

                  {/* Rapporteur */}
                  <div
                    className="cursor-help"
                    title={`Relatoria do texto: ${proposta.relator.nome}. Parecer atual: ${proposta.relator.parecer || 'Aguardando parecer oficial'}.`}
                    tabIndex={0}
                  >
                    <div className="text-slate-500 font-medium flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" /> Relatoria & Autoria
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5 truncate">
                      {proposta.relator.partido && proposta.relator.partido !== '—'
                        ? `${proposta.relator.nome} (${proposta.relator.partido}-${proposta.relator.uf})`
                        : proposta.relator.nome}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium truncate">
                      Autor: {proposta.autor}
                    </div>
                  </div>

                  {/* Fiscal impact */}
                  <div
                    className="cursor-help"
                    title={`Impacto fiscal e orçamentário: ${formatarValorImpacto(proposta.impacto.fiscal.valorEstimadoBi)}. ${proposta.impacto.fiscal.descricao}`}
                    tabIndex={0}
                  >
                    <div className="text-slate-500 font-medium flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-slate-400" /> Status & Impacto Fiscal
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5 truncate">
                      {formatarValorImpacto(proposta.impacto.fiscal.valorEstimadoBi)}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {proposta.statusTramitacao}
                    </div>
                  </div>
                </div>

                {/* Probability Bar */}
                <div
                  className="space-y-1 mb-4 cursor-help"
                  title={`Termômetro de aprovação parlamentar: probabilidade estimada em ${proposta.probabilidadeAprovacao}%. Cálculo baseado no alinhamento das bancadas partidárias (Base do Governo: ${proposta.bancadas.governista}, Centrão: ${proposta.bancadas.centrao}, Oposição: ${proposta.bancadas.oposicao}) frente ao quórum mínimo de ${proposta.quorum.minimoVotos} votos.`}
                  tabIndex={0}
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Termômetro de Aprovação:</span>
                    <span className={`font-mono font-bold ${probCor}`}>
                      {proposta.probabilidadeAprovacao}% de probabilidade
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${probBarCor} transition-all duration-500`}
                      style={{ width: `${proposta.probabilidadeAprovacao}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Actions and Tags */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    {proposta.tags.slice(0, 3).map((t, idx) => (
                      <span
                        key={t}
                        className="cursor-help"
                        title={`Tema e classificação da matéria legislativa: ${t}`}
                        tabIndex={0}
                      >
                        {idx > 0 && <span className="mr-2 text-slate-300">·</span>}
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `*🚨 ALERTA LEGISLATIVO:* *${proposta.codigo}*\n*${proposta.tituloCurto}*\n\n*Resumo Cidadão:* ${proposta.resumoCidadao}\n\n*Termômetro:* ${proposta.probabilidadeAprovacao}% de probabilidade de aprovação\n*Quórum Exigido:* ${proposta.quorum.minimoVotos} votos (${proposta.quorum.tipo})\n\nAcompanhe no Radar Legislativo: ${proposta.linkOficial}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                      title="Compartilhar resumo cidadão e status de votação no WhatsApp com 1 clique"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => onSelecionarParaDivulgacao(proposta)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                      title="Gerar card visual formatado para redes sociais (Instagram, LinkedIn, X/Twitter e WhatsApp)"
                    >
                      <span>Gerar Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelecionarParaImpacto(proposta)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-xs"
                      title="Acessar o painel analítico com simulador interativo de bancadas e parecer com Inteligência Artificial"
                    >
                      <span>Análise de Impacto</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
