# Exploratory Training Academy — Brand Design System

Final identity:
- Brand: Exploratory Training Academy
- Short name: ETA
- Tagline: Learn • Explore • Grow
- Visual concept: education + code + exploration/growth

## Final supplied masters
- `logos/eta-logo-light.png` — use on light surfaces.
- `logos/eta-logo-dark.png` — use on dark surfaces.

## Website usage
Use the full logo in navigation, authentication pages, landing pages and footers.
Use the icon-only mark for favicons, compact/mobile navigation, PWA/app icons,
loading states and social/avatar contexts.

Recommended rendered header sizes:
- Desktop full logo: 44–56 px tall
- Mobile full logo: 34–42 px tall
- Compact icon: 32–40 px
- Keep clear space around the logo equal to roughly the width of the tassel.

Do not stretch, recolor, rotate, add new shadows, or place the light logo on a
low-contrast background.

## Dynamic loader
`web/ETALoader.jsx` and `web/eta-loader.css` provide a lightweight loader using
the academy mark. It includes `prefers-reduced-motion` support.

## Favicons
`favicons/` contains ICO and common PNG sizes. `icons/` contains larger PWA/app
sizes.

## Important source note
The two approved masters supplied for this package are raster artwork. The
derived icon and favicon files therefore remain raster derivatives. For a
truly resolution-independent master SVG, the mark should be manually redrawn
as vector paths rather than auto-traced.
