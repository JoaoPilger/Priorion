# FRONTEND-KIT.md — fontes de blocos e MCPs pro visual do hackathon

> Fase 5 do bootstrap. Objetivo: dar ao agente componentes reais e um design system, não pedir "faz bonito".

## Stack baseline

- **Next.js** + **Tailwind CSS v4** + **shadcn/ui** + **Motion** (animação padrão).
- **GSAP** só onde a animação for cinematográfica de verdade (scroll-driven complexo, timelines longas) — overkill pro resto.
- Mobile: se o projeto tiver app nativo, ver ambiente Flutter já configurado (`SETUP-LOG.md`, seção "Ambiente React + Flutter").

## MCPs de frontend

| MCP | Status | O que dá |
|---|---|---|
| **shadcn/ui** (`ui.shadcn.com/docs/mcp`) | ✅ Instalado — `C:\hackaton\.mcp.json`, escopo do projeto | Registro real de componentes shadcn — o agente busca/instala componente existente em vez de inventar markup. Sem API key. |
| **21st.dev Magic** (`21st.dev/mcp`) | ✅ Instalado — HTTP, config local (`~/.claude.json`, não versionado) | Catálogo de 10.000+ componentes React/Tailwind animados, geração de UI nova. Conta grátis tem limite diário de instalações — confirme o número na própria página. |

## Fontes de blocos prontos (licença verificada em 2026-09-08, não copiada do prompt original sem checar)

| Fonte | Licença | Custo | Observação |
|---|---|---|---|
| **Velora UI** (`velora.colorlib.com`, `github.com/ColorlibHQ/velora-ui`) | MIT | **Grátis, tudo** | Melhor ponto de partida: já é um site multi-página completo pronto (home, pricing, blog MDX, auth, changelog, 404), 64 componentes animados, Next.js 16 + Tailwind 4 + Motion — mesma stack baseline daqui. Auth/contato/pricing são só front-end (sem backend/Stripe), integrar com o backend do projeto. |
| **Magic UI** (`magicui.design`) | MIT | **Grátis, tudo** (150+ componentes) | Componentes animados avulsos (copy-paste), TypeScript + Next.js + Tailwind + Motion. Bom pra complementar Velora com efeitos extras. |
| **Tailark** (`tailark.com`) | MIT nos blocks gratuitos | **Grátis** o catálogo base; **Tailark Pro** é pago (pagamento único, sem plano free) | Blocks de marketing shadcn-based. Use a versão grátis primeiro. |
| **Aceternity UI** (`ui.aceternity.com`) | Licença própria (permite produto final pago/redistribuído) | **200+ componentes grátis**; **All-Access Pro** = US$199 pagamento único | Núcleo é grátis e cobre bastante coisa; só pague o Pro se precisar de templates completos específicos dele. |
| **Launch UI** (`launchuicomponents.com`) | Open-source no tier grátis (licença específica não detalhada na página) | **Grátis:** 1 template, 9 blocks, 4 animações. **Pro:** US$99 (7 templates, 74 blocks, 23 ilustrações, 15 animações), pagamento único. **Pro Team:** US$499 | "Free and open-source forever" é a frase oficial deles pro tier grátis — não achei o nome exato da licença (tipo MIT) documentado, então não afirmo qual é. |

**Ordem de uso recomendada:** Velora UI como base do site (grátis, já é o template completo na stack certa) → Magic UI pra efeitos extras pontuais → shadcn MCP pra qualquer componente estrutural que faltar → Tailark/Aceternity grátis se precisar de blocks de marketing específicos → só considere pago (Aceternity Pro/Launch UI Pro) se o júri exigir algo que nenhuma fonte grátis cobre.

## Regra de ouro

Não deixe o agente gerar markup de UI do zero pra nada que já exista pronto (botão, card, form, hero, pricing table). Primeiro: shadcn MCP → Velora/Magic UI → 21st.dev Magic (quando a chave estiver configurada). Só escreve componente novo se nenhuma fonte tiver o padrão necessário.
