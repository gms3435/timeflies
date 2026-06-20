# TimeFlies | Gestão Inteligente de Tempo e Tarefas

TimeFlies (O Tempo Voa) é um aplicativo local, seguro e offline (PWA) projetado para organizar a rotina diária, bloquear horários na agenda, gerenciar tarefas, monitorar projetos/estudos e realizar o controle financeiro pessoal.

Este projeto foi desenvolvido e refinado sob uma arquitetura **agent-first** usando o framework **Google Antigravity**, o que significa que tanto a estrutura do código quanto este manual foram otimizados para a colaboração contínua entre desenvolvedores humanos e agentes de inteligência artificial.

---

## 1. Introdução & Contexto Agent-First

Em um ambiente de desenvolvimento tradicional, o README atende apenas a leitores humanos. No ecossistema **Google Antigravity**, este documento também serve como a principal porta de entrada e contexto semântico para agentes de IA (como o assistente Antigravity). 

Os agentes de IA leem este arquivo para compreender:
* A finalidade do aplicativo e suas dependências.
* O design system estabelecido (Swiss Minimalist HSL).
* Como interagir com os arquivos do projeto e realizar manutenção sem quebrar as regras de segurança locais.

---

## 2. Tecnologias Utilizadas

O TimeFlies foi construído com foco em leveza, privacidade absoluta e alta performance:
* **Core:** HTML5 Semântico e Vanilla JavaScript (ES6+).
* **Estilização:** CSS3 Vanilla estruturado sob o design system **Modern Swiss Minimalist** (paletas baseadas em HSL para fácil customização e temas dinâmicos).
* **Gráficos e Métricas:** [Chart.js](https://www.chartjs.org/) para renderização local e responsiva de gráficos doughnut de alocação de tempo e prioridades.
* **Segurança e Criptografia:** [CryptoJS](https://github.com/brix/crypto-js) (AES-256) para proteção e cifragem local de dados armazenados no `localStorage`.
* **Biblioteca de Ícones:** [Lucide Icons](https://lucide.dev/) para elementos visuais consistentes.
* **PWA & Offline:** Service Worker (`sw.js`) e arquivo de manifesto (`manifest.json`) para suporte a instalação mobile e execução 100% offline.
* **Suporte Agentic:** Integrado com o **Google Antigravity IDE** e otimizado para o modelo de desenvolvimento "agent-first".

---

## 3. Funcionalidades Principais

1. **Agenda Diária (Horários):** Bloqueio de intervalos de tempo categorizados (Casa, Trabalho, Faculdade, Comprometido) para visualização clara do dia.
2. **Minhas Tarefas:** Gerenciador de checklists com painel de prioridades (Alta, Média, Baixa) e filtros de categorias.
3. **Disciplinas & Projetos:** Acompanhamento de metas de estudos semanais, cálculo de média geral (GPA) e notas de cursos.
4. **Controle Financeiro:** Dashboard de despesas mensais, fluxo de lançamentos à vista, controle de limite de fatura do cartão de crédito (com cálculo automático de parcelamento) e despesas fixas.
5. **Timer de Foco:** Pomodoro adaptativo associado a tarefas pendentes com alertas integrados.
6. **Assistente Smart Fit:** Algoritmo que analisa sua agenda diária e sugere automaticamente as melhores janelas de horários livres para realizar tarefas pendentes.
7. **Segurança Local:** Tela de bloqueio por senha local com armazenamento criptografado no navegador.

---

## 4. Instalação e Configuração

Como o TimeFlies é um aplicativo offline client-side, ele não requer servidores de banco de dados ou processos de build complexos.

### Pré-requisitos
* Um navegador moderno com suporte a Service Workers e LocalStorage.
* **Para desenvolvimento agentic:** O [Antigravity IDE](https://github.com/google-deepmind/antigravity) configurado.

### Executando Localmente
Para testar e rodar o projeto, inicie um servidor HTTP local simples na pasta raiz para permitir o carregamento correto dos Service Workers:

#### Usando Python:
```bash
python -m http.server 8080
```

#### Usando Node.js (http-server):
```bash
npx http-server -p 8080
```

Abra seu navegador em `http://localhost:8080`.

---

## 5. Instruções de Desenvolvimento para Agentes de IA

Se você é um agente de IA do Google Antigravity atuando neste repositório, siga estritamente as diretrizes abaixo para manter a integridade do projeto:

### Playbooks & Skills Relevantes
* **Brainstorming (`C:\Users\gmssi\.gemini\config\plugins\science\skills\brainstorming\SKILL.md`):** Use sempre esta skill antes de propor alterações significativas no layout ou introduzir novos módulos.
* **Polimento Estético (Swiss Minimalist):** Todas as alterações em [style.css](file:///c:/Users/gmssi/OneDrive/Desktop/TimeFlies/style.css) devem respeitar as variáveis HSL estabelecidas e evitar o uso de `backdrop-filter` ou neon glows para preservar a performance de renderização em dispositivos móveis antigos.

### Exemplos de Comandos e Contextos de Instrução:
* *Para alterar o comportamento dos gráficos:* "Modifique a função `renderCharts` em [app.js](file:///c:/Users/gmssi/OneDrive/Desktop/TimeFlies/app.js) para atualizar as cores dinamicamente lendo o estilo computado do documento, mantendo o `cutout` em `82%` e `borderWidth: 0`."
* *Para estilizar novos elementos:* "Adicione a nova regra em [style.css](file:///c:/Users/gmssi/OneDrive/Desktop/TimeFlies/style.css) utilizando as variáveis `--panel-bg`, `--panel-border` e as cores de status HSL correspondentes ao tema."

---

## 6. Contribuição

Para propor correções ou novos recursos:
1. Abra uma issue ou inicie um ciclo de planejamento no Antigravity IDE (`/goal`).
2. Crie um plano de implementação detalhando as alterações propostas.
3. Teste localmente utilizando as ferramentas de automação do navegador.
4. Mantenha os comentários de código legíveis e preferencialmente em português.

---

## 7. Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo correspondente para obter detalhes.
