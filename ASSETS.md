# Assets and licenses

Last checked: 2026-10-30.

## 3D models: all built in code (no downloaded files)

| Asset | Where | How it's made | License |
|---|---|---|---|
| Rocks, highball, coupe glasses | `src/three/glasses.ts` | Side profiles spun on a lathe | Ours (project code) |
| Liquid, ice, salt/chili rims | `src/components/Glass.tsx` | Lathe + rounded boxes + torus | Ours |
| Lime and grapefruit wheels | `src/three/Garnish.tsx` + `textures.ts` | Cylinder + face texture drawn on a canvas | Ours |
| Mango slice, floating mango | `src/three/Garnish.tsx`, `DrinkScene.tsx` | Flattened spheres | Ours |
| Condensation drops | `src/three/textures.ts` | Random droplets drawn on a canvas | Ours |
| Shaker tin, pour stream, ripples | `src/three/PourRig.tsx` | Lathe tin + cylinder stream with a scrolling streak texture | Ours |
| Soda bubbles | `src/three/Bubbles.tsx` | 40 instanced spheres | Ours |
| Bar top (wood grain, fades to dark) | `src/components/DrinkScene.tsx` + `textures.ts` | Disc + canvas-drawn grain, drei `ContactShadows` | Ours |
| Bottles (tall, round, stubby) | `src/components/BottleViewer.tsx` | Lathe profiles | Ours |
| Bottle labels | `src/three/textures.ts` | **Product name and type as plain text only.** No logos or label artwork. | Ours |
| Lighting / reflections | `src/components/BarLights.tsx` | drei `Lightformer` panels (no HDR file) | Ours |

**Why code-built:** I searched for free CC0 cocktail glass and liquor bottle models and found none worth using. The good ones are paid marketplace models with custom licenses. Code-built shapes have no license risk, weigh about 10 KB, and can't copy any brand's real bottle design.

If a GLB model is added later: compress it with `npx @gltf-transform/cli optimize in.glb out.glb --compress draco`, load it lazily, log its license here, and keep the total under ~5 MB.

## Fonts

| Font | Source | License |
|---|---|---|
| Fraunces (headings, labels) | Google Fonts | SIL Open Font License (per Google Fonts; not re-checked here) |
| System UI font (body) | Visitor's device | n/a |

## Libraries (license field read from each package's own `package.json`)

| Package | Version | License |
|---|---|---|
| three | 0.186.1 | MIT |
| @react-three/fiber | 9.8.2 | MIT |
| @react-three/drei | 10.7.9 | MIT |
| gsap, @gsap/react | 3.15.0, 2.1.2 | GSAP "Standard no-charge" license (https://gsap.com/standard-license), **not MIT** |
| lenis | 1.3.27 | MIT |
| motion | 14.8.0 | MIT |
| zustand | 5.0.16 | MIT |
| tailwindcss | 4.3.3 | MIT |
| react | 19.3.1 | MIT |

## Size budget (production build)

- Whole `dist/` folder: about 1.5 MB (about 460 KB gzipped over the network). Budget: 5 MB.
- The 3D scene and the bottle viewer are lazy-loaded, so the page text shows before the 3D code arrives.
- three.js, React Three Fiber and the animation libraries are split into their own files so browsers cache them.

## Brand names

Real product names (Espolòn, Cointreau, Gran Gala, DeKuyper, Topo Chico) appear only as plain text, to say what the bar pours. No logos, label art or bottle shapes are copied. The competitor used as a benchmark for Sol de Mango is never named on the site.
