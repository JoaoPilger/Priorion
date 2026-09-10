# RISCOS — o que provavelmente vai quebrar e o que fazer

## `@agent-nome` só funciona quando VOCÊ digita, não quando um agente tenta chamar outro programaticamente

**Confirmado na Fase 6 (smoke test):** os 71 agentes do VoltAgent (e os do wshobson/agents) mapeados no `CLAUDE.md` — `@agent-backend-developer`, `@agent-test-automator`, `@agent-code-reviewer`, `@agent-security-auditor`, etc. — funcionam quando você (humano) digita `@agent-nome` numa mensagem na sessão interativa normal. **Mas uma sessão rodando como agente (orquestrador em background, ou um subagente tentando invocar outro programaticamente) não consegue chamar esses nomes** — testei e a ferramenta retornou `Agent type 'test-automator' not found. Available agents: claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup`.

**O que isso significa na prática pro hackathon:**
- Você mesmo, digitando `@agent-backend-developer implementa X` numa sessão normal: funciona, sem problema.
- Pedir "monte um time e chame os agentes certos pra cada etapa" numa sessão que já está rodando autônoma/em background: ela vai cair pro agente genérico (`general-purpose`) com uma persona instruída no prompt, não pro agente real com o system prompt específico do VoltAgent — que é um resultado mais fraco (menos foco de domínio) do que o catálogo promete.
- **Se notar isso acontecendo, não é bug seu**: é o formato de chamada disponível pra essa sessão. Ou você assume o papel manual (`@agent-nome` na conversa), ou aceita `general-purpose` com persona no prompt como fallback.

## ⚠️ Esta máquina tem só 7,4 GB de RAM — risco real pro hackathon

Confirmado durante o setup: com Chrome (múltiplas abas/janelas), VS Code, VS2022, Windows Defender e o próprio Claude Code rodando, a máquina já opera com ~2 GB livres. Durante a instalação, dois downloads grandes rodando **ao mesmo tempo** (Android Studio + imagem de sistema do emulador) foram **mortos pelo sistema por falta de memória**. Precisei rodar de novo um de cada vez.

**Isso é o risco mais concreto pro hackathon, mais que qualquer coisa da stack agêntica:**
- **Não rode o emulador Android e o Chrome com muitas abas ao mesmo tempo.** Emulador Android sozinho já costuma pedir 2-4 GB.
- **Feche abas/janelas do Chrome que não estão em uso** antes de builds pesados (Gradle, `flutter run`, `npm install` grandes).
- Se for compilar pro Android durante a demo, **teste com o emulador fechado e um celular físico via USB** como plano B — consome muito menos RAM do lado do PC.
- Se sentir o PC travando: primeiro suspeito é falta de memória, não bug de código. `Get-Process | Sort WorkingSet64 -Descending | Select -First 10` mostra quem está consumindo.

## Ambiente de desenvolvimento (React + Flutter)

### 1. Instaladores EXE (não-MSI) travam se pedirem UAC numa sessão sem tela
**Sintoma:** um `winget install` fica "rodando" para sempre sem terminar.
**Causa confirmada nesta sessão:** o instalador do Android Studio é NSIS/EXE e dispara um prompt real de UAC (`consent.exe`) que ninguém está ali pra clicar.
**O que fazer:** `Get-Process consent -ErrorAction SilentlyContinue` confirma o travamento. Mate o processo do instalador (não o `consent.exe` — na prática não deu pra matar ele mesmo com `taskkill /F`, "Acesso negado", porque roda na Secure Desktop com privilégio que uma sessão sem tela não tem).

**Resultado real desta sessão: o Android Studio (IDE) não foi instalado por causa disso** — um `consent.exe` zumbi da primeira tentativa ficou preso a sessão inteira inteira e bloqueou toda tentativa de elevação seguinte (Windows só permite um prompt de UAC por vez). Isso não é "vai travar de novo talvez" — **já aconteceu e não tem workaround de dentro de uma sessão sem tela**. Se isso se repetir: só um humano fisicamente na máquina resolve, clicando "Sim". Passo a passo de instalação manual está no `MANUAL-STEPS.md` item 4. **Não bloqueia o desenvolvimento** — `flutter doctor` já confirma tudo certo só com o SDK via linha de comando.

### 2. `$env:PATH` desatualizado em terminais já abertos
**Sintoma:** você instala algo (via winget, ou este próprio setup instalou Node/Git/Flutter/Android SDK) e o comando "não existe" mesmo depois de instalado.
**Causa:** o Windows só propaga o PATH atualizado do registro pra processos NOVOS. Um terminal/sessão já aberta fica com o PATH antigo em cache.
**O que fazer:** abra um terminal novo. Se estiver preso numa sessão que não pode reabrir, rode:
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
```

### 3. `flutter doctor` reclamando de emulador Android
O AVD (dispositivo virtual) foi criado com uma imagem `google_apis` genérica de API 36 x86_64. Se a máquina não tiver virtualização habilitada na BIOS (Hyper-V/HAXM), o emulador pode não bootar. **Teste isso ANTES do hackathon começar**, não durante — rode `flutter emulators` e depois `flutter emulators --launch <id>`. Se travar, use um celular físico com depuração USB habilitada como plano B (mais confiável que emulador em notebook fraco).

### 4. Antivírus/Windows Defender pode ficar escaneando builds do Gradle/Flutter
Primeiro `flutter build` ou `flutter run` para Android costuma ser lento (Gradle baixando dependências + Defender escaneando cada arquivo). Não é bug, é normal — mas se acontecer bem na hora de fazer demo, já rode um build de teste hoje à noite pra "esquentar" o cache.

## Da stack agêntica (fases seguintes do bootstrap)

*(Esta seção será preenchida conforme as Fases 1-6 do prompt original forem executadas — Agent Teams, roteador multi-modelo, agentes especialistas, RTK, front-end kit.)*

- **Roteamento multi-modelo:** se `ANTHROPIC_API_KEY` estiver setada no ambiente junto com `ANTHROPIC_AUTH_TOKEN` de outro provedor, a Anthropic é cobrada em silêncio. Sempre `echo $env:ANTHROPIC_API_KEY` antes de trocar de modelo.
- **429 em provedor alternativo:** normalmente significa saldo zerado, não limite de taxa — não adianta esperar e tentar de novo.
- **Agent Teams:** teammates em andamento não retomam sessão se você fechar o terminal no meio. Não fecha o Claude Code com um time no meio de uma tarefa importante.
