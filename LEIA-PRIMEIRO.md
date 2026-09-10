# Pacote de configuracao — Triagem

## Onde extrair

Na **raiz do repositorio do projeto**.

```bash
unzip ~/Downloads/triagem-config.zip -d /tmp/tc
cp -r /tmp/tc/triagem-config/. .
```

Estrutura resultante:
```
CLAUDE.md               regras do projeto — lido pelo Claude Code toda sessao
docs/
  PRODUTO.md            resumo operacional + tela de edicao
  SCORE-E-PRAZOS.md     formula R × I × C, data informativa, tipos TypeScript
  IA-REFINAMENTO.md     contrato do modelo de refinamento, schema de entrada/saida
  APRENDIZADO.md        ciclo de correcao -> diretriz, limites
  UI.md                 tokens claro/escuro, glow, proibicoes
memoria/                memoria persistente, versionada no git
  regras-empresa.md
  diretrizes-ia.md
  glossario.md
  padroes-correcao.md
  sugestoes-operador.md
.claude/commands/       comandos slash
  ship.md               /ship      — gates + commit na main
  checkpoint.md         /checkpoint — tag de ponto de retorno
  demanda.md            /demanda   — trabalhar no fluxo de demanda
  memoria.md            /memoria   — mexer no ciclo de aprendizado
```

## ATENCAO — mescle, nao substitua

Se ja existir `CLAUDE.md` ou `.gitignore` no repo, **mescle**. Copiar por cima apaga o seu.

## Primeiro passo, antes de codar

```bash
# 1. Garanta que o .env nao vai para o git
echo ".env.local" >> .gitignore
git status                      # confirme que nenhuma chave aparece

# 2. Ponto de retorno inicial
git tag ok-inicial && git push origin --tags

# 3. Abra o Claude Code e peca o plano antes da implementacao
```

## Git — a regra que nao muda

Commit sempre direto na `main`. Sem branch, sem worktree, sem PR, sem force push.
Por isso **Agent Teams fica desligado neste projeto** — ele depende de branches.
Use subagentes em sessao unica.

Se voce tiver a flag ligada globalmente:
```bash
# desligar so nesta sessao
unset CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
```

## Ordem sugerida de construcao

1. Tipos (`types/demanda.ts`) e dados de exemplo em `data/`
2. Calculo de Reach × Impact × Confidence e regras — com teste, e o coracao do produto
3. Fila (quadro + tabela) com dados fixos
4. Tela de edicao de detalhes (data de entrega + campo de sugestao)
5. Integração de IA: refinamento e pontuação
6. Tela de revisao + escrita em `memoria/`
7. Tela de criterios
8. Deteccao de padrao e proposta de diretriz

Passos 1 a 4 não dependem do modelo. Se a integração atrasar, você ainda tem
produto demonstravel — construa nessa ordem de proposito.

## Pos-MVP, so se sobrar tempo

- Botao de bloqueio de demanda
- Painel de metricas
