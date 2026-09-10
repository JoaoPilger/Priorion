# CICLO DE APRENDIZADO

Como a edição do operador vira conhecimento persistente.

---

## PRINCÍPIO

**Correção isolada não ensina. Padrão de correção ensina.**

Uma correção pontual pode ser exceção. Três correções semelhantes são um critério da casa que o sistema ainda não conhecia. O sistema só propõe regra a partir do padrão — nunca da primeira correção.

E a proposta **sempre passa por aprovação humana**. O sistema não se reconfigura sozinho; ele sugere e o operador decide.

---

## ONDE FICA A MEMÓRIA

```
memoria/
  regras-empresa.md      regras duras, ordenadas, editadas na tela de Critérios
  diretrizes-ia.md       orientações em linguagem natural
  glossario.md           vocabulário: clientes, sistemas, termos da casa
  padroes-correcao.md    log de correções + padrões detectados + diretrizes ativas
  sugestoes-operador.md  campo livre da tela de edição, ainda não processado
```

**Arquivos `.md` versionados no git.** Auditável em diff, reversível com `git revert`, legível sem ferramenta. É decisão de arquitetura, não atalho de MVP.

---

## O FLUXO

```
1. Operador edita um fator na tela de edição ou revisão
        ↓
2. Sistema exige o motivo (chip clicável ou texto livre)
        ↓
3. Registra em memoria/padroes-correcao.md, seção "Log"
        ↓
4. Verifica se há ≥ 3 correções semelhantes em 14 dias
        ↓
5. Se sim: propõe diretriz na interface
        ↓
6. Operador aprova → diretriz vai para "Diretrizes ativas" e passa a
   ser injetada no contexto do modelo
        ↓
7. Commit automático do arquivo de memória, mensagem descritiva
```

### O que conta como "correção semelhante"

Mesmo `fator` + mesma direção de ajuste + sobreposição de contexto (mesmo tipo de demanda, mesmo cliente, ou palavra-chave repetida na justificativa).

Não agrupe por cliente sozinho — geraria regra do tipo "tudo do cliente X é crítico", que é ruído e não critério.

---

## FORMATO DO `padroes-correcao.md`

```markdown
# Padrões de correção

## Diretrizes ativas
<!-- injetado no contexto do modelo -->
- Demanda de conformidade fiscal tem Impact mínimo 3. (criada 2026-09-08, 3 correções)
- Demanda que bloqueia faturamento tem Impact mínimo 3. (criada 2026-09-09, 4 correções)

## Padrões observados, aguardando decisão
- Reach corrigido para cima em 3 demandas com múltiplas filiais. Proposta pendente.

## Log
- 2026-09-08 · demanda D-042 · impact 2→3 · Marcela · "bug impede faturamento"
- 2026-09-08 · demanda D-047 · impact 2→3 · Juliano · "trava emissão de NF"
- 2026-09-09 · demanda D-051 · reach 80→240 · Téo · "afeta três filiais"

## Rejeitadas
<!-- padrões que o operador marcou "nunca sugerir isso" — não propor de novo -->
```

**A seção "Rejeitadas" não é detalhe.** Sem ela o sistema reoferece a mesma sugestão toda semana e o operador aprende a ignorar a interface inteira.

---

## O CAMPO DE SUGESTÃO DO OPERADOR

Presente na tela de edição e na de revisão. Texto livre, opcional:

> *"Quando a demanda citar 'não consigo faturar', trate como Impact 3 automaticamente."*

Vai para `memoria/sugestoes-operador.md` com autor e data. Não vira regra sozinha — o operador precisa promovê-la na tela de Critérios. Isso evita que uma frase escrita no calor do momento vire comportamento permanente do sistema.

---

## LIMITES

- **Nunca** escreva em `memoria/` fora deste fluxo
- **Nunca** promova sugestão a diretriz sem aprovação explícita
- **Nunca** aplique diretriz retroativamente. Ela vale para análises novas; o histórico fica como está e a interface deixa isso claro
- Teto de **20 diretrizes ativas**. Passou disso, o contexto do modelo fica grande e contraditório — a interface avisa e pede consolidação
- Diretriz que não é acionada em 30 dias é marcada como `dormente` e sugerida para remoção

---

## MÉTRICAS DE SAÚDE (faixa no topo da tela de revisão)

| Métrica | Como calcular |
|---|---|
| Aprovação sem correção | revisões aprovadas sem edição ÷ total |
| Fator mais corrigido | contagem de correções por fator |
| Fator mais confiável | inverso do anterior |
| Diretrizes criadas por correção | contagem em `Diretrizes ativas` |

**Mostrar onde a IA erra é o que faz o time confiar nela.** Um painel dizendo "Impact é corrigido em 41% das revisões" é mais útil e mais crível que qualquer número de acurácia.
