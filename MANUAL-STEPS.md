# MANUAL STEPS — o que só você pode fazer

## -1. Desconectar Canva e Figma (você pediu, não dá via CLI)

`claude mcp remove` só gerencia servidores configurados localmente (hoje só o `serena`). Canva/Figma/Vercel/Supabase/Google Drive/Calendar/Gmail são conectores da sua conta claude.ai, geridos pelo navegador:
1. Abra https://claude.ai/settings/connectors (ou Settings → Connectors, dentro do claude.ai).
2. Ache **Canva** e **Figma** na lista e desconecte cada um.
3. Depois de desconectar, rode `claude mcp list` aqui de novo — devem sumir e abrir espaço pros MCPs de frontend da Fase 5 (shadcn + 21st.dev) sem estourar o teto de 8.


## 0. ~~Configurar o Claude Code Router (CCR)~~ — abandonado

**Decisão sua (2026-09-08): não usar mais o CCR.** Ele corrompeu o `~/.claude/settings.json` global (vírgula sobrando deixada por uma flag ligada à integração com o gateway do CCR, quebrou o parse do JSON inteiro e travou o Claude Code). Já corrigi o `settings.json` e removi a flag. O roteamento pra GLM-5.3 continua funcionando só pelos scripts manuais (`use-glm.ps1`/`use-claude.ps1`, item 1 abaixo) — sem proxy intermediário. Detalhes em `SETUP-LOG.md`.

O processo do CCR **não está mais rodando** (confirmado: nenhum `node` ativo, nada em `127.0.0.1:3456`/`3458`). Se quiser tirar o pacote da máquina de vez, o comando está em `ROLLBACK.md` (Fase 2b) — não fiz isso sozinho porque é uma remoção de instalação, e você não pediu explicitamente.

## 0b. ~~Gerar chave da 21st.dev Magic MCP~~ — feito (2026-09-08)

Você gerou a chave em https://21st.dev/mcp e eu registrei: `claude mcp add --transport http 21st https://21st.dev/api/mcp --header "x-api-key: ..."` — confirmado `✔ Connected` em `claude mcp list`. Foi pra config local (`~/.claude.json`, escopo por projeto), **não** pro `.mcp.json` versionado — a chave não está em nenhum arquivo do git.

**Nota de segurança:** a chave passou em texto puro por este chat (que fica salvo em log) e pelo histórico do terminal desta sessão. Risco baixo (é só API key de componentes de UI, não financeira), mas se quiser zerar essa exposição, revogue essa chave em `21st.dev/mcp` e gere outra, depois rode o mesmo comando `claude mcp add` de novo com a nova chave (ele sobrescreve o registro existente).

## 1. Testar se a chave GLM-5.3 realmente cobre o modelo 5.3 (não só o flash grátis)

1. Abra um terminal **novo** (pra pegar as variáveis de ambiente atualizadas).
2. `cd C:\hackaton`
3. `. .\scripts\use-glm.ps1` (com o ponto na frente!)
4. Rode `claude` normalmente e, dentro da sessão, digite `/status` — confirme que aparece `api.z.ai` como base URL.
5. Mande uma mensagem qualquer. Se dar erro 402/403/"insufficient balance", a chave provavelmente só cobre o tier gratuito (`glm-5.3-flash`). Nesse caso, edite `C:\hackaton\scripts\use-glm.ps1` e troque `ANTHROPIC_DEFAULT_SONNET_MODEL`/`ANTHROPIC_DEFAULT_OPUS_MODEL` de `"glm-5.3"` pra `"glm-5.3-flash"`.
6. Pra voltar ao Claude normal: `. .\scripts\use-claude.ps1`.

## 2. (Opcional) Cadastro em outros provedores de fallback

Só faça isso se quiser mais opções além do GLM-5.3. Nenhuma chave sua foi encontrada pra estes:

### Moonshot / Kimi (`kimi-k2.7-code`)
- Cadastro: https://platform.moonshot.ai/
- Precisa de cartão? Verifique no cadastro — modelos pagos geralmente pedem recarga mínima.
- Depois de ter a chave, me peça pra criar o `scripts/use-kimi.ps1` do mesmo jeito que fiz com o GLM.

### DeepSeek (V4 Flash, melhor custo-benefício)
- Cadastro: https://platform.deepseek.com/
- Costuma dar crédito grátis pra conta nova.
- Endpoint compatível com Anthropic — confirmo o base URL exato quando você tiver a chave (não vou chutar).

### Z.ai / GLM-5.3 — se quiser o plano pago completo
- https://z.ai/model-api — plano de código a partir de ~US$10/mês (segundo o preço que constava no seu prompt original; confirme o valor atual na página antes de assinar).
- **Eu não assino nada por você (R8).**

## 3. Testar o emulador Android ANTES do hackathon começar

Não deixe pra testar isso na hora da demo:
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
flutter emulators
flutter emulators --launch flutter_emulator
```
Se travar ou demorar muito pra abrir, é provável que a virtualização (Hyper-V/VT-x) não esteja habilitada na BIOS, ou que os 7,4GB de RAM da máquina não aguentem — nesse caso, tenha um celular Android físico com depuração USB como plano B.

## 4. Instalar o Android Studio (IDE) — precisa ser você, não deu pra automatizar

**O Android Studio NÃO foi instalado.** Depois de mais de 1h tentando, achei a causa: um diálogo de UAC (Controle de Conta de Usuário) ficou preso desde a primeira tentativa e bloqueou qualquer elevação seguinte — e isso só um humano na frente da tela resolve, clicando "Sim". Não é uma falha de configuração, é um limite físico de sessão sem tela. Detalhes técnicos completos no `SETUP-LOG.md`.

**Isso não te bloqueia amanhã** — `flutter doctor` já roda 100% limpo só com o SDK via linha de comando que instalamos. Só instale a IDE se quiser o emulador visual/autocomplete:

1. Baixe o instalador: https://developer.android.com/studio (ou rode `winget install --id Google.AndroidStudio -e` você mesmo, num terminal que você controla).
2. Rode o instalador normalmente e **clique "Sim" no UAC quando aparecer**.
3. Na primeira abertura, escolha "Do not import settings".
4. Ele deve detectar sozinho o SDK que já configuramos em `%LOCALAPPDATA%\Android\Sdk`. Se não detectar, aponte manualmente pra essa pasta em Settings → Android SDK.

**Se um instalador ficar "travado" sem terminar:** abra o Gerenciador de Tarefas, procure um processo chamado "Controle de Conta de Usuário" ou um popup escondido atrás de outras janelas — é quase certo que é isso, não o instalador em si.

## 5. Testar o kill switch de verdade (Fase 6) — precisa de reiniciar a sessão

Não deu pra simular de dentro desta própria sessão em execução (mesma limitação da Fase 1 pro Agent Teams — testar "fechar e reabrir" exige um processo novo). Antes do hackathon começar:

1. Feche o Claude Code e abra um terminal novo.
2. `cd C:\hackaton; . .\scripts\use-claude.ps1` (garante que nenhuma variável de GLM ficou setada).
3. Abra `claude` normalmente, rode `/status` — confirme que aponta pra Anthropic direto, não pra `api.z.ai` nem pra `127.0.0.1:3456`.
4. Se algo da stack quebrar durante o hackathon, os comandos completos de kill switch estão em `ROLLBACK.md` (topo do arquivo) — já validados contra o estado atual da máquina (só a flag do Agent Teams está ativa em `~/.claude/settings.json` hoje).
