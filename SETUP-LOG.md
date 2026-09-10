# SETUP LOG — Stack Agêntica para Hackathon

## FASE 6 — Validação de ponta a ponta (2026-09-08)

Projeto descartável: `C:\hackaton\smoke-test\` (Node + Jest). Prompt único exercitando o pipeline inteiro (Pesquisa→Plano→Executa→Revisa→Ship), sem forçar rota CCR/modelo aberto — decisão sua de abandonar o CCR, então esse passo do plano original (item 3 da Fase 6) foi pulado de propósito, não esquecido.

**Achado importante, guarde pro hackathon:** os agentes `@agent-xxx` do catálogo (VoltAgent, wshobson) **não são invocáveis pela ferramenta Agent/Task desta sessão** — testei `subagent_type: "test-automator"` e a resposta foi `Agent type 'test-automator' not found. Available agents: claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup`. O `@agent-nome` que você digita numa sessão interativa normal é resolvido pela própria CLI ao processar o texto da sua mensagem — é um mecanismo diferente do parâmetro programático que uma sessão como esta (rodando como agente) tem disponível. **Prático:** durante o hackathon, você (humano, digitando na sessão interativa) pode continuar usando `@agent-backend-developer` etc. normalmente — funciona pra você. Mas se pedir pra uma sessão em background/orquestradora "chamar" esses agentes especializados programaticamente, ela vai cair pro `general-purpose` genérico, não pro agente com o system prompt específico do VoltAgent. Não fingi que funcionou — troquei pra `general-purpose` com a persona instruída no prompt, e documentei aqui a diferença.

**Execução real do pipeline (com `general-purpose` fazendo o papel de cada especialista):**
1. **Teste primeiro** (papel test-automator): escreveu `formatCurrency.test.js` (8 casos) antes de qualquer implementação existir. Rodei `npm test` eu mesmo — falhou por `Cannot find module`, o vermelho certo (não erro de sintaxe no teste).
2. **Implementação** (papel backend-developer): escreveu `formatCurrency.js`. Rodei `npm test` eu mesmo (regra do CLAUDE.md — nunca aceitar "testes passando" de um subagente sem rodar de novo) — 8/8 verde, confirmado independentemente.
3. **Revisão adversarial** (papel code-reviewer): **encontrou um bug real**, não invenção — `formatCurrencyBRL` não tinha teto de magnitude; `Number.isInteger` só rejeita fração, não tamanho. `formatCurrencyBRL(1e25)` devolvia `"R$ 1.0.000.000.000.000.001e+23,64"` (string de moeda inválida, o `e+23` vazando pro output) e `formatCurrencyBRL(1e23)` devolvia um valor silenciosamente errado por perda de precisão de float. **Verifiquei eu mesmo rodando os dois casos no `node` antes de aceitar o achado** — reproduziu exatamente como reportado.
4. **Correção**: adicionei checagem `cents > Number.MAX_SAFE_INTEGER` (lança `TypeError`, mesmo padrão dos guards existentes) + 2 testes de regressão. Rodei `npm test` de novo — 10/10 verde.
5. **Scan de segurança** (papel security-auditor): sem achado explorável (input só aceita `number` primitivo com guards estritos, output só concatena dígitos — sem injeção, sem prototype pollution, regex não sofre catastrophic backtracking no tamanho máximo permitido). Verifiquei eu mesmo o caso de borda `-0` que o relatório citava (`f(-0)` → `"R$ 0,00"`, sem sinal de menos) — confirmado.
6. **Commit**: `1abb6bd` em `C:\hackaton\smoke-test` (repo git próprio, isolado do projeto real), mensagem documentando o achado da revisão.

**Cronômetro:** do `git init` até o commit final (teste→implementação→revisão→correção→segurança→commit, rodando os 3 subagentes em sequência): **~4min42s** de wall-clock. Não travou em nenhum passo. O gargalo real não foi execução — foi eu descobrir que `@agent-xxx` não resolve por essa ferramenta (achado acima), o que teria me feito perder mais tempo achando um agente inexistente se eu não tivesse testado antes de assumir.

**Kill switch (item 5 do plano): testado parcialmente, com limite honesto.** Não dá pra simular "fechar e reabrir o Claude Code" de dentro da própria sessão em execução — mesma limitação já registrada na Fase 1 pro teste de Agent Teams. O que confirmei: `~/.claude/settings.json` hoje só tem `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` no bloco `env` (a flag do CCR já foi removida nesta sessão), e os comandos do kill switch em `ROLLBACK.md` continuam batendo com o estado real da máquina (nenhuma variável `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` persistida fora de sessão). **Teste você mesmo antes do hackathon**: abra um terminal novo, rode `. .\scripts\use-claude.ps1`, confirme `claude` abre normal.

## FASE 5 — Front-end de alto padrão (2026-09-08)

- **shadcn/ui MCP instalado**: `npx shadcn@latest mcp init --client claude` → gravou `C:\hackaton\.mcp.json` (escopo de projeto, sem API key). Comando confirmado na doc oficial (`ui.shadcn.com/docs/mcp`), não no README de terceiro.
- **21st.dev Magic MCP: pendente.** Exige API key gerada logado em `21st.dev/mcp` (R3 — passo de navegador, não automatizo). Instruções em `MANUAL-STEPS.md` item 0b. Confirmei na doc oficial que chaves antigas do "Magic" foram resetadas — se você tinha uma, não serve mais.
- Baseline de stack e fontes de blocos com licença **verificada agora** (não copiada do prompt original sem checar): `FRONTEND-KIT.md`. Achado que corrige o prompt original: Velora UI é MIT e grátis por completo (confirmado), mas Launch UI só é "free and open-source forever" no tier básico (1 template/9 blocks) — o resto é pago (US$99/US$499), diferente do que uma leitura rápida sugeriria.
- `DESIGN-BRIEF.md` escrito como template a preencher por projeto (tokens, regra de motion, checklist de acessibilidade e Core Web Vitals).
- Teto de MCPs (R5): você desativou a maioria dos conectores pré-existentes (Canva, Figma, etc.) pelo `claude.ai/settings/connectors`, então instalar os 2 MCPs de frontend não estourou o teto na prática — segui em frente sem pedir de novo.

## CCR abandonado (2026-09-08)

O CCR (Fase 2b) corrompeu o `~/.claude/settings.json` global: a flag `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` adicionada pra integração com o gateway do CCR ficou com vírgula sobrando no bloco `env`, quebrando o parse do JSON inteiro (`Expected object, but received undefined` ao abrir o Claude Code). Corrigido removendo a vírgula e, na sequência, **removida a própria flag** — decisão do usuário de abandonar o CCR e ficar só no roteamento manual (`use-glm.ps1`/`use-claude.ps1`, já existentes desde a Fase 2, não dependem do CCR).

- Confirmado que o CCR não estava rodando (nenhum processo `node`, nada em `127.0.0.1:3456`/`3458`, nenhuma variável `ANTHROPIC_BASE_URL` persistida) — ou seja, o dano ficou restrito ao `settings.json`, já corrigido.
- `CLAUDE.md` atualizado: tabela de modelo por papel não menciona mais o CCR.
- Pacote npm `@musistudio/claude-code-router` **não foi desinstalado** (fica inerte, sem processo rodando) — comando de remoção completa já documentado em `ROLLBACK.md` (Fase 2b) se quiser tirar de vez.

## FASE 4 — Economia de tokens (2026-09-08)

### RTK (Rust Token Killer) — prioridade máxima da fase
- Verifiquei via API do GitHub (não chutei versão): release atual **v0.48.0**, binário Windows pré-compilado (`rtk-x86_64-pc-windows-msvc.zip`) — **não precisou instalar Rust/cargo**, contrariando a suposição do prompt original de que seria via `cargo install`.
- Instalado em `~\.local\bin\rtk.exe`, adicionado ao PATH do usuário.
- `rtk init -g --auto-patch` → hook registrado em `~/.claude/settings.json` (backup automático feito pelo próprio RTK + backup meu antes, ver `ROLLBACK.md`).
- Telemetria confirmada **desligada por padrão** (`rtk telemetry status` → `enabled: no`).
- **Escopo confirmado (documentar no CLAUDE.md do projeto):** o hook só reescreve chamadas da ferramenta Bash. `Read`/`Grep`/`Glob` nativos passam por fora — según a própria mensagem do `rtk init`.
- **Medição real (não estimativa de marketing):** testei `git status` num repo real (`C:\src\flutter`) — bruto 108 caracteres, via `rtk git status` 53 caracteres (~51% de redução). **Isso é um teste fraco** (repo limpo, sem ruído) — o ganho de verdade do RTK aparece em saída barulhenta (build falhando, `npm install` grande, etc.), não em comandos já curtos. Não vou fingir que 51% é o número esperado em geral.
- **Pendente:** o hook só ativa depois de reiniciar o Claude Code. Teste você mesmo depois de reabrir: rode qualquer comando via Bash e compare.

### Caveman
- Instalado via `npx skills add JuliusBrussee/caveman -g --agent claude-code` → foram trazidos **20 skills** relacionados (não só "caveman"): `caveman-compress`, `caveman-commit`, `caveman-discover`, `caveman-review`, `caveman-stats`, mais alguns extras do mesmo autor (`migration`, `safe-refactor`, `surgical-patch`, `verify-and-stop`).
- **Correção ao prompt original (R2):** não encontrei nenhuma evidência de um `caveman-shrink` (MCP middleware pra comprimir descrição de ferramentas MCP) no README real do repo. Ou esse componente não existe (mais provável) ou mudou de nome. Não instalei porque não achei o que instalar — não vou inventar.
- `caveman-compress` também precisa de sessão reiniciada pra aparecer na lista de skills disponíveis (mesma limitação do hook do RTK). Depois de reiniciar, rode `/caveman-compress CLAUDE.md` pra comprimir o `C:\hackaton\CLAUDE.md` que escrevi na Fase 3.

### Serena (busca semântica de código)
- Precisou do `uv` primeiro (não tínhamos) — instalei via `winget install astral-sh.uv` (binário, sem problema de UAC dessa vez).
- `uv tool install -p 3.13 serena-agent` → instalado (versão 1.7.0), 3 executáveis (`serena`, `serena-agent`, `serena-hooks`).
- Registrado como MCP server: `claude mcp add --scope user serena -- serena start-mcp-server --context claude-code --project-from-cwd` (escopo usuário — funciona em qualquer projeto).
- **Aviso do teto de MCPs (R5):** isso é o **8º MCP ativo** nesta conta (já existiam 7 pré-configurados da plataforma: Vercel, Supabase, Figma, Canva, Google Drive/Calendar/Gmail — não fui eu que instalei esses). A Fase 5 pede mais 2 MCPs de frontend (shadcn + 21st.dev) — isso estouraria o teto. Vou perguntar antes de instalar, como manda o R5.
- Como o prompt original já avisava: o ganho do Serena só aparece em repo médio/grande — o repo do hackathon ainda nem existe, não espere diferença ainda.

### Output style conciso
- `outputStyle: "Concise"` aplicado em `~/.claude/settings.json` — confirmei que existe nativamente na doc oficial antes de configurar (não é custom). Já está ativo nesta sessão.

### Instrumentação / dashboard
- **Não instalei** o dashboard de analytics do `claude-code-templates` nem configurei statusline customizada ainda — não é bloqueador, mas ficou pendente. Aviso no checkpoint.

## FASE 3 — Time de agentes especialistas (2026-09-08)

Avaliei as fontes sugeridas no prompt original (VoltAgent, wshobson/agents, everything-claude-code, metaswarm, spec-kit, claude-code-templates, Vibe Kanban) via `WebFetch` direto nos READMEs reais — não confiei em resumo de busca. Ambas VoltAgent e wshobson/agents são repositórios reais e ativos, com instalação via marketplace de plugin do próprio Claude Code (`claude plugin marketplace add` / `claude plugin install`, comandos oficiais confirmados via `claude plugin --help`).

**Fonte escolhida: VoltAgent/awesome-claude-code-subagents (fonte única).** Justificativa em uma linha: mapeia 1:1 pros 8 papéis pedidos com nomes exatos (`security-auditor.md`, `code-reviewer.md`, `debugger.md`, etc.), e você pediu explicitamente por ele durante a sessão.

**Desvio do teto de 12 agentes do prompt original — decisão sua, registrada aqui:** minha primeira tentativa foi copiar só 8 arquivos hand-picked (um por papel) pra `~/.claude/agents/`, respeitando o teto. Você pediu pra explorar mais o catálogo ("analise toda database do volt agent... tem muuuittooos ótimos agentes"), então troquei pra instalar os **plugins de categoria inteiros** via `claude plugin install`:

- `voltagent-core-dev` (11 agentes) — backend, frontend, fullstack, mobile, API
- `voltagent-qa-sec` (17 agentes) — testes, segurança, code review, debugging
- `voltagent-meta` (11 agentes) — orquestração multi-agente
- `voltagent-dev-exp` (16 agentes) — tooling, docs, DX
- `voltagent-infra` (16 agentes) — deploy, cloud, DevOps

**Total: 71 agentes ativos**, escopo de usuário (`~/.claude/agents/` via plugin, disponíveis em qualquer projeto). Isso é bem acima do teto de 12 do prompt original — decisão consciente sua, não minha. Trade-off real: mais especialistas disponíveis = mais chance do Claude escolher automaticamente um agente certo pra tarefas de nicho, mas também mais itens no autocomplete de `@-mention` e mais superfície pra confusão se dois agentes tiverem escopo parecido. Categorias deixadas de fora (menos relevantes pro hackathon web+mobile): language-specialists (granular demais), data-ai/ML, specialized-domains (blockchain/fintech/gaming), business-product, research-analysis. Pra instalar alguma dessas: `claude plugin install voltagent-<nome>@voltagent-subagents`.

Marketplace `wshobson/agents` (claude-code-workflows) ficou **registrado mas sem nenhum plugin instalado** — mantive como opção de reserva caso queira agentes específicos de lá depois (ex.: `agent-teams` plugin, que integra literalmente com a Fase 1). Remover: `claude plugin marketplace remove claude-code-workflows`.

`CLAUDE.md` template escrito em `C:\hackaton\CLAUDE.md` — papéis mapeados pros agentes reais instalados, pipeline Pesquisa→Plano→Executa→Revisa→Ship com gates de teste/segurança, regra de validação independente do orquestrador, e modelo por papel amarrado às rotas da Fase 2.

**Nota de honestidade:** os agentes do VoltAgent usam `model: inherit` no frontmatter — não têm modelo fixo por papel como o wshobson tinha (que eu tinha escolhido originalmente por causa disso, antes de você pedir VoltAgent). Documentei essa diferença no `CLAUDE.md` em vez de fingir que existe um mapeamento automático que não existe.

## FASE 2b — Claude Code Router (CCR) instalado (2026-09-08)

- `npm install -g @musistudio/claude-code-router` → **102 pacotes, sem erro fatal** (só um aviso de `better-sqlite3` sobre scripts de instalação não cobertos por `allowScripts` — não travou nada, o binário prebuilt foi baixado normalmente).
- **Descoberta importante (R2 — não confiei em resumo de terceiros):** o CCR mudou de arquitetura desde a versão que o prompt original descrevia. Não existe mais `~/.claude-code-router/config.json` editável à mão nem comando `ccr code`. A versão atual (instalada, li o `README.md` real do pacote):
  - Guarda config em `config.sqlite` dentro de `%APPDATA%\claude-code-router` (Windows).
  - Configuração é feita pela **UI web local** (`ccr ui`), não por JSON.
  - Tem "Agent Profiles" com lançamento via `ccr <profile-name-or-id> [cli|app]`.
  - Suporta múltiplos agentes além do Claude Code: Codex, Grok CLI, Kimi CLI, Pi, ZCode.
- Iniciei o serviço em background: `ccr start --no-open` → rodando como processo `node` PID 15900, gateway em `http://127.0.0.1:3456`, UI de gerenciamento em `http://127.0.0.1:3458`.
- **O resto da configuração (adicionar o provedor Z.ai, colar a chave, criar chave de cliente do CCR, configurar rotas) precisa de clique em navegador — fui explícito sobre isso no `MANUAL-STEPS.md` item 0, passo a passo completo, em vez de inventar uma API não documentada pra automatizar isso.**

