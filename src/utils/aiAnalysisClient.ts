import { GoogleGenAI, Type } from '@google/genai';
import { ProposicaoLegislativa } from '../types/legislative';
import { getApiBaseUrl, isStaticMode } from '../services/apiClient';

export interface AnaliseIaResultado {
  resumoCidadao: string;
  impactoFiscalAnalise: string;
  quemGanha: string[];
  quemPerde: string[];
  cenarioVotacao: string;
  recomendacaoEstrategica?: string;
}

export interface RequisicaoIaResposta {
  sucesso: boolean;
  analiseIa?: AnaliseIaResultado;
  fonte: 'GEMINI_AI_SERVER' | 'GEMINI_AI_USER_KEY';
  modelo?: string;
  erro?: string;
}

function getEffectiveUserKey(customApiKey?: string): string {
  return (
    (customApiKey && customApiKey.trim()) ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('RADAR_LEGISLATIVO_GEMINI_API_KEY') ||
        localStorage.getItem('gemini_api_key') ||
        ''
      : '')
  ).trim();
}

async function executarAnaliseComChaveUsuarioNoNavegador(
  proposicao: ProposicaoLegislativa,
  userKey: string
): Promise<RequisicaoIaResposta> {
  if (!userKey) {
    return {
      sucesso: false,
      fonte: 'GEMINI_AI_USER_KEY',
      erro: 'Este site está hospedado em modo estático (sem servidor Node.js). Para gerar pareceres com IA aqui, clique em "Configurar Chave Gemini" acima e informe sua chave gratuita do Google AI Studio.',
    };
  }

  try {
    const client = new GoogleGenAI({ apiKey: userKey });
    const hist = (proposicao.historicoEventos || [])
      .slice(0, 4)
      .map((h) => `- ${h.data} (${h.local}): ${h.descricao}`)
      .join('\n');

    const prompt = `Você é um analista sênior de políticas públicas e processo legislativo do Congresso Nacional do Brasil.
Analise exclusivamente com base nos dados oficiais reais abaixo (não invente números orçamentários inexistentes caso o texto não os especifique):

Código: ${proposicao.codigo}
Casa Legislativa: ${proposicao.casa}
Órgão Atual: ${proposicao.orgaoAtual}
Autoria: ${proposicao.autor}
Relator: ${proposicao.relator?.nome || 'Não informado'} (${proposicao.relator?.partido || '-'}/${proposicao.relator?.uf || '-'})
Status de Tramitação: ${proposicao.statusTramitacao}
Regime de Urgência: ${proposicao.regimeUrgencia ? 'Sim' : 'Não'}
Quórum Exigido: ${proposicao.quorum?.descricaoRegra || 'Regimental'}
Composição Real Atual de Bancadas: Base Governista=${proposicao.bancadas?.governista}, Bloco Centro=${proposicao.bancadas?.centrao}, Oposição=${proposicao.bancadas?.oposicao}
Ementa Oficial: ${proposicao.ementa}
Despacho / Contexto: ${proposicao.resumoCidadao}
Últimas Tramitações:
${hist || 'Sem histórico detalhado'}

Retorne exclusivamente JSON estruturado em português claro com: resumo cidadão acessível, análise de impacto fiscal/regulatório baseada nos fatos da matéria, grupos que ganham (quemGanha), grupos onerados/afetados (quemPerde), cenário de votação e recomendação prática de acompanhamento.`;

    const aiResponse = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumoCidadao: { type: Type.STRING },
            impactoFiscalAnalise: { type: Type.STRING },
            quemGanha: { type: Type.ARRAY, items: { type: Type.STRING } },
            quemPerde: { type: Type.ARRAY, items: { type: Type.STRING } },
            cenarioVotacao: { type: Type.STRING },
            recomendacaoEstrategica: { type: Type.STRING },
          },
          required: [
            'resumoCidadao',
            'impactoFiscalAnalise',
            'quemGanha',
            'quemPerde',
            'cenarioVotacao',
            'recomendacaoEstrategica',
          ],
        },
      },
    });

    if (!aiResponse.text) {
      return {
        sucesso: false,
        fonte: 'GEMINI_AI_USER_KEY',
        erro: 'O modelo Gemini retornou uma resposta vazia.',
      };
    }

    const parsed = JSON.parse(aiResponse.text);
    return {
      sucesso: true,
      analiseIa: parsed,
      fonte: 'GEMINI_AI_USER_KEY',
      modelo: 'gemini-4-hydrogen',
    };
  } catch (err: any) {
    return {
      sucesso: false,
      fonte: 'GEMINI_AI_USER_KEY',
      erro: `Falha ao consultar Gemini com sua chave: ${err?.message || 'Erro desconhecido'}`,
    };
  }
}

