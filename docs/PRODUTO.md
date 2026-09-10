# PRODUTO — resumo operacional

Contexto completo de pitch esta em `RELATORIO-TRIAGEM.md` (fora deste pacote).
Este arquivo e o resumo que o agente precisa para tomar decisao tecnica.

## O que e

Ferramenta que transforma pedido de cliente escrito de qualquer jeito em demanda
mensuravel, classifica por criterio explicito, e aprende com as correcoes de quem revisa.

## Fluxo

```
ENTRADA        texto livre, sem formulario
REFINAMENTO    IA avalia o texto, pergunta uma coisa por vez, monta relatorio estruturado
CLASSIFICACAO  Reach x Impact x Confidence + regras da empresa -> coluna da fila
REVISAO        suporte audita e corrige; padrao de correcao vira diretriz
```

## Usuario

Suporte e gestao de projeto de software house com 5 a 40 pessoas. Grande demais para
o dono decidir tudo de cabeca, pequena demais para ter processo formal de produto.

## Telas do MVP

1. Fila (quadro de colunas + tabela densa, alternavel)
2. Nova demanda (entrevista da IA + relatorio ao vivo)
3. Antes e depois
4. Detalhe (score com formula aberta, extrato de rastreabilidade)
5. **Edicao de detalhes principais** — ver secao abaixo
6. Criterios da empresa (regras ordenadas, calibragem, diretrizes)
7. Revisao da IA (auditoria, correcao, ciclo de aprendizado)

## Tela 5 — Edicao de detalhes principais

Campos editaveis:
- titulo, cliente, sistema afetado, tipo, responsavel
- **data de entrega** — metadado informativo; não altera score ou posição
- os 3 fatores de score, cada um com valor + justificativa + motivo da mudanca
- prioridade manual (sobrepoe o calculo, exige motivo)
- **campo de sugestao do operador** — texto livre que vai para
  `memoria/sugestoes-operador.md`, nao vira regra sozinho
- botao de bloqueio (pos-MVP)

Toda alteracao de fator exige motivo. Chips com os motivos mais comuns + campo livre,
para nao custar caro. Sem motivo, o ciclo de aprendizado nao funciona.

Ao salvar, mostrar o antes/depois do score e da posicao:
`102,4 -> 142,4 · posicao 12 -> 4`

## Regra inegociavel de produto

Toda demanda responde "por que esta aqui?" com um extrato:
```
Score base (R × I × C)          3.600,0
Regra 3 "afeta faturamento"        +40,0
-----------------------------------------
Final                           3.640,0  ->  CRITICO
```
Sem isso o produto morre no primeiro desacordo.
