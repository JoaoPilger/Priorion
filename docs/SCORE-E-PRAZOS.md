# SCORE E DATA DE ENTREGA

## Score base — Valor & Certeza

```text
Score = Reach × Impact × Confidence
```

| Fator | Significado | Escala |
|---|---|---|
| `reach` | Clientes/usuários afetados por trimestre | inteiro ≥ 0 |
| `impact` | Quanto muda para cada um | 0.25 · 0.5 · 1 · 2 · 3 |
| `confidence` | Evidência que sustenta a estimativa | 0.5 · 0.8 · 1.0 |

`Effort` não faz parte do produto. O score é arredondado para uma casa decimal.

## Data de entrega

`dataEntrega` é um metadado operacional opcional, armazenado como data civil ISO
`YYYY-MM-DD`. Ela pode ser exibida, criada e editada, mas:

- não altera score, prioridade ou posição;
- não gera folga ou multiplicador;
- não cria estados de urgência;
- não recebe cor de prioridade.

## Ordem de aplicação

```text
1. Validar Reach, Impact e Confidence
2. Calcular o score base
3. Aplicar regras da empresa na ordem numerada — a primeira que casa vence
4. Determinar a prioridade pelo score resultante
5. Fixação manual pode colocar a demanda em Priorizados, com motivo obrigatório
```

Toda etapa que altera o valor precisa aparecer no extrato de rastreabilidade.

## Faixas iniciais de prioridade

| Prioridade | Score final |
|---|---|
| Crítico | ≥ 1200 |
| Alto | 500 a 1199,9 |
| Médio | 150 a 499,9 |
| Baixo | < 150 |

Os limites ficam centralizados em `lib/score.ts` e poderão ser calibrados na tela
de Critérios. `Priorizados` não é uma faixa: recebe demandas fixadas manualmente.

## Tipos

`types/demanda.ts` é a única fonte de tipos do domínio. A semente auditável fica
em `data/demandas.json`; o banco de runtime será o Supabase.

## Extrato mínimo

```text
Score base (Valor & Certeza)   1.200 × 3 × 1,0 = 3.600,0
Regra "afeta faturamento"                         +40,0
-------------------------------------------------------
Final                                             3.640,0 → CRÍTICO
```
