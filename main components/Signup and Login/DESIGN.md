---
name: Obsidian Kinetic
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#009eb9'
  on-tertiary-container: '#002f38'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-sm: 0.75rem
  gutter-lg: 1.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies the high-velocity, high-precision environment of state-of-the-art AI infrastructure. Tailored for software engineers, machine learning architects, and technical leaders, the aesthetic fuses sleek dark-room IDE precision with luminous, futuristic optical accents.

The visual style is **Glassmorphic Precision Minimalism**. It departs from flat enterprise conventions by using translucent obsidian tiers, optical glow gradients, and razor-sharp geometric typography. Key emotional drivers include:
- **Absolute Authority & Speed:** High-density, latency-optimized layouts that feel instantly responsive and mathematically deliberate.
- **Micro-Luminescence:** Subdued obsidian grounds accented by controlled electric indigo, vivid violet, and reactive neon cyan micro-glows that signify intelligence, active compute, and execution.
- **Architectural Depth:** Layered acrylic surfaces over deep void tones, preserving structural focus while signaling layered execution contexts.

## Colors
The color architecture operates across a deep obsidian spectrum with high-energy spectral accents.

### Dark Mode (Primary Palette)
- **Base Canvas:** Obsidian `#09090b` delivers deep ocular contrast with zero muddy gray distortion.
- **Surface Elevation Layers:**
  - `surface-base`: `#09090b`
  - `surface-subtle`: `rgba(255, 255, 255, 0.02)`
  - `surface-glass`: `rgba(18, 18, 23, 0.70)` with subtle specular highlight `border: 1px solid rgba(255, 255, 255, 0.06)`
  - `surface-elevated`: `rgba(24, 24, 32, 0.85)`
- **Accents:**
  - `primary` (Electric Indigo: `#6366f1`): Primary actions, active compilation states, and core interactive triggers.
  - `secondary` (Vibrant Violet: `#8b5cf6`): Model routing, pipeline orchestration, and secondary interactive flows.
  - `tertiary` (Neon Cyan: `#06b6d4`): Latency monitors, live streaming telemetry, tokens/sec indicators, and micro-luminescent blurs.
- **Monochrome & Text:**
  - `text-primary`: `#fafafa`
  - `text-secondary`: `#a1a1aa`
  - `text-tertiary`: `#71717a`
  - `border-hairline`: `rgba(255, 255, 255, 0.06)`
  - `border-active`: `rgba(99, 102, 241, 0.40)`

### Light Mode Adaptations
When toggled to light mode, the system flips to `#fafafa` base canvas:
- Surfaces shift to `#ffffff` with translucent micro-fills (`rgba(0, 0, 0, 0.02)`).
- Borders resolve to ultra-crisp slate hairlines (`#e4e4e7`).
- Indigo and Violet shift to high-legibility optical depths (`#4f46e5` and `#7c3aed`), preserving WCAG AAA contrast ratios.

## Typography
The typographical hierarchy balances structural technicality with effortless scanning:
- **Headlines (Space Grotesk):** Provides engineered structural flair, tightly tracking large scale titles with sharp terminal geometry.
- **Interface & Prose (Inter):** Maximizes readability in microcopy, dashboard data streams, configuration parameters, and conversational AI traces.
- **Code & Metadata (JetBrains Mono):** Anchors developer telemetry, query outputs, token metrics, payload inspections, and status badges.

## Layout & Spacing
The layout adheres to a strict 8pt base grid (with 4pt sub-ticks for dense code and telemetry displays).

### Grid Structure
- **Desktop (1440px+):** 12-column layout with fixed-width control rails (sidebar pinned at `260px` or collapsed at `64px`), dynamic fluid execution viewport, `1.75rem` gutters, and `2.5rem` outer canvas padding.
- **Tablet (768px - 1439px):** 8-column layout with sliding slide-over drawer drawers, `1.25rem` gutters, and `1.5rem` margins.
- **Mobile (<768px):** Single-column stacked stream with horizontal sliding sub-panes for terminals/code logs, `0.75rem` column gaps, and `1rem` edge margins.

### Rhythmic Density
Console density relies on tight groupings (`space-xs` and `space-sm`) within parameter cards, paired with expansive negative breathers (`space-xl`) separating functional domains (e.g., Prompt Engineering vs. Runtime Telemetry).

## Elevation & Depth
Elevation is generated through optical transparency, frosted acrylic refraction, and luminescent backdrops rather than conventional heavy drop shadows.

