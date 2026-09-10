# ROLLBACK — como desfazer cada peça

Regra geral (R1): nada aqui foi feito sem estar reversível. Cada item abaixo tem o comando exato de desfazer.

## Kill switch de 10 segundos (volta pro Claude Code puro)

Se qualquer coisa das fases seguintes (roteador multi-modelo, Agent Teams, MCPs) quebrar durante o hackathon, isto sozinho já te devolve o Claude Code padrão funcionando — ou simplesmente rode `. .\scripts\use-claude.ps1`:

```powershell
Remove-Item Env:\CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_DEFAULT_SONNET_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_DEFAULT_OPUS_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_DEFAULT_HAIKU_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ENABLE_TOOL_SEARCH -ErrorAction SilentlyContinue
```

Isso é atualizado conforme as fases seguintes adicionam mais variáveis — este arquivo será mantido.

## Fase 2 — Rota direta GLM-5.3 (Z.ai)

```powershell
# Remove a chave salva como variavel de ambiente persistente
[System.Environment]::SetEnvironmentVariable('GLM_API_KEY', $null, 'User')
# Apaga os scripts de troca de modelo
Remove-Item "C:\hackaton\scripts\use-glm.ps1"
Remove-Item "C:\hackaton\scripts\use-claude.ps1"
```
Pra sair do modo GLM numa sessão de terminal já aberta sem apagar nada: `. .\scripts\use-claude.ps1`

## Fase 2b — Claude Code Router (CCR)

```powershell
# Para o servico em background
ccr stop

# Desinstala o pacote
npm uninstall -g @musistudio/claude-code-router

# Remove config/dados locais (chaves de provedor cadastradas na UI ficam aqui)
Remove-Item -Recurse -Force "$env:APPDATA\claude-code-router"
```
Desinstalar o pacote NÃO apaga a config/dados automaticamente (aviso do próprio README) — se for remover de vez, rode as duas linhas.

## Fase 3 — Time de agentes (VoltAgent)

```powershell
# Remove os 5 plugins instalados (71 agentes)
claude plugin uninstall voltagent-core-dev
claude plugin uninstall voltagent-qa-sec
claude plugin uninstall voltagent-meta
claude plugin uninstall voltagent-dev-exp
claude plugin uninstall voltagent-infra

# Remove os marketplaces registrados (opcional, sem efeito se nenhum plugin estiver instalado)
claude plugin marketplace remove voltagent-subagents
claude plugin marketplace remove claude-code-workflows
```
Pra reduzir sem remover tudo: desinstale só os plugins de categoria que não estão sendo usados (ex.: `voltagent-infra` se não precisar de deploy/cloud).

## Fase 4 — RTK, Caveman, Serena, output style

```powershell
# RTK: remove o hook e os artefatos
rtk init -g --uninstall
Remove-Item "$env:USERPROFILE\.local\bin\rtk.exe"

# Caveman: lista e remove skills instalados globalmente
npx skills ls -g
npx skills rm --global caveman

# Serena
claude mcp remove serena
uv tool uninstall serena-agent

# Output style: volta ao Default
# Edite ~/.claude/settings.json e remova a linha "outputStyle": "Concise"
```
Backup do settings.json antes do RTK: `C:\Users\Juliano\.claude\settings.json.bak-1788832349` (e o próprio RTK fez outro em `settings.json.bak`).

## Fase 1 — Agent Teams

Backup do settings.json original (antes de qualquer flag): `C:\Users\Juliano\.claude\settings.json.bak-1788830758`

Pra desligar só o Agent Teams sem tocar em mais nada:
```powershell
# Restaura o settings.json inteiro ao estado pré-Fase 1:
Copy-Item "$env:USERPROFILE\.claude\settings.json.bak-1788830758" "$env:USERPROFILE\.claude\settings.json" -Force
```
Ou edite `~/.claude/settings.json` e remova o bloco `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }` manualmente (mais seguro se você já tiver adicionado outras configs no meio tempo — não use o restore acima nesse caso, ele reverteria tudo).

## Ambiente base (Node, Git)

```powershell
winget uninstall --id Git.Git -e
winget uninstall --id OpenJS.NodeJS.LTS -e
```

## Ambiente React + Flutter

```powershell
winget uninstall --id Microsoft.VisualStudioCode -e
winget uninstall --id Microsoft.VisualStudio.2022.Community -e
winget uninstall --id Microsoft.OpenJDK.17 -e

# Flutter SDK (não tem "instalador" — é só uma pasta)
Remove-Item -Recurse -Force "C:\src\flutter"

# Android SDK (cmdline-tools, platform-tools, emulator, imagens de sistema)
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Android\Sdk"

# Android Studio (se foi instalado no caminho alternativo fora do Program Files)
Remove-Item -Recurse -Force "C:\dev\AndroidStudio"
# Se por acaso ficou em Program Files (instalação padrão via winget bem-sucedida):
winget uninstall --id Google.AndroidStudio -e

# Variáveis de ambiente persistentes (User scope) adicionadas
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', $null, 'User')
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $null, 'User')
[System.Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $null, 'User')
# PATH: precisa editar manualmente removendo as entradas de C:\src\flutter\bin,
# %ANDROID_HOME%\platform-tools, %ANDROID_HOME%\cmdline-tools\latest\bin, %ANDROID_HOME%\emulator
# (não dá pra automatizar com segurança porque o PATH do usuário pode ter outras entradas
#  suas no meio — abra "Editar variáveis de ambiente da conta" e remova as 4 linhas à mão)
```

## Extensões VS Code

```powershell
code --uninstall-extension dbaeumer.vscode-eslint
code --uninstall-extension esbenp.prettier-vscode
code --uninstall-extension bradlc.vscode-tailwindcss
code --uninstall-extension Dart-Code.flutter
code --uninstall-extension Dart-Code.dart-code
code --uninstall-extension ms-vscode.vscode-typescript-next
```

## Backup do settings.json original

Ainda não foi necessário tocar em `~/.claude/settings.json` (nenhuma flag experimental configurada até agora). Quando a Fase 1 (Agent Teams) mexer nele, o backup será criado ANTES com:
```powershell
Copy-Item "$env:USERPROFILE\.claude\settings.json" "$env:USERPROFILE\.claude\settings.json.bak-$(Get-Date -UFormat %s)"
```
e o caminho exato do backup será registrado aqui.

---
*Este arquivo será atualizado a cada fase subsequente do bootstrap (roteador multi-modelo, agentes, RTK, etc.) com o rollback específico de cada peça.*
