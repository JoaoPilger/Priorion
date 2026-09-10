# SISTEMA VISUAL

Referência: Linear, Vercel, PostHog. Denso, calmo, tipografia forte, cor com significado.
O protótipo existente deve ser migrado para shadcn/ui mantendo estes tokens.

## Regra que resume tudo

**Se você apagar toda a cor da tela, ela ainda tem que funcionar e ficar bonita.**
Cor é camada de informação de prioridade, nunca estrutura.

## Tokens — claro

```
canvas #FBFBFA · superficie #FFFFFF · superficie-2 #F5F5F3
borda #E8E8E4 · borda-forte #D4D4CE
texto #1A1A19 · secundario #6B6B65 · terciario #9B9B94
acao #2743E3 · acao-hover #1D35C4 · acao-suave #EEF1FE
```

## Tokens — escuro

```
canvas #0A0A0B · superficie #111113 · superficie-2 #17171A · superficie-3 #1E1E22
borda #232327 · borda-forte #2E2E33
texto #EDEDEF · secundario #9B9BA3 · terciario #6B6B73 · desabilitado #4A4A52
acao #4D7CFF · acao-hover #6B93FF · acao-suave rgba(77,124,255,0.12)
```

## Prioridade (a unica fonte de cor viva)

```
critico #D6453D / dark #FF5C5C
alto    #E07B39 / dark #FFA23A
medio   #A97C00 / dark #FFD84D
baixo   #3F8F5F / dark #3DDC97
```
Badge = texto na cor + fundo da cor a 10% + borda da cor a 28%. Raio 4px, altura 20px, 11px uppercase.

## Glow (so no dark)

Sombra colorida de baixa opacidade, nunca blur de fundo.
```css
badge critico:  box-shadow: 0 0 12px rgba(255,92,92,0.25);
ponto status:   box-shadow: 0 0 6px currentColor;
linha critica:  border-left: 2px solid #FF5C5C;
```
Permitido em: badge de prioridade, ponto de status, barra de completude, grafico do painel.
Proibido em: card inteiro, header, sidebar, botao comum, texto, fundo de pagina.

## Tipografia

- UI: Geist. **Nao use Inter puro** — e a fonte padrao de todo prototipo de IA.
- Numeros, scores, IDs e datas: Geist Mono com `tabular-nums`.
- Escala 11 / 12 / 13 / 14 / 16 / 20 / 28. Corpo de interface em **13px**.

## Forma

- Raio 6px em cards e inputs, 4px em badges. Nunca 16px+.
- Elevacao por borda de 1px, nao por sombra.
- Icones Lucide, stroke 1.5px, 16px. Nunca emoji.
- Espacamento em multiplos de 4.
- Grain a 2% sobre o canvas no dark.

## Componentes

Base: shadcn/ui. Extras via 21st.dev quando economizarem tempo (requer `API_KEY_21ST`).
```bash
npx shadcn@latest add "https://21st.dev/r/<autor>/<componente>?api_key=$API_KEY_21ST"
```
Nao use: aurora background, bento glassmorphic, dock 3D, hero animado. Sao de landing page e denunciam o prototipo.

## PROIBIDO

- Gradiente roxo/azul em qualquer lugar
- Glassmorphism, backdrop-blur, card translucido
- Emoji como icone
- Border-radius acima de 8px
- Hero centralizado
- Grid de cards para o que e naturalmente tabela
- Sombra grande e difusa
- Preto puro #000000
- Roxo ou ciano como cor de acento
- Cor sem significado
- Dados genericos: "Acme Inc", "John Doe", "Lorem ipsum"

## Sinais visuais especificos

**Delta de posicao:** `↑7` `↓3` `—` em mono 11px. Subida na cor de prioridade baixa,
descida e estabilidade em terciario — subir chama atencao, descer nao.
Hover mostra o motivo registrado para a mudança de posição.

**Micro-barra RIC:** 3 segmentos de 3px de altura. R/I/C na cor da prioridade.
Os segmentos mostram forca RELATIVA contra a fila (percentil), NAO proporcao do score — RIC e multiplicativo
e segmento proporcional seria matematicamente falso.

**Data de entrega:** data civil em mono 12px, sempre em cor secundaria ou terciaria.
Exibicao: `24/09/2026` ou `sem data`. Nao calcular folga, urgencia ou atraso visual;
a data e informativa e nao altera score, prioridade ou posicao.
