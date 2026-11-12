import { ProposicaoLegislativa } from '../types/legislative';

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
  fonte: 'GEMINI_AI_SERVER';
  modelo?: string;
  erro?: string;
}

/**
 * Solicita análise legislativa real ao backend Node.js/Express,
 * que executa o Google Gemini no servidor. Sem dados mockados ou respostas fictícias.
 */
export async function obterAnaliseLegislativa(
  proposicao: ProposicaoLegislativa,
  customApiKey?: string
): Promise<RequisicaoIaResposta> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const effectiveKey =
      (customApiKey && customApiKey.trim()) ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('RADAR_LEGISLATIVO_GEMINI_API_KEY') ||
          localStorage.getItem('gemini_api_key') ||
          ''
        : '');

    if (effectiveKey && effectiveKey.trim()) {
      headers['x-gemini-api-key'] = effectiveKey.trim();
    }

    const response = await fetch('/api/ai-impact', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        proposicao,
        userApiKey: effectiveKey ? effectiveKey.trim() : undefined,
      }),
    });

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
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const effectiveKey =
      (customApiKey && customApiKey.trim()) ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('RADAR_LEGISLATIVO_GEMINI_API_KEY') ||
          localStorage.getItem('gemini_api_key') ||
          ''
        : '');

    if (effectiveKey && effectiveKey.trim()) {
      headers['x-gemini-api-key'] = effectiveKey.trim();
    }

    const response = await fetch('/api/ai-impact/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        proposicao,
        userApiKey: effectiveKey ? effectiveKey.trim() : undefined,
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