### Glassmorphism & Tiers
- **Tier 0 (Canvas Void):** `#09090b` — solid, unlit foundation.
- **Tier 1 (Surface Glass):** `rgba(18, 18, 23, 0.65)` layered over canvas with `backdrop-filter: blur(16px) saturate(180%)`. Border: `1px solid rgba(255, 255, 255, 0.05)`.
- **Tier 2 (Floating Inspect Panels / Modals):** `rgba(24, 24, 32, 0.85)` with `backdrop-filter: blur(24px)`. Border: `1px solid rgba(255, 255, 255, 0.1)`.

### Optical Micro-Glows & Luminescence
- **Idle Containers:** Low-contrast hairline border (`rgba(255, 255, 255, 0.06)`).
- **Focus & Execution Glow:** Interactive card elements and active code inputs project a diffuse micro-glow: `box-shadow: 0 0 20px -4px rgba(99, 102, 241, 0.25), 0 0 8px -2px rgba(6, 182, 212, 0.3)`.
- **Active Streaming Indicator:** Cyan halo pulse effect utilizing `0 0 12px rgba(6, 182, 212, 0.6)`.

## Shapes
The system employs controlled, architectural curvature (`roundedness: 2`).
- **Base Surfaces & Panels:** `0.5rem` (`8px`) border radius provides contemporary precision without appearing toy-like.
- **Cards, Canvas Clusters & Modals:** `rounded-lg` (`1rem` / `16px`) to define distinct glass modular containers.
- **Outer Shells & Command Overlays:** `rounded-xl` (`1.5rem` / `24px`) for ambient overlay surfaces.
- **Badges, Status Chips, & Toggle Triggers:** Strict pill geometry (`9999px`) to maintain sharp visual differentiation between interactive states and functional architectural boundaries.

## Components

### Buttons & Interactive Triggers
- **Primary:** Electric Indigo (`#6366f1`) solid base transitioning subtly to violet (`#8b5cf6`), white high-contrast text, `0.5rem` radius, with a persistent soft Indigo perimeter reflection (`box-shadow: 0 0 12px rgba(99, 102, 241, 0.35)`). Active click states scale to `98%`.
- **Secondary (Glass):** Backdrop blur `rgba(255, 255, 255, 0.03)` with `1px solid rgba(255, 255, 255, 0.08)`. On hover: surface transitions to `rgba(255, 255, 255, 0.07)` with cyan-tinted hairline borders.
- **Ghost / Tool:** Zero background; reveals `rgba(255, 255, 255, 0.05)` fill with micro-scale easing upon hover.

### Chips & Pill Badges
- **Status Pills:** Pill geometry (`rounded-full`), `space-xs` vertical and `space-sm` horizontal padding. Typography: `label-caps` (`JetBrains Mono`).
- **Execution Live Badge:** Frosted black background with a breathing Neon Cyan (`#06b6d4`) micro-dot and matching neon boundary outline (`rgba(6, 182, 212, 0.3)`).
- **Model Tag:** Electric indigo subtle wash fill (`rgba(99, 102, 241, 0.12)`) paired with indigo text (`#818cf8`).

### Input Fields & Code Areas
- **Text Inputs:** Backed with `rgba(18, 18, 23, 0.8)`, inset hairline borders `rgba(255, 255, 255, 0.08)`. Focus states smoothly illuminate border to `#6366f1` and cast a cyan/indigo dual micro-glow.
- **Inline Code Blocks & IDE Prompts:** Embedded dark panels (`#0c0c0e`) framed with top-edge specular highlight (`1px solid rgba(255, 255, 255, 0.08)`), syntax-highlighted using neon cyan, violet, and crisp mint greens.

### Cards & Modular Containers
- Constructed on Tier 1 glass specifications with smooth `200ms` transition states. On cursor presence, ambient radial gradients follow pointer movement across the perimeter hairline (`border-color: rgba(99, 102, 241, 0.4)`).

### Selection Controls (Checkboxes & Radios)
- Custom square (`0.25rem` radius) and circular marks built with dark zinc centers and hairline borders.
- Checked state fills with solid Electric Indigo, centered by a sharp geometric white glyph with an instant `0 0 8px rgba(99, 102, 241, 0.5)` optical glow.

### Specialized AI & Developer Tooling Components
- **Token Streaming Streamer:** Live telemetry readout box utilizing `code-sm`, dynamic character stream animation with blinking neon cyan cursor.
- **Latency & Cost Bar:** Segmented micro-bars showing milliseconds per token, accented by cyan-to-violet linear progression.
- **API Key Reveal Trigger:** High-security monospaced input container with one-click obfuscation toggle, copy confirmation tooltip, and hairline divider accents.