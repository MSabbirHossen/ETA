# Exploratory Training Academy (ETA) — Brand Guidelines & Vector Asset System

**Version:** 2.0.0 (Vector Master Reconstruction)  
**Organization:** Exploratory Training Academy  
**Short Name:** ETA  
**Tagline:** Learn • Explore • Grow  
**Industry:** Education, Technology, Programming, and Professional Training  

---

## 1. Brand Identity Overview

The Exploratory Training Academy visual identity embodies the intersection of **Computer Science Education**, **Continuous Learning**, and **Personal Exploration & Growth**.

### Core Symbolic Anatomy
1. **Graduation Mortarboard:** Represents formal academic achievement, structured curricula, credentialing, and educational rigor.
2. **Code Syntax Chevrons (`<` and `>`):** The diamond faces of the mortarboard are constructed as programming brackets, symbolizing software engineering, web technology, algorithmic thinking, and modern digital skills.
3. **Ascending Vector Arrow:** Erupts vertically from the base of the skullcap along a 60° trajectory through the mortarboard gap, signifying career advancement, upward momentum, and ambition.
4. **Faceted 3D Dimensionality:** Subtle lighting splits and fold facets create tactile depth and futuristic polish without clutter.
5. **Compass Letter 'O':** The letter **O** in **EXPLORATORY** is formed as a nautical / navigational compass with a dual-tone needle pointing along a diagonal trajectory, reinforcing self-directed discovery and mentorship.
6. **Academic Skullcap & Tassel:** Anchors the technical elements with traditional academic symbolism, creating an instantly recognizable educational seal.

---

## 2. Color Palette & Design Tokens

### Primary Brand Colors
| Color Name | HEX Code | RGB | Role / Usage | CSS Token |
| :--- | :--- | :--- | :--- | :--- |
| **ETA Navy** | `#073C84` | `rgb(7, 60, 132)` | Primary Brand Anchor & Light Text | `--eta-navy` |
| **ETA Deep Blue** | `#0752B5` | `rgb(7, 82, 181)` | Secondary Structural Blue | `--eta-deep-blue` |
| **ETA Brand Blue** | `#0B7CEB` | `rgb(11, 124, 235)` | Primary Interactive Accent | `--eta-blue` |
| **ETA Bright Blue** | `#129BFF` | `rgb(18, 155, 255)` | Hover States & Highlights | `--eta-bright-blue` |
| **ETA Cyan Glow** | `#16C4FF` | `rgb(22, 196, 255)` | Energy, Dark Accent, Glowing Rims | `--eta-cyan` |
| **ETA Ink Dark** | `#071324` | `rgb(7, 19, 36)` | Dark Theme Canvas & Background | `--eta-ink` |
| **ETA White** | `#FFFFFF` | `rgb(255, 255, 255)` | Pure Contrast, Dark Wordmark | `--eta-white` |

### Official Gradient Recipes
- **Light Theme Chevrons:** `linear-gradient(135deg, #0080FF 0%, #0066D6 50%, #004EA8 100%)`
- **Light Theme Arrow Shaft:** `linear-gradient(60deg, #0072EA 0%, #0099FF 60%, #14BEFF 100%)`
- **Light Theme Skullcap:** `linear-gradient(180deg, #003A7C 0%, #002454 100%)`
- **Dark Theme Chevrons:** `linear-gradient(135deg, #00B4FF 0%, #008CFF 50%, #0066FF 100%)`
- **Dark Theme Arrow Shaft:** `linear-gradient(60deg, #0080FF 0%, #00C0FF 60%, #38E2FF 100%)`
- **Dark Theme Skullcap:** `linear-gradient(180deg, #0080FF 0%, #0050D0 100%)` with `#00D0FF` 2px stroke

---

## 3. Typography Standards

### Primary Wordmark
- **EXPLORATORY:** Montserrat / Outfit / Inter Black (900 Weight), Tracking `-0.01em` (`-10`)
  - **Compass 'O':** Customized circular compass ring with dual-tone needle (`#0F8FFF` / `#0066CC` light, `#00D0FF` / `#FFFFFF` dark).
  - **Dark Variant Accent:** Top arm of **E** rendered in electric cyan `#00D0FF` (`#16C4FF`).
