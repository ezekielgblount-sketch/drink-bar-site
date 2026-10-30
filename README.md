# Sol de Mango · Drink Bar Site

A scroll-driven 3D cocktail site. As you scroll, each drink is poured into its glass, garnished, then spun.

**Live:** https://ezekielgblount-sketch.github.io/drink-bar-site/

## Run it locally

```bash
npm install
npm run dev
```

## How it's built

- React + TypeScript + Vite, styled with Tailwind
- 3D: three.js via React Three Fiber and drei. Every glass, bottle and garnish is built in code (no downloaded models).
- Scroll: GSAP ScrollTrigger + Lenis smooth scrolling. Pop-outs: Motion.
- Data lives in `src/data/*.json`, and every fact carries its source.

## Accessibility and performance

- Respects the "reduce motion" setting: drinks are shown finished and still.
- Phones get lighter materials and shadows.
- Devices without 3D (or too slow for it) get pre-rendered still images instead.

Licenses for everything used are in [ASSETS.md](ASSETS.md). Please drink responsibly. 21+.