/**
 * Solicita análise legislativa real ao backend Node.js/Express (ou usa a chave do usuário
 * caso esteja hospedado em ambiente estático sem servidor, como GitHub Pages).
 */
export async function obterAnaliseLegislativa(
  proposicao: ProposicaoLegislativa,
  customApiKey?: string
): Promise<RequisicaoIaResposta> {
  const effectiveKey = getEffectiveUserKey(customApiKey);

  if (isStaticMode()) {
    return await executarAnaliseComChaveUsuarioNoNavegador(proposicao, effectiveKey);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (effectiveKey) {
      headers['x-gemini-api-key'] = effectiveKey;
    }

    const response = await fetch(`${getApiBaseUrl()}/api/ai-impact`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        proposicao,
        userApiKey: effectiveKey || undefined,
      }),
    });

    if (response.status === 404) {
      return await executarAnaliseComChaveUsuarioNoNavegador(proposicao, effectiveKey);
    }

    const data = await response.json().catch(() => null);

    if (response.ok && data?.sucesso && data?.analiseIa) {
      return {
        sucesso: true,
        analiseIa: data.analiseIa,
        fonte: 'GEMINI_AI_SERVER',
        modelo: data.modelo,
      };
    }

    return {
      sucesso: false,
      fonte: 'GEMINI_AI_SERVER',
      erro: data?.erro || `Erro HTTP ${response.status} ao consultar análise de IA no servidor.`,
    };
  } catch (networkError: any) {
    return {
      sucesso: false,
      fonte: 'GEMINI_AI_SERVER',
      erro: networkError?.message || 'Não foi possível conectar ao servidor para gerar análise de IA.',
    };
  }
}

/**
 * Suporte a streaming real de parecer legislativo via SSE (Server-Sent Events)
 * executado no servidor backend.
 */
export async function obterAnaliseLegislativaStream(
  proposicao: ProposicaoLegislativa,
  onChunk: (chunk: string) => void,
  customApiKey?: string
): Promise<RequisicaoIaResposta> {
  const effectiveKey = getEffectiveUserKey(customApiKey);

  if (isStaticMode()) {
    return await executarAnaliseComChaveUsuarioNoNavegador(proposicao, effectiveKey);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (effectiveKey) {
      headers['x-gemini-api-key'] = effectiveKey;
    }

    const response = await fetch(`${getApiBaseUrl()}/api/ai-impact/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        proposicao,
        userApiKey: effectiveKey || undefined,
      }),
    });

    if (!response.ok || !response.body) {
      return await obterAnaliseLegislativa(proposicao, customApiKey);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResultado: RequisicaoIaResposta | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.erro) {
              return {
                sucesso: false,
                fonte: 'GEMINI_AI_SERVER',
                erro: parsed.erro,
              };
            }
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
            if (parsed.completo && parsed.analiseIa) {
              finalResultado = {
                sucesso: true,
                analiseIa: parsed.analiseIa,
                fonte: 'GEMINI_AI_SERVER',
                modelo: parsed.modelo,
              };
            }
          } catch (_e) {
            // Continua processando stream
          }
        }
      }
    }

    if (finalResultado) {
      return finalResultado;
    }

    return await obterAnaliseLegislativa(proposicao, customApiKey);
  } catch (err: any) {
    return {
      sucesso: false,
      fonte: 'GEMINI_AI_SERVER',
      erro: err?.message || 'Erro no streaming de análise IA.',
    };
  }
}
