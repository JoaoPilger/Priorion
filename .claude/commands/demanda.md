Implemente ou ajuste algo no fluxo de demanda, seguindo os contratos do projeto.

Antes de escrever qualquer codigo, leia:
- `docs/SCORE-E-PRAZOS.md` — formula, folga, multiplicador de urgencia, tipos
- `docs/IA-REFINAMENTO.md` — contrato de entrada e saida do Gemini
- `types/demanda.ts` — fonte unica de tipos

Regras que nao podem ser violadas:
- RICE e multiplicativo: `(R x I x C) / E`. A urgencia MULTIPLICA o resultado,
  nao entra dentro da formula.
- Folga = dias ate a entrega MENOS o esforco. Nao e dias ate a data.
- Todo fator carrega `justificativa` e `origem` (informado/inferido/corrigido).
  Fator sem justificativa nao e auditavel e nao pode ser criado.
- Toda mudanca de valor precisa aparecer no extrato de rastreabilidade.
- Se a chamada ao Gemini falhar, a demanda entra na fila com fatores vazios e
  etiqueta "precisa refinamento". O app NUNCA quebra por causa da IA.

Ao terminar, rode o gate de teste antes de me devolver.
