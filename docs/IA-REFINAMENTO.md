# REFINAMENTO POR IA — CONTRATO

Modelo: **Qwen 3.8 27B via Groq** (`qwen/qwen3.8-27b`, configurado com `reasoning_format: 'hidden'` e `reasoning_effort: 'none'`).
Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`, confirmado na documentação oficial.

A chamada acontece **no servidor** (route handler). A chave nunca chega ao browser.

---

## A MECÂNICA

Não é chat livre. É entrevista com objetivo de **completude para pontuação**.

```
texto livre → avalia a construção do texto → identifica lacunas
            → gera perguntas ordenadas por ganho de informação
            → uma pergunta por vez → para quando completude ≥ 80%
            → produz relatório estruturado + fatores RIC com justificativa
```

**Princípio:** a IA não pergunta o que já dá para deduzir do texto, e não deduz o que precisa perguntar. Toda dedução é marcada como `inferido` — é o que o suporte revisa depois.

---

## ETAPA 1 — Avaliação do texto

Entrada: o texto cru do solicitante.
A IA avalia a construção e responde:

```json
{
  "qualidadeTexto": "vago" | "parcial" | "completo",
  "oQueFoiIdentificado": {
    "problema": "...",
    "sistemaAfetado": "...",
    "clienteMencionado": "...",
    "evidenciaCitada": "..."
  },
  "lacunas": [
    {
      "fator": "reach" | "impact" | "confidence",
      "oQueFalta": "número de usuários afetados",
      "ganhoInformacao": 0.9
    }
  ],
  "completudeInicial": 0.35
}
```

`ganhoInformacao` (0 a 1) ordena as perguntas. Pergunte primeiro o que mais destrava a pontuação.

## ETAPA 2 — Perguntas, uma por vez

```json
{
  "pergunta": "Quantos pacientes por dia esbarram nesse problema hoje?",
  "fatorAlvo": "reach",
  "opcoesSugeridas": ["menos de 50", "50 a 300", "300 a 1000", "mais de 1000"],
  "permiteTextoLivre": true,
  "porqueEstouPerguntando": "sem isso não dá para estimar o alcance"
}
```

**Regras de redação das perguntas:**
- Linguagem de gente. *"Quantos clientes esbarram nisso hoje?"* e não *"Informe o Reach estimado"*.
- Uma pergunta por vez. Nunca formulário.
- 2 a 4 opções clicáveis + campo livre sempre disponível.
- Máximo de **6 perguntas**. Se não fechou 80% em 6, entregue com os fatores faltantes marcados `inferido` e mande para revisão.
- Nunca pergunte o que já está no texto. Isso irrita e faz a pessoa abandonar.

## ETAPA 3 — Relatório e pontuação

```json
{
  "relatorioRefinado": {
    "problema": "...",
    "quemEAfetado": "...",
    "evidencia": "...",
    "escopo": "...",
    "criteriosAceite": ["...", "..."]
  },
  "trechosDerivados": [
    { "trecho": "o caixa trava", "origemNoTextoOriginal": "o pessoal do caixa tá reclamando" }
  ],
  "fatores": {
    "reach":      { "valor": 340, "confianca": 0.9, "origem": "informado", "justificativa": "solicitante citou 340 pacientes ativos" },
    "impact":     { "valor": 2,   "confianca": 0.55, "origem": "inferido", "justificativa": "não informado — estimado por similaridade com demandas de agenda" },
    "confidence": { "valor": 1.0, "confianca": 0.95, "origem": "informado", "justificativa": "problema reproduzido e com print anexado" }
  },
  "completudeFinal": 0.86,
  "precisaRevisao": true,
  "motivosRevisao": ["baixa confiança em impact"]
}
```

**Obrigatório:**
- `justificativa` em **todo** fator, sempre em uma linha. Fator sem justificativa não é auditável.
- `origem` distinguindo `informado` de `inferido`. É o que a tela de revisão sublinha diferente.
- `trechosDerivados` amarrando o relatório ao texto original — prova que a IA derivou, não inventou.

---

## CONTEXTO INJETADO NA CHAMADA

Antes do texto da demanda, injete o conteúdo dos arquivos de memória:

```
memoria/regras-empresa.md      → regras duras de priorização
memoria/diretrizes-ia.md       → orientações em linguagem natural
memoria/glossario.md           → vocabulário de clientes e sistemas
memoria/padroes-correcao.md    → apenas a seção "Diretrizes ativas"
```

**Não injete o log inteiro de correções** — só a seção consolidada. O log cresce sem limite e estoura contexto.

## FALHA

Se a chamada ao modelo falhar ou vier fora do schema:
- Não invente valores. A demanda entra na fila com fatores vazios e etiqueta `precisa refinamento`
- Erro registrado, mensagem clara para o operador
- Nunca deixe o app quebrar por causa da IA. A fila funciona sem ela, só com pontuação manual.

## CUSTO

- Uma chamada por etapa, não uma por pergunta
- Cache do contexto de memória entre chamadas da mesma sessão
- `temperature` baixa nas etapas de pontuação; a criatividade aqui é defeito
