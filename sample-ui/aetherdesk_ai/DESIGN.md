---
name: AetherDesk AI
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 20px
  sidebar-width: 240px
---

## Brand & Style

The design system is engineered for a premium enterprise SaaS environment, specifically tailored for AI-assisted customer operations. The brand personality is **sophisticated, precise, and high-performance**, evoking a sense of calm efficiency in high-pressure support environments.

Drawing inspiration from modern engineering-led design movements like Minimalism and High-Performance Corporate (Linear/Stripe), the style emphasizes:
- **Functional Density:** Optimizing for information-rich interfaces without sacrificing clarity.
- **Polished Precision:** Utilizing subtle gradients, hairline strokes, and refined typography to signal high quality.
- **AI-Native Identity:** Integrating specific visual cues (glows and blurs) to distinguish between human and machine-generated content.

The goal is to provide a UI that feels like a professional tool—unobtrusive when working, yet visually rewarding through subtle interactions and perfect alignment.

## Colors

The color palette is built on a foundation of **Clean White** and **Indigo**, creating an environment of clarity and technical authority. 

- **Primary (Indigo):** Used for primary actions and brand presence.
- **Secondary (Cyan):** Reserved exclusively for AI-driven features, insights, and automated suggestions.
- **Neutrals:** A balanced scale of Slate and Navy grays ensures hierarchy in data-heavy views against the light background.
- **Semantics:** High-saturation tones for status indicators, ensuring critical issues are immediately visible against the professional backdrop.

The design system utilizes a "Light Mode" approach for administrative and reporting tasks, ensuring high legibility and a crisp interface.

## Typography

This design system utilizes a dual-sans-serif approach to balance modern aesthetics with functional legibility.

- **Geist** is employed for headlines and display elements, providing a technical, geometric edge that aligns with the AI-powered nature of the platform.
- **Inter** is the workhorse for body copy and interface elements, chosen for its exceptional readability at small sizes and high-density layouts.
- **JetBrains Mono** is used sparingly for ticket IDs, metadata, and technical logs, reinforcing the "pro-tool" feeling.

The scale is rigorous, utilizing a tight 4px baseline grid to ensure vertical rhythm. Tracking is slightly tightened on larger display styles to maintain a premium, compact look.

## Layout & Spacing

The layout philosophy follows a **systematic grid-based approach** optimized for multi-pane workflows typical of helpdesk platforms.

- **Desktop:** A fixed-width sidebar (240px) with a fluid content area. For data tables, the design adopts a 12-column grid with 20px gutters.
- **Density:** The system supports "Standard" and "Compact" spacing modes. Compact mode reduces vertical padding in tables and lists by 40% for power users.
- **Breakpoints:**
  - **Mobile (<768px):** Single column, hidden sidebar (drawer), simplified navigation.
  - **Tablet (768px - 1024px):** Collapsed sidebar (icons only), fluid body.
  - **Desktop (>1024px):** Full multi-pane view (Inbox -> Conversation -> Customer Details).

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layers** and **Refined Shadows**.

1.  **Level 0 (Base):** The foundation layer. In light mode, this is a clean white or the softest gray.
2.  **Level 1 (Card/Sheet):** Slightly elevated surfaces for primary content. Use a 1px border (#E2E8F0) instead of heavy shadows.
3.  **Level 2 (Popovers/Menus):** Floating elements use "Ambient Shadows"—diffused, low-opacity shadows with a slight Indigo tint to maintain brand cohesion.
4.  **AI Surfaces:** Elements generated by AI (suggestions, summaries) utilize a subtle "Glassmorphism" effect with a 12px backdrop blur and a thin cyan-to-indigo gradient border to distinguish them from human-input areas.

## Shapes

The design system utilizes a **Rounded (8px-12px)** shape language. This softens the technical aesthetic, making the enterprise environment feel more approachable.

- **Standard Elements (Buttons, Inputs):** 8px radius.
- **Containers (Cards, Modals):** 12px radius.
- **Status Pills / AI Highlights:** 100px (Full Pill) to differentiate them from interactive buttons.

This consistent use of curvature creates a cohesive "container-based" UI that feels modular and modern.

## Components

### Buttons
- **Primary:** Solid Indigo background with white text. 
- **Secondary:** Ghost style with a 1px Slate border. 
- **AI Action:** Gradient border (Indigo to Cyan) with a subtle mesh background.
- **States:** Active states should feel "pressed" (scale 0.98), while disabled states use a 40% opacity mask.

### Inputs & Fields
- Focus states must use a 2px Indigo ring with a 2px offset.
- Error states transition the border to Red with a soft red outer glow.

### Data Tables
- Row hover states use a subtle tint shift.
- Column headers use `label-sm` typography with interactive sort icons.
- Vertical lines are omitted; horizontal dividers are 1px soft Slate.

### AI Suggestions (Specialty Component)
- Appearing as "Ghost Cards" with a blurred background. 
- Must include a "feedback" trigger (Thumbs up/down) to train the underlying model.
- Typography within AI cards uses the `Secondary (Cyan)` color for headings.