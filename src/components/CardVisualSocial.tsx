import React, { useRef, useEffect, useState } from 'react';
import { Download, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { ProposicaoLegislativa } from '../types/legislative';
import { formatarValorImpacto } from '../utils/parliamentaryMath';

interface CardVisualSocialProps {
  proposicao: ProposicaoLegislativa;
}

export const CardVisualSocial: React.FC<CardVisualSocialProps> = ({ proposicao }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Render high-resolution civic alert card on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Background gradient (Deep Civic Navy)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a'); // slate-900
    bgGrad.addColorStop(1, '#064e3b'); // emerald-900
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative subtle grid or border accents
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Header Kicker
    ctx.fillStyle = '#34d399'; // emerald-400
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('RADAR LEGISLATIVO · ALERTA OFICIAL DE VOTAÇÃO', 60, 80);

    // Casa Legislativa & Status
    const casaNome =
      proposicao.casa === 'CAMARA'
        ? 'CÂMARA DOS DEPUTADOS'
        : proposicao.casa === 'SENADO'
        ? 'SENADO FEDERAL'
        : 'CONGRESSO NACIONAL';
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${casaNome}  ·  STATUS: ${proposicao.statusTramitacao.toUpperCase()}`, 60, 115);

    // Proposição Código
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proposicao.codigo, 60, 190);

    // Título Curto
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    const tituloLimitado =
      proposicao.tituloCurto.length > 55
        ? proposicao.tituloCurto.substring(0, 52) + '...'
        : proposicao.tituloCurto;
    ctx.fillText(tituloLimitado, 60, 240);

    // Box Resumo Cidadão
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(60, 270, width - 120, 150, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('O QUE MUDA NA PRÁTICA (RESUMO CIDADÃO):', 85, 305);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 21px "Plus Jakarta Sans", sans-serif';
    // Word wrap citizen summary
    const words = proposicao.resumoCidadao.split(' ');
    let line = '';
    let y = 345;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 180 && i > 0) {
        ctx.fillText(line, 85, y);
        line = words[i] + ' ';
        y += 32;
        if (y > 390) {
          line += '...';
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 85, y);

    // 3 Metrics Bottom Boxes
    const boxY = 445;
    const boxH = 110;
    const boxW = (width - 120 - 40) / 3;

    // Box 1: Quórum
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(60, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('QUÓRUM MÍNIMO EXIGIDO', 80, boxY + 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(`${proposicao.quorum.minimoVotos} votos`, 80, boxY + 75);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proposicao.quorum.tipo, 80, boxY + 95);

    // Box 2: Probabilidade
    const box2X = 60 + boxW + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(box2X, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PROBABILIDADE DE APROVAÇÃO', box2X + 20, boxY + 35);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText(`${proposicao.probabilidadeAprovacao}%`, box2X + 20, boxY + 75);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Termômetro de Plenário', box2X + 20, boxY + 95);

    // Box 3: Impacto Fiscal
    const box3X = box2X + boxW + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(box3X, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('IMPACTO FISCAL / ANO', box3X + 20, boxY + 35);
    const valorFiscalTexto =
      proposicao.impacto.fiscal.valorEstimadoBi !== null &&
      proposicao.impacto.fiscal.valorEstimadoBi !== 0
        ? formatarValorImpacto(proposicao.impacto.fiscal.valorEstimadoBi)
        : 'Não quantificado';
    ctx.fillStyle = '#fbbf24'; // amber-400
    ctx.font = valorFiscalTexto.length > 14 ? 'bold 21px "JetBrains Mono", monospace' : 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText(valorFiscalTexto, box3X + 20, boxY + 75);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Classificação: ${proposicao.impacto.fiscal.tipo}`, box3X + 20, boxY + 95);

    // Footer info
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Dados abertos oficiais · Câmara dos Deputados & Senado Federal', 60, 595);
    ctx.fillText('Gerado via Radar Legislativo', width - 290, 595);
  }, [proposicao]);

  const baixarImagem = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `alerta-votacao-${proposicao.codigo.replace(/\s+|\//g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const copiarImagem = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch (_err) {
          // Fallback: download if write not allowed
          baixarImagem();
        }
      });
    } catch (_err) {
      baixarImagem();
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-700" />
          <h4 className="text-sm font-bold text-slate-900">
            Card Visual para Redes Sociais (WhatsApp, X, Instagram)
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copiarImagem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer transition-colors"
            title="Copiar imagem do card em alta resolução (1200x630) diretamente para a área de transferência"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiado ? 'Copiado!' : 'Copiar Card'}</span>
          </button>

          <button
            type="button"
            onClick={baixarImagem}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs"
            title="Baixar arquivo de imagem PNG (1200x630 pixels) formatado com dados oficiais da proposição"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Imagem PNG (1200x630)</span>
          </button>
        </div>
      </div>

      {/* Canvas preview responsive wrapper */}
      <div
        className="overflow-hidden rounded-lg border border-slate-300 bg-slate-950 flex items-center justify-center p-2 cursor-pointer"
        title="Prévia do card gerado automaticamente com código da lei, título do texto, resumo cidadão, quórum mínimo e termômetro de aprovação."
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[380px] object-contain rounded"
        />
      </div>

      <div className="text-[11px] text-slate-500 text-center">
        Card gerado dinamicamente em alta resolução pronto para disparo nos grupos de acompanhamento legislativo e redes sociais.
      </div>
    </div>
  );
};
