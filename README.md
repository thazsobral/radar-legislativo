# 🏛️ Radar Legislativo — Robô de Votações & Análise de Impacto

> **Robô autônomo para busca, monitoramento e divulgação em tempo real de pautas, propostas e leis a serem votadas no Congresso Nacional (Câmara dos Deputados e Senado Federal), com alertas multicanal e dashboard interativo de análise de impacto parlamentar.**

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4_Hydrogen-8e75ff?logo=google)
![Licença](https://img.shields.io/badge/License-Apache_2.0-green)

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Endpoints da API](#-endpoints-da-api)
- [Como Executar Localmente](#-como-executar-localmente)
- [Configuração de Variáveis de Ambiente](#-configuração-de-variáveis-de-ambiente)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Testes Automatizados](#-testes-automatizados)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **Radar Legislativo** foi desenvolvido para aproximar o cidadão, jornalistas, assessores e entidades setoriais das deliberações mais urgentes do Congresso Nacional. O robô consulta diretamente as APIs oficiais em tempo real, sintetiza termos jurídicos complexos em linguagem cidadã via **Google Gemini 4 Hydrogen** e automatiza a divulgação instantânea para múltiplos canais.

---

## 🚀 Funcionalidades Principais

### 1. 🔍 Varredura e Monitoramento Ao Vivo
- Conexão direta com as APIs públicas de **Dados Abertos da Câmara dos Deputados** e **Senado Federal**.
- Filtros por Casa Legislativa (Câmara, Senado, Congresso), tipo de proposição (PEC, PL, MPV, PLP) e matérias em regime de urgência.
- Detecção contínua de novas propostas pautadas para deliberação na Ordem do Dia.

### 2. 📢 Robô de Divulgação & Alertas Multicanal
- **Disparo instantâneo** com geração de templates prontos para:
  - 💬 **WhatsApp** (formatação com emojis e chamada de ação)
  - ✈️ **Telegram** (mensagens com preview formatado)
  - 🐦 **X / Twitter** (threads e posts concisos com hashtags parlamentares)
  - 🔗 **Webhooks REST** (integração direta com servidores de automação e bots)
  - 🔔 **Notificações Web & Áudio** (sintetizador de áudio via Web Audio API e modal na tela).

### 3. 📊 Dashboard de Análise de Impacto Parlamentar
- **Impacto Orçamentário & Fiscal**: Projeção de valores em bilhões de reais e nível de risco (Neutro, Médio, Alto, Crítico).
- **Impacto Social & Direitos**: Exame das consequências diretas sobre a cidadania e governança pública.
- **Setores Regulados & Mercado**: Mapeamento dos segmentos produtivos afetados e diretrizes de sustentabilidade/clima.

### 4. 🧮 Simulador Dinâmico de Placar & Quórum Constitucional
- Cálculo preciso das regras regimentais:
  - **Maioria Simples** (votações ordinárias com maioria dos presentes)
  - **Maioria Absoluta** (257 na Câmara / 41 no Senado para Leis Complementares)
  - **Maioria Qualificada de 3/5** (308 na Câmara / 49 no Senado em 2 turnos para PECs)
- **Sliders interativos de alianças**: Ajuste a fidelidade e adesão da bancada do Centrão e da Oposição para projetar a probabilidade de aprovação e margem sobre a linha de quórum.

### 5. 🤖 Parecer Inteligente & Explicador Cidadão com IA
- Alimentado pelo modelo **Google Gemini 4 Hydrogen** executado no servidor Node.js.
- **Tradução cidadã**: Síntese sem juridiquês do que a lei muda na vida cotidiana com base estritamente nos dados oficiais.
- **Mapeamento de forças**: Identificação explícita de "Quem Ganha", "Quem Perde/Enfrenta Custos" e "Cenário Político Estratégico".
- **Transparência total**: Sem respostas fictícias ou simulações; erros ou ausência de chave são reportados diretamente na interface.

### 6. 🎨 Gerador de Cards Visuais para Redes Sociais
- Pré-visualização de cards com padrão visual legislativo profissional.
- Alternância entre formatos **1:1 (Quadrado para Instagram/LinkedIn)** e **16:9 (Horizontal para Twitter/WhatsApp)**.
- Botões de cópia rápida de texto e exportação.

### 7. 🩺 Painel de Diagnóstico & Verificação
- Monitoramento de saúde e latência das conexões oficiais.
- Teste de alerta com 1 clique (áudio sintetizado + pop-up visual).
- Guia explicativo passo a passo de como comprovar o funcionamento de cada módulo.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** com TypeScript
- **Tailwind CSS v4** (estilização ultra-rápida sem dependência de classes legadas)
- **Lucide React** (iconografia moderna)
- **Motion** (transições e micro-interações fluidas)

### Backend
- **Node.js** + **Express** com execução TypeScript via `tsx`
- **@google/genai (v2.32+)**: SDK oficial do Google Gemini para chamadas server-side
- **Vite 8**: Servidor de desenvolvimento e empacotador de produção de alta performance

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     Navegador (Client)                      │
│   React 19 + Tailwind CSS + Lucide Icons + Web Audio API     │
└──────────────────────────────┬──────────────────────────────┘
                               │  fetch('/api/*')
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Servidor Backend (server.ts)                │
│                   Express + Node.js + TSX                   │
├──────────────────────────────┬──────────────────────────────┤
│  API de Varredura e Pautas   │  API de Diagnóstico Oficial  │
│  (/api/scan, /api/proposic.) │  (/api/diagnostico)          │
├──────────────────────────────┼──────────────────────────────┤
│  API de Alertas & Divulgação │  API Gemini 4 Hydrogen       │
│  (/api/alertas/disparar)     │  (/api/ai-impact & /stream)  │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
 ┌───────────────────────────┐  ┌───────────────────────────┐
 │ APIs Oficiais do Governo  │  │   Google AI Studio API    │
 │  - Dados Abertos Câmara   │  │   - Modelo: gemini-4-     │
 │  - Dados Abertos Senado   │  │     hydrogen              │
 └───────────────────────────┘  └───────────────────────────┘
```

---

## 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/proposicoes` | Lista todas as matérias legislativas monitoradas |
| `POST` | `/api/scan` | Executa a varredura nas APIs oficiais por termo, tipo ou casa |
| `GET` | `/api/alertas` | Histórico dos alertas já divulgados pelo robô |
| `POST` | `/api/alertas/disparar` | Dispara um novo alerta para WhatsApp, Telegram, X e Webhooks |
| `GET` | `/api/diagnostico` | Testa conexão e latência das APIs oficiais e status da IA |
| `GET` | `/api/ai-status` | Retorna o status operacional do modelo Gemini no servidor |
| `POST` | `/api/ai-impact` | Gera parecer estruturado com Google Gemini 4 Hydrogen |
| `POST` | `/api/ai-impact/stream` | Streaming de parecer via Server-Sent Events (SSE) |
| `GET`/`POST` | `/api/config` | Lê e persiste as configurações do robô em disco |
| `POST` | `/api/webhook/test` | Executa ping HTTP POST real no webhook configurado |

---

## 💻 Como Executar Localmente

### Pré-requisitos
- **Node.js** v20 ou superior
- **npm** v10 ou superior

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/radar-legislativo.git
   cd radar-legislativo
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Abra o arquivo `.env` e configure sua chave de API do Gemini (obtida gratuitamente no [Google AI Studio](https://aistudio.google.com/app/apikey)):
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação:**
   Abra no seu navegador: `http://localhost:3000`

---

## ⚙️ Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Chave de API do Google Gemini (Google AI Studio)
GEMINI_API_KEY="sua_chave_do_google_ai_studio"

# Chave alternativa suportada
RADAR_LEGISLATIVO_GEMINI_API_KEY=""

# Porta de execução do servidor (opcional, padrão 3000)
PORT=3000

# URL da aplicação (injetado automaticamente em ambientes Cloud)
APP_URL="http://localhost:3000"
```

> **Nota:** Para gerar pareceres de inteligência artificial, configure uma chave no `.env` do servidor ou informe sua chave diretamente no painel da aba *Análise de Impacto Parlamentar*.

---

## 📁 Estrutura de Pastas

```
├── .env.example                  # Modelo de variáveis de ambiente
├── index.html                    # Ponto de entrada HTML e meta tags
├── metadata.json                 # Metadados do app no Google AI Studio
├── package.json                  # Scripts e dependências do projeto
├── server.ts                     # Servidor Express, endpoints REST e Gemini API
├── tsconfig.json                 # Configurações TypeScript
├── vite.config.ts                # Configuração do Vite e Tailwind v4
└── src/
    ├── App.tsx                   # Componente raiz e orquestrador de estado
    ├── main.tsx                  # Ponto de entrada React 19
    ├── index.css                 # Import do Tailwind CSS (@import "tailwindcss")
    ├── types/
    │   └── legislative.ts        # Tipagem TypeScript (Proposições, Alertas, Bancadas)
    ├── services/
    │   └── legislativeDataService.ts # Cliente ao vivo das APIs da Câmara e Senado
    ├── utils/
    │   ├── aiAnalysisClient.ts   # Cliente de comunicação com /api/ai-impact e SSE
    │   ├── alertAudio.ts         # Sintetizador de alerta sonoro (Web Audio API)
    │   ├── parliamentaryMath.ts  # Cálculos de quórum (PEC, PL, PLP) e placar
    │   └── parliamentaryMath.test.ts # Testes unitários das regras matemáticas
    └── components/
        ├── Header.tsx            # Cabeçalho com abas horizontais e status ao vivo
        ├── RadarVotacoes.tsx     # Varredura, filtros e listagem de matérias
        ├── DashboardImpacto.tsx  # Análise de impacto, simulador e parecer IA
        ├── RoboDivulgacao.tsx    # Central de disparo para WhatsApp, Telegram, X
        ├── CardVisualSocial.tsx  # Gerador de cards visuais 1:1 e 16:9
        ├── ModalAlertaAtivo.tsx  # Pop-up de notificação imediata
        ├── PainelDiagnostico.tsx # Diagnóstico oficial de latência e conexão
        └── ConfiguracoesRobo.tsx # Ajustes de palavras-chave, webhooks e automação
```

---

## 🧪 Testes Automatizados

O projeto conta com suíte de testes unitários que valida as regras constitucionais de quórum (art. 47, art. 60 e art. 69 da CF/88):

```bash
npm run test
```

Para verificar tipos TypeScript:
```bash
npm run lint
```

Para compilar o pacote de produção:
```bash
npm run build
```

---

## 📄 Licença

Distribuído sob a licença **Apache 2.0**. Consulte o arquivo de licença para mais detalhes.