- **TRAINING ACADEMY:** Bold Sans (700 Weight), Uppercase, Wide Tracking `+0.22em` (`+220`), flanked by horizontal rule bars.
- **Learn • Explore • Grow:** Medium Sans (500 Weight), Uppercase/Mixed, Wide Tracking `+0.32em` (`+320`), separated by bullet dots.

---

## 4. Logo Clear Space & Minimum Sizing

### Clear Space Rule
Maintain a minimum protective buffer zone around all logos equal to **0.25 × Height** of the mark (`X`). No text, borders, illustrations, or page margins may invade this perimeter.

```
       ┌─────────────────────────────────────┐
       │                 [ X ]               │
       │       ┌─────────────────────┐       │
 [ X ] │ [ X ] │      ETA LOGO       │ [ X ] │ [ X ]
       │       └─────────────────────┘       │
       │                 [ X ]               │
       └─────────────────────────────────────┘
```

### Minimum Rendered Sizes
- **Full Horizontal Logo:** Minimum height `36px` (desktop), `28px` (mobile)
- **Full Stacked Logo:** Minimum height `72px`
- **Symbol Mark:** Minimum width `24px`
- **Browser Favicon:** Crisp down to `16×16px` (use optimized `eta-favicon.svg` or `favicon-16x16.png`)

---

## 5. File Inventory

```text
public/brand/
├── svg/
│   ├── eta-logo-light.svg              # Master stacked logo for light canvas
│   ├── eta-logo-dark.svg               # Master stacked logo for dark canvas
│   ├── eta-logo-horizontal-light.svg   # Navbar & header lockup (light)
│   ├── eta-logo-horizontal-dark.svg    # Navbar & header lockup (dark)
│   ├── eta-logo-stacked-light.svg      # Stacked lockup (light)
│   ├── eta-logo-stacked-dark.svg       # Stacked lockup (dark)
│   ├── eta-symbol.svg                  # Standalone symbol mark (512x512)
│   ├── eta-symbol-monochrome.svg       # Single-color vector (emboss/mono)
│   ├── eta-favicon.svg                 # Optimized SVG favicon
│   └── eta-loader.svg                  # Brand animated loading mark
│
├── png/
│   ├── eta-logo-light.png              # 1254x1254 master PNG
│   ├── eta-logo-dark.png               # 1254x1254 master PNG
│   ├── eta-symbol-512.png              # 512x512 PNG
│   ├── eta-symbol-256.png              # 256x256 PNG
│   └── eta-symbol-128.png              # 128x128 PNG
│
├── favicons/
│   ├── favicon.ico                     # Multi-res ICO (16, 32, 48, 64)
│   ├── favicon-16x16.png               # 16x16 browser tab
│   ├── favicon-32x32.png               # 32x32 retina tab
│   ├── apple-touch-icon.png            # 180x180 iOS home screen
│   ├── android-chrome-192x192.png      # 192x192 Android PWA icon
│   └── android-chrome-512x512.png      # 512x512 Android PWA splash
│
├── animation/
│   ├── eta-loader.svg                  # Animated SVG loader
│   └── eta-loader.css                  # Keyframe CSS animation
│
├── design/
│   ├── eta-brand-guide.svg             # Comprehensive vector brand sheet
│   ├── eta-brand-tokens.json           # Machine-readable token dictionary
│   └── eta-brand-guide.md              # Full documentation manual
│
└── site.webmanifest                    # PWA installation manifest
```

---

## 6. Implementation Guidelines

### React / Next.js Component Usage

```tsx
import { ETALogo } from "@/components/brand/ETALogo";
import { ETAIcon } from "@/components/brand/ETAIcon";
import { ETALoader } from "@/components/brand/ETALoader";

// 1. Navigation Header
<ETALogo variant="horizontal" theme="dark" height={42} />

// 2. Authentication Screen Hero
<ETALogo variant="stacked" theme="light" height={120} />

// 3. Compact Sidebar or Mobile Header
<ETAIcon theme="dark" size={32} />

// 4. Loading States
<ETALoader size="md" label="Loading coursework..." />
```
