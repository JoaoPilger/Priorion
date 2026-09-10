# DESIGN-BRIEF.md — template de sistema de design

> Copie/preencha isto no início de cada projeto do hackathon. Dê este arquivo (preenchido) ao `@agent-frontend-developer` junto com `FRONTEND-KIT.md` antes de pedir qualquer tela. O objetivo é dar um padrão de qualidade mensurável, não "faz um site bonito".

## 1. Tokens de design

Preencha antes de codar a primeira tela — trocar depois é caro.

### Cor
- Primária: `#______` — usada em: CTAs, links, estado ativo
- Secundária/accent: `#______`
- Neutros (escala 50→900): gerar a partir de uma base neutra (ex.: `slate`/`zinc` do Tailwind) — não escolher cinza a cada componente
- Semânticas: sucesso `#______`, aviso `#______`, erro `#______`
- Modo escuro: obrigatório? (sim/não) — se sim, todo token acima precisa do par dark

### Tipografia
- Fonte de display (títulos): `______` (peso: `______`)
- Fonte de corpo: `______` (peso: `______`)
- Escala (Tailwind default ou custom): `______`
- Line-height do corpo: mínimo 1.5 pra parágrafos longos

### Espaçamento
- Unidade base: `4px` (padrão Tailwind) — não inventar outra sem motivo
- Grid de página: `______` (ex.: max-w-7xl, padding lateral responsivo)

### Raio (border-radius)
- Componentes pequenos (botão, input): `______`
- Cards/containers: `______`
- Consistência: mesmo raio em toda a família de componente, sem exceção não documentada

## 2. Regra de motion

**Anime só o que comunica estado ou hierarquia.** Cada animação precisa responder "o que isso está dizendo ao usuário?" — se a resposta for "porque é bonito", corta.

Casos válidos:
- Transição de estado (hover, loading, sucesso/erro de form)
- Entrada de elemento pra guiar atenção (hero, primeira dobra) — usar com moderação, uma vez por seção no máximo
- Feedback de interação (clique, drag, scroll-linked quando reforça narrativa, ex. landing de produto)

Casos inválidos (não fazer):
- Animação decorativa sem relação com o conteúdo
- Múltiplos elementos animando ao mesmo tempo competindo por atenção
- Duração > 400ms pra microinterações (botão, toggle) — fica lento, não elegante

Ferramenta: **Motion** por padrão (já na stack). **GSAP** só se a animação for cinematográfica (scroll-driven complexo, timeline com múltiplos atores) — justificar em uma linha no PR se usar GSAP.

Sempre respeitar `prefers-reduced-motion` — ver checklist de acessibilidade abaixo.

## 3. Checklist de acessibilidade

- [ ] Contraste de texto ≥ 4.5:1 (corpo) / ≥ 3:1 (texto grande, ≥18px) — checar com DevTools ou `axe`
- [ ] Todo elemento interativo alcançável por teclado (tab order lógico, sem `tabindex` positivo)
- [ ] Estados de foco visíveis (não remover `outline` sem substituir por algo igualmente visível)
- [ ] Imagens com `alt` significativo (ou `alt=""` se decorativa)
- [ ] Formulários: `label` associado a cada input, mensagens de erro anunciadas (`aria-live` ou equivalente)
- [ ] `prefers-reduced-motion` respeitado — animações não essenciais desligam
- [ ] Hierarquia de headings sem pular nível (h1 → h2 → h3, nunca h1 → h3)
- [ ] Componentes de bibliotecas prontas (shadcn, Velora, Magic UI) já vêm acessíveis — não desmontar isso ao customizar

## 4. Checklist de Core Web Vitals

- [ ] LCP < 2.5s — imagem/elemento principal da primeira dobra otimizado (`next/image`, tamanho certo, sem lazy-load no que aparece imediatamente)
- [ ] CLS < 0.1 — todo elemento com dimensão reservada (imagem com `width`/`height`, skeleton em vez de "pulo" de layout)
- [ ] INP < 200ms — sem JS bloqueando a thread principal em interações críticas
- [ ] Fontes: `font-display: swap` ou preload das fontes críticas, evitar FOIT
- [ ] Sem biblioteca de animação pesada carregada em página que não anima nada
- [ ] Rodar Lighthouse (ou `next build && next start` + PageSpeed Insights) antes do "pronto" — não confiar só em `next dev`

## 5. Como usar isto com o agente

1. Preencha a seção 1 (tokens) — decisão sua, não do agente.
2. Passe este arquivo + `FRONTEND-KIT.md` pro `@agent-frontend-developer` no início da tarefa.
3. Peça pra ele citar, por componente, qual fonte usou (shadcn MCP / Velora / Magic UI / 21st.dev / customizado) — se "customizado" aparecer muito, provavelmente ele está reinventando algo que já existe pronto.
4. Rode os dois checklists (seções 3 e 4) como gate antes do "Ship" do pipeline principal do `CLAUDE.md` — não é opcional, é parte da revisão.
