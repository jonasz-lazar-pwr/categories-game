# rules/frontend/styling.md

> Read before implementing any UI feature. Defines styling conventions and design principles.

---

## 1. Stack

| Tool            | Role                                                                 |
| --------------- | -------------------------------------------------------------------- |
| Tailwind CSS v4 | Utility-first styling, configured via CSS                            |
| Fontsource      | Self-hosted fonts — imported as npm packages, zero external requests |
| CSS variables   | All design tokens defined once in `src/assets/main.css` via `@theme` |

Tailwind v4 has no `tailwind.config.js` — all configuration lives in `src/assets/main.css`.

## 2. Constraints

| Rule                                                           | Violation                                     |
| -------------------------------------------------------------- | --------------------------------------------- |
| No `<style>` blocks in components                              | `<style scoped>` in any `.vue` file           |
| All design tokens only in `src/assets/main.css` under `@theme` | CSS variable defined inside a component       |
| Custom keyframes only in `src/assets/main.css`                 | `@keyframes` inside a component               |
| Never load fonts from external CDN — use Fontsource            | `<link>` to Google Fonts in `index.html`      |
| Never use `h-screen` — always `min-h-[100dvh]`                 | `class="h-screen"` on full-height sections    |
| Never use flex percentage math — always CSS Grid               | `w-[calc(33%-1rem)]` instead of `grid-cols-3` |
| Animate only `transform` and `opacity`                         | Animating `top`, `left`, `width`, `height`    |
| No JavaScript animation libraries                              | Importing Framer Motion, GSAP, or similar     |

## 3. Design Tokens

All tokens defined once in `src/assets/main.css`. Structure follows this pattern — values are project-specific:

```css
@import 'tailwindcss';
@import '@fontsource-variable/[chosen-font]';

@theme {
  /* Typography */
  --font-sans: '[Chosen Font]', ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;

  /* Fluid type scale — use clamp() so sizes scale between breakpoints */
  --font-size-sm: clamp(…);
  --font-size-base: clamp(…);
  --font-size-lg: clamp(…);
  /* etc. */

  /* Fluid spacing — scales with viewport */
  --spacing-1: clamp(…);
  /* etc. */

  /* Colors — one accent, neutral base, semantic tokens */
  --color-background: …;
  --color-foreground: …;
  --color-primary: …;
  --color-primary-foreground: …;
  --color-muted: …;
  --color-muted-foreground: …;
  --color-border: …;
  --color-destructive: …;
  --color-success: …;
  --color-warning: …;

  /* Radius */
  --radius-sm: …;
  --radius-md: …;
  --radius-lg: …;

  /* Transitions — define easing once, reuse everywhere */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 150ms var(--ease-out-expo);
  --transition-normal: 300ms var(--ease-out-expo);
}

.dark {
  /* Override only color tokens — never structure tokens */
  --color-background: …;
  --color-foreground: …;
}
```

## 4. Typography

**Font selection** — choose a font with personality and good Polish character support (ą, ę, ó, ś, ź, ż). Install via Fontsource (`npm install @fontsource-variable/[name]`). Avoid fonts that are overused to the point of genericness.

**Scale** — use fluid type scale with `clamp()` so text scales smoothly between mobile and desktop without breakpoint jumps.

**Usage conventions:**

- Headings: `tracking-tighter leading-none`
- Body paragraphs: `leading-relaxed max-w-[65ch]`
- Control hierarchy through font weight and color — not through size alone
- No serif fonts in application UI

## 5. Colors

- One accent color per project — saturation below 80%
- Neutral base (Zinc or Slate family) + one expressive accent
- Never mix warm and cool grays in the same project
- Avoid pure black (`#000000`) — use a dark neutral with slight warmth or coolness
- Primary color needs a separate dark mode value — lighter variant to maintain contrast on dark background
- Dark mode overrides only color tokens — never touches typography or spacing tokens

## 6. Layout

- Center content with `max-w-7xl mx-auto`
- Standardize on Tailwind breakpoints: `sm`, `md`, `lg`, `xl`
- Prefer CSS Grid for two-dimensional layouts, Flexbox for one-dimensional
- Avoid symmetric three-column card grids — use asymmetric proportions or varied layouts

## 7. Component Styling

Write utility classes directly in the template. Extract to a child component when a class list becomes unreadable — never extract to `<style>`.

```vue
<!-- Correct — utilities in template -->
<button
  class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
>
  Submit
</button>

<!-- Wrong — style block -->
<style scoped>
.btn {
  @apply rounded-lg bg-primary px-4 py-2;
}
</style>
```

## 8. Animations

CSS transitions only. Animate `transform` and `opacity` exclusively — never layout properties.

Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)` — defined as `--ease-out-expo` in `@theme`.

Active state feedback on all interactive elements: `active:scale-[0.98]` or `active:-translate-y-px`.

## 9. UI States

Every interactive component must handle all states — no exceptions:

| State    | Approach                                                     |
| -------- | ------------------------------------------------------------ |
| Loading  | Skeleton matching the layout shape — never a generic spinner |
| Empty    | Intentional empty state with a clear action or instruction   |
| Error    | Inline message directly below the failing element            |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none`          |

## 10. Forms

- Label always above input
- Helper text below label, error message below input
- Consistent `gap-2` between form blocks

## 11. Responsive Design

Mobile-first always — base styles for mobile, breakpoint prefixes for larger screens.

```vue
<!-- Correct -->
<div class="flex flex-col gap-4 md:flex-row md:gap-8">

<!-- Wrong -->
<div class="flex flex-row gap-8 sm:flex-col sm:gap-4">
```