## FASE 2 — Rota direta de fallback: GLM-5.3 (Z.ai) (2026-09-08)

Você forneceu uma chave da Z.ai (GLM-5.3). Antes de configurar, confirmei na doc oficial (`docs.z.ai/devpack/tool/claude`):

- **Endpoint compatível com Anthropic:** `https://api.z.ai/api/anthropic`
- **Model IDs:** `glm-5.3` (mapeia pra Sonnet/Opus), `glm-5.3-flash` (mapeia pro Haiku)
- Variável de autenticação: `ANTHROPIC_AUTH_TOKEN` (não `ANTHROPIC_API_KEY` — ver armadilha #1 abaixo)

**Nota de honestidade (R2):** o prompt original classificava GLM-5.3 como plano pago (~US$10/mês) e só o GLM-4.7-Flash como gratuito. Você disse ter conseguido a chave "de forma gratuita" — não tenho como confirmar se isso é um trial/crédito promocional ou um mal-entendido sobre qual modelo o plano grátis cobre. **Teste você mesmo** (`. .\scripts\use-glm.ps1` → abrir `claude` → `/status` → mandar uma mensagem) e veja se o `glm-5.3` responde ou se cai pra `glm-5.3-flash`/erro de créditos. Se dar 402/403, o mais provável é que a chave só cubra o tier flash gratuito, não o 5.3 completo — nesse caso ajuste `ANTHROPIC_DEFAULT_SONNET_MODEL` pra `glm-5.3-flash` no script.

**A chave em si NUNCA foi escrita em nenhum arquivo.** Guardada só como variável de ambiente de usuário `GLM_API_KEY` (`[System.Environment]::SetEnvironmentVariable`, escopo User — persiste entre sessões, mas não é visível em texto em nenhum arquivo do projeto).

Scripts criados em `C:\hackaton\scripts\`:
- `use-glm.ps1` — troca a sessão atual de terminal pra rodar via GLM-5.3. Primeiro passo dele é remover `ANTHROPIC_API_KEY` do processo (**armadilha #1 do prompt original, confirmada como real**: se essa variável sobrar setada, ela sobrescreve `ANTHROPIC_AUTH_TOKEN` em silêncio e cobra na sua conta Anthropic em vez de usar a Z.ai).
- `use-claude.ps1` — volta pro Claude Code padrão (sua assinatura Pro).
- Uso: rode com "dot-sourcing" (`. .\scripts\use-glm.ps1`, com o ponto na frente) pra afetar a sessão de terminal atual — sem o ponto, as variáveis somem quando o script termina.

**Ainda não instalei o Claude Code Router (CCR)** — isso é uma peça maior (proxy separado, `~/.claude-code-router/config.json`, comando `ccr code`) só necessária se você quiser roteamento automático por *tipo* de tarefa (background/default/think/longContext) em vez de trocar manualmente com os scripts acima. Como você só tem uma chave alternativa configurada até agora (GLM-5.3), o roteamento manual via scripts já cobre "quando acabar os tokens, uso o GLM" — que foi seu pedido. Te pergunto adiante se quer o CCR completo também.

## FASE 1 — Agent Teams (2026-09-08)

- Confirmado na doc oficial (`code.claude.com/docs/en/agent-teams`, versão referenciada v2.1.178+): a flag é `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, exatamente como você supôs no prompt original.
- **Correção ao prompt original:** a doc **não confirma** que cada teammate ganha automaticamente seu próprio git worktree. Isso é um padrão *manual* separado ("Git worktrees" nos "Next steps" da doc), não parte automática do Agent Teams. Não presuma worktree-por-teammate sem pedir explicitamente.
- Backup do settings.json original: `C:\Users\Juliano\.claude\settings.json.bak-1788830758`.
- Flag aplicada em `~/.claude/settings.json`:
  ```json
  { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
  ```
- **Não testei spawnar um time de verdade nesta sessão** porque a doc é explícita: *"Spawning teammates also requires an interactive session. In non-interactive mode... Claude doesn't spawn teammates."* Esta sessão roda como job em background — não é o modo interativo que o Agent Teams exige. **Teste isso você mesmo num terminal interativo** antes do hackathon: abra o Claude Code normalmente e peça "spawn 2 teammates to build a hello world with a test", confirme que aparecem no painel de agentes.
- Limitações oficiais registradas (relevantes pro hackathon):
  - Sem retomada de sessão: `/resume`/`/rewind` não restauram teammates in-process — se você fechar o terminal no meio, perde o time.
  - Custo de token escala linearmente por teammate — mais caro que um single-session ou subagents.
  - Status de task pode atrasar (teammate esquece de marcar como completo) — cheque manualmente se algo parece travado.
  - Shutdown pode ser lento (teammate termina o turno atual antes de encerrar).
  - Um time por sessão, sem times aninhados (teammate não spawna outro teammate).
  - Modo split-pane (tmux/iTerm2) não funciona no terminal integrado do VS Code nem no Windows Terminal — nesta máquina Windows, o modo padrão `in-process` é o único disponível mesmo, o que já é o padrão de qualquer forma.

## FASE 0 — Diagnóstico (2026-09-08)

### Sistema
- SO: Windows 11 Pro, build 10.0.26200 (NT 10.0.26200.0)
- Arquitetura: AMD64
- Shell: PowerShell 5.1 (build 26100.8457)
- Execution Policy: LocalMachine=RemoteSigned, Process=Bypass — ok para rodar scripts locais
- `C:\hackaton` não é repositório git, está vazio

### Ferramentas — RESULTADO CRÍTICO
| Ferramenta | Status |
|---|---|
| `claude` (Claude Code CLI) | ✅ 2.1.263 |
| `winget` | ✅ v1.29.290 |
| `node` | ❌ NÃO ENCONTRADO |
| `npm` | ❌ NÃO ENCONTRADO |
| `bun` | ❌ NÃO ENCONTRADO |
| `pnpm` | ❌ NÃO ENCONTRADO |
| `git` | ❌ NÃO ENCONTRADO |
| `cargo`/`rustc` | ❌ NÃO ENCONTRADO |
| `brew` | ❌ NÃO ENCONTRADO (esperado — é ferramenta de macOS/Linux, não existe nativamente no Windows) |

**Isso é um bloqueador para quase todo o plano.** Sem Node/npm não dá para instalar Claude Code Router, MCPs de front-end, `npx shadcn`, nem `claude-code-templates`. Sem git não existem worktrees (Fase 1 inteira depende disso), nem commits, nem o pipeline de Fase 6. Sem cargo/brew, a instalação recomendada do RTK (Fase 4) não tem caminho direto no Windows sem passos extras.

### `~/.claude/`
- Existe: `C:\Users\Juliano\.claude\`
- `settings.json` atual (será copiado antes de qualquer alteração, conforme R1):
  ```json
  {
    "autoUpdatesChannel": "latest",
    "theme": "dark",
    "agentPushNotifEnabled": true
  }
  ```
- Nenhuma flag experimental, nenhum roteador, nenhum MCP configurado ainda — base limpa.

### Chaves de API no ambiente
- Nenhuma variável de ambiente correspondente a ANTHROPIC/OPENROUTER/ZAI/ZHIPU/GLM/GROQ/CEREBRAS/MOONSHOT/KIMI/DASHSCOPE/DEEPSEEK/QWEN/NVIDIA/GOOGLE_AI/GEMINI foi encontrada.
- Ou seja: hoje, sem instalar nada, o único caminho de execução é o Claude Code padrão (sua assinatura Pro).

## Plano adaptado às Fases seguintes

Isto muda a ordem prática das próximas fases, mas nenhuma regra é violada — R2/R3 já previam exatamente esta situação (não chutar comando de instalação, e transformar em passo manual quando exigir decisão minha ou não puder ser automatizado). O que muda é que preciso da sua decisão sobre **como instalar Node e Git** antes de tocar em qualquer fase, porque tudo depende disso.

Duas rotas possíveis para Node + Git, ambas não destrutivas e reversíveis via `winget uninstall`:
1. **Via `winget`** (não interativo, sem login/cartão) — eu mesmo rodo `winget install Git.Git` e `winget install OpenJS.NodeJS.LTS`, documento em `ROLLBACK.md` como desinstalar.
2. **Manual** — viraria item no `MANUAL-STEPS.md` com o link oficial, e eu espero você instalar.

Dado que winget está disponível e a instalação é padrão/reversível, minha recomendação é a rota 1 — mas por ser uma mudança de sistema (fora da pasta do projeto) eu quero seu OK explícito antes, em vez de assumir.

**Decisão do usuário:** instalar via winget agora. ✅ Feito.

## Instalação Node + Git (winget)

- `winget install --id Git.Git -e` → **Git 2.55.0.3** instalado com sucesso.
- `winget install --id OpenJS.NodeJS.LTS -e` → **Node.js LTS 24.19.0** (npm 11.17.0) instalado com sucesso.
- Rollback: ver `ROLLBACK.md`.

**Quirk descoberto:** depois da instalação, o processo PowerShell já em execução nesta sessão de background não recarrega o `PATH` do registro automaticamente (o harness reusa um processo pai com env "congelado"). `node`/`npm`/`git` não apareciam até eu rodar:
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
```
Isso é necessário apenas dentro desta sessão de background já aberta. **Um terminal novo (ou reabrir o Claude Code) já vê `node`/`npm`/`git` normalmente sem esse truque** — confirmado que as variáveis de ambiente do Windows foram persistidas corretamente pelo instalador (é só o processo já em memória que ficou com o `PATH` antigo em cache).

## Ambiente React + Flutter (pedido adicional, 2026-09-08)

Você pediu para instalar tudo que falta para um ambiente "perfeito" de React e Flutter. Diagnóstico prévio: nada disso existia na máquina (nem VS Code, nem Java, nem Flutter, nem Android Studio/SDK). Perguntei quais alvos de Flutter importavam — você escolheu **Android + Web + Windows Desktop**, os três.

### O que foi instalado

| Componente | Como | Resultado |
|---|---|---|
| **VS Code** | `winget install Microsoft.VisualStudioCode` | ✅ 1.136.1 |
| **Visual Studio 2022 Community** + workload `Microsoft.VisualStudio.Workload.NativeDesktop` (C++ Desktop, exigido pelo alvo Windows do Flutter) | `winget install Microsoft.VisualStudio.2022.Community --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.NativeDesktop --includeRecommended"` | ✅ 17.14.39, confirmado pelo `flutter doctor` |
| **Flutter SDK (stable)** | `git clone https://github.com/flutter/flutter.git -b stable` em `C:\src\flutter` (caminho curto, sem espaços — recomendação oficial) | ✅ Flutter 3.47.2 |
| **JDK 17** (Microsoft Build of OpenJDK) | `winget install Microsoft.OpenJDK.17` | ✅ 17.0.20.101, em `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` |
| **Android SDK cmdline-tools** | download direto de `dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip` (confirmado via busca — a doc do Android não expõe link estático fixo) + extração manual no layout `cmdline-tools\latest` | ✅ |
| **Android SDK: platform-tools, platforms;android-36, build-tools;36.0.0, emulator, system-images;android-36;google_apis;x86_64** | `sdkmanager.bat` (licenças aceitas via redirecionamento de stdin, ver armadilha abaixo) | ✅ |
| **Android Studio (IDE)** | ver armadilha do UAC abaixo | ⏳ instalando via caminho alternativo no momento em que este log foi escrito — confirme o resultado mais abaixo/no MANUAL-STEPS.md se ainda pendente |
| **Extensões VS Code** | `code --install-extension ...` | ✅ ESLint, Prettier, Tailwind CSS IntelliSense, Flutter, Dart, TypeScript Next |

`flutter doctor -v` final: **"No issues found!"** — Flutter, Windows, Android toolchain (SDK 36.0.0), Chrome (web), Visual Studio 2022 (desktop) e dispositivos conectados (Windows desktop + Chrome) todos ✅.

### Atualização: o Android Studio (IDE) NÃO foi instalado — bloqueio real, não só lento

Depois de mais de 1h tentando (duas tentativas, incluindo a rota `/S /D=` fora do Program Files), descobri a causa raiz: o **primeiro** `consent.exe` (da tentativa 1, no caminho padrão Program Files) nunca morreu de verdade. `Stop-Process -Force` retornou sem erro mas não matou o processo (falha silenciosa — sem privilégio suficiente pra terminar um processo do UAC rodando na Secure Desktop). Esse zumbi ficou preso a sessão inteira, e o Windows só permite **um** prompt de UAC na secure desktop por vez — então toda tentativa seguinte de elevação (mesmo instalando fora do Program Files, que teoricamente não devia pedir UAC) ficou enfileirada atrás dele pra sempre. Confirmei isso medindo o processo da 2ª tentativa: rodando havia 30+ minutos mas com só **3 segundos de CPU total** — ou seja, parado, não lento.

`taskkill /F /PID <consent>` também deu "Acesso negado". **Esse é um limite real desta sessão em background, não um bug meu**: não existe jeito de matar ou responder um diálogo de UAC preso na secure desktop sem um humano fisicamente na máquina.

**Conclusão prática: o Android Studio (a IDE gráfica) não foi instalado, e não dá pra automatizar isso de dentro de uma sessão sem tela.** Isso está OK — `flutter doctor -v` já confirmou "No issues found!" usando só o SDK via linha de comando (cmdline-tools + sdkmanager, que instalamos com sucesso). A IDE é conveniência (emulador visual, autocomplete Java/Kotlin), não requisito. Instruções pra você instalar manualmente ficaram no `MANUAL-STEPS.md`.

### Armadilha grave: UAC trava instaladores EXE em sessão não-interativa

Esta é a descoberta mais importante da sessão, guarde para o hackathon:

- Instaladores **MSI** (Git, Node, JDK) e o bootstrapper do **Visual Studio 2022** conseguem se auto-elevar sem travar (usam o serviço Windows Installer / mecanismo próprio de elevação silenciosa do VS, feito de propósito para instalação desatendida/CI).
- O instalador **EXE (NSIS)** do **Android Studio**, quando instalado no caminho padrão (`Program Files`, via `winget install Google.AndroidStudio --silent`), dispara um **prompt real de UAC** (`consent.exe`) que fica esperando um clique humano. Numa sessão em background (como esta), **isso trava para sempre** — não há timeout automático que resolva sozinho em minutos razoáveis (ficou preso mais de 25 minutos até eu matar o processo manualmente).
- **Solução que funcionou:** baixar o instalador `.exe` diretamente (URL fica no log do `winget install --silent`, campo "Downloading") e rodar com flags do NSIS `/S /D=<caminho sem espaços>` apontando para uma pasta **fora de Program Files** (ex.: `C:\dev\AndroidStudio`) que o usuário já tem permissão de escrita. Instalação por-usuário não precisa de UAC, então nunca dispara o `consent.exe`.
- **Se isso acontecer de novo durante o hackathon:** rode `Get-Process consent -ErrorAction SilentlyContinue` para confirmar o travamento, mate o processo do instalador (não dá pra matar o `consent.exe` de uma sessão sem privilégio, mas matar o processo "pai" que pediu elevação libera a fila), e reinstale apontando para uma pasta de usuário com `/S /D=`.

### Variáveis de ambiente persistidas (User scope)

- `JAVA_HOME` → `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot`
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` → `C:\Users\Juliano\AppData\Local\Android\Sdk`
- `PATH` (usuário) ganhou: `C:\src\flutter\bin`, `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\cmdline-tools\latest\bin`, `%ANDROID_HOME%\emulator`
- **Um terminal novo já enxerga tudo isso.** Nesta sessão de background eu precisei reconstruir `$env:PATH`/setar as vars manualmente em cada comando pelo mesmo motivo do quirk do Node/Git acima.
