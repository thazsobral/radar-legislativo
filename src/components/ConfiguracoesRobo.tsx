import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Clock,
  KeyRound,
  BellRing,
  Globe,
  Plus,
  X,
  CheckCircle2,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { ConfiguracaoRobo, CasaLegislativa } from '../types/legislative';
import { testarWebhookReal } from '../services/apiClient';

interface ConfiguracoesRoboProps {
  config: ConfiguracaoRobo;
  onSalvarConfig: (novaConfig: ConfiguracaoRobo) => void;
}

export const ConfiguracoesRobo: React.FC<ConfiguracoesRoboProps> = ({
  config,
  onSalvarConfig,
}) => {
  const [formData, setFormData] = useState<ConfiguracaoRobo>({ ...config });
  const [novoTermo, setNovoTermo] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [webhookTesteMsg, setWebhookTesteMsg] = useState('');

  const adicionarPalavraChave = () => {
    if (!novoTermo.trim()) return;
    const termo = novoTermo.trim();
    if (!formData.palavrasChave.includes(termo)) {
      setFormData({
        ...formData,
        palavrasChave: [...formData.palavrasChave, termo],
      });
    }
    setNovoTermo('');
  };

  const removerPalavraChave = (termo: string) => {
    setFormData({
      ...formData,
      palavrasChave: formData.palavrasChave.filter((t) => t !== termo),
    });
  };

  const toggleCasa = (casa: CasaLegislativa) => {
    const existe = formData.casasMonitoradas.includes(casa);
    setFormData({
      ...formData,
      casasMonitoradas: existe
        ? formData.casasMonitoradas.filter((c) => c !== casa)
        : [...formData.casasMonitoradas, casa],
    });
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    onSalvarConfig(formData);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const [testandoWebhook, setTestandoWebhook] = useState(false);
  const [webhookErro, setWebhookErro] = useState(false);

  const testarWebhook = async () => {
    if (!formData.webhookUrl.trim()) {
      setWebhookErro(true);
      setWebhookTesteMsg('Informe uma URL HTTP/HTTPS válida antes de testar.');
      return;
    }

    setTestandoWebhook(true);
    setWebhookErro(false);
    setWebhookTesteMsg('Enviando requisição HTTP POST real para o endpoint informado...');

    try {
      const data = await testarWebhookReal(formData.webhookUrl.trim());
      if (data.sucesso) {
        setWebhookErro(false);
        setWebhookTesteMsg(
          `HTTP ${data.statusHttp} OK (${data.latenciaMs} ms) — Webhook recebeu o pacote JSON de teste!`
        );
      } else {
        setWebhookErro(true);
        setWebhookTesteMsg(data.erro || `Falha HTTP ${data.statusHttp || 'de rede'}`);
      }
    } catch (err: any) {
      setWebhookErro(true);
      setWebhookTesteMsg(err?.message || 'Erro de rede ao testar o webhook.');
    } finally {
      setTestandoWebhook(false);
    }
  };

  return (
    <form onSubmit={salvar} className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">
                Parâmetros de Automação & Varredura do Robô
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina as regras de rastreamento das pautas da Câmara e Senado e os gatilhos para alertas automáticos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {salvo && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Configurações salvas!
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs"
            >
              Salvar Parâmetros
            </button>
          </div>
        </div>

        {/* Status Geral do Robô */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900">
              Execução Contínua do Scanner
            </div>
            <div className="text-[11px] text-slate-500">
              Quando ativado, o robô verifica continuamente novas pautas e despachos na API oficial.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              formData.ativo ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.ativo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Frequência de Varredura */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" /> Frequência de Varredura da Pauta Oficial:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[5, 15, 30, 60].map((minutos) => (
              <button
                type="button"
                key={minutos}
                onClick={() => setFormData({ ...formData, intervaloMinutos: minutos })}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                  formData.intervaloMinutos === minutos
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                A cada {minutos} minutos
              </button>
            ))}
          </div>
        </div>

        {/* Casas Monitoradas */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-900">
            Casas Legislativas Rastreadas:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                { id: 'CAMARA', label: 'Câmara dos Deputados', info: '513 deputados · Plenário e Comissões' },
                { id: 'SENADO', label: 'Senado Federal', info: '81 senadores · Matérias e Pareceres' },
                { id: 'CONGRESSO', label: 'Congresso Nacional', info: 'Sessões conjuntas e vetos' },
              ] as const
            ).map((item) => {
              const ativo = formData.casasMonitoradas.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCasa(item.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    ativo
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={() => {}}
                      className="accent-emerald-600"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{item.info}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Palavras-Chave de Monitoramento */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-slate-500" /> Palavras-Chave e Termos Críticos:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar termo (ex: desoneração, imposto, IA, agro...)"
              value={novoTermo}
              onChange={(e) => setNovoTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarPalavraChave();
                }
              }}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={adicionarPalavraChave}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" /> Adicionar
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {formData.palavrasChave.map((termo) => (
              <span
                key={termo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-800 border border-slate-200"
              >
                <span>{termo}</span>
                <button
                  type="button"
                  onClick={() => removerPalavraChave(termo)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Gatilhos de Alerta Automático */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-slate-500" /> Gatilhos de Notificação Imediata:
          </label>
          <div className="space-y-2 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.apenasUrgentes}
                onChange={(e) =>
                  setFormData({ ...formData, apenasUrgentes: e.target.checked })
                }
                className="accent-emerald-600 rounded"
              />
              <span>Disparar quando aprovado <strong>Regime de Urgência</strong></span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notificacoesBrowser}
                onChange={(e) =>
                  setFormData({ ...formData, notificacoesBrowser: e.target.checked })
                }
                className="accent-emerald-600 rounded"
              />
              <span>Disparar pop-ups no navegador ao iniciar votação nominal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoPublicarRedes}
                onChange={(e) =>
                  setFormData({ ...formData, autoPublicarRedes: e.target.checked })
                }
                className="accent-emerald-600 rounded"
              />
              <span>Gerar automaticamente card visual para matérias em 1ª prioridade</span>
            </label>
          </div>
        </div>

        {/* Webhook Externo */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-slate-500" /> URL de Webhook para Integração Externa (Discord, Slack, Zapier):
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/... ou https://hooks.slack.com/..."
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={testarWebhook}
              disabled={testandoWebhook}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 inline mr-1" /> {testandoWebhook ? 'Testando...' : 'Testar'}
            </button>
          </div>
          {webhookTesteMsg && (
            <div
              className={`text-[11px] p-2 rounded border ${
                webhookErro
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              {webhookTesteMsg}
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
