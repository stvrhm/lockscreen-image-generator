import { fluidSpace, fluidType, generatedThemeCss, leading, weights } from './generated-theme.ts'

export const THEME_COLOR = '#15171b'

export const theme = {
  space: fluidSpace,
  radius: { sm: '8px', md: '12px', lg: '20px', full: '999px' },
  fontSize: fluidType,
  fontWeight: weights,
  leading,
} as const

export const baseCss = `${generatedThemeCss}
  :root {
    color-scheme: dark;
    --page: #0a0a0b;
    --surface: #111113;
    --surface-2: #19191c;
    --surface-3: #222226;
    --border: #2a2a2f;
    --border-subtle: rgba(255, 255, 255, 0.08);
    --text: #f2f4f7;
    --text-muted: #9aa3af;
    --accent: #7dd3fc;
    --accent-strong: #38bdf8;
    --danger: #f07178;
    --radius: ${theme.radius.md};
    --shadow-soft: 0 12px 40px rgba(0, 0, 0, 0.24);
    --space-xs: ${fluidSpace.xs};
    --space-sm: ${fluidSpace.sm};
    --space-md: ${fluidSpace.md};
    --space-lg: ${fluidSpace.lg};
    --space-xl: ${fluidSpace.xl};
    --space-xxl: ${fluidSpace.xxl};
    --gutter: var(--space-lg);
    --flow-space: var(--space-md);
    --stroke-width: 1px;
    --stroke: var(--stroke-width) solid var(--border);
    --focus-color: var(--accent);
    --focus-offset: 0.2lh;
    --font: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    --font-display: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  /* App chrome. The reset is app/ui/public/reset.css. Layout spacing remains owned by Cube compositions. */
  body {
    min-height: 100dvh;
    font-size-adjust: from-font;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    display: flex;
    flex-direction: column;
    background: radial-gradient(1000px 520px at 12% -10%, rgba(37, 99, 235, 0.16) 0%, transparent 58%), radial-gradient(900px 500px at 100% 0%, rgba(14, 116, 144, 0.12) 0%, transparent 52%), var(--page);
    color: var(--text);
    font-family: var(--font);
    font-size: var(--font-size-body);
    line-height: var(--leading-standard);
    margin: 0;
  }

  /* Global element policy. */
  :is(h1, h2, h3, h4) {
    font-family: var(--font-display);
    line-height: 1.2;
    font-weight: var(--font-weight-bold, 700);
  }
  h1 { font-size: var(--font-size-h1); max-width: 25ch; }
  h2 { font-size: var(--font-size-h2); max-width: 35ch; }
  h3 { font-size: var(--font-size-h3); max-width: 35ch; }
  :is(h4, h5, h6) { font-size: var(--font-size-body); }

  :is(code, kbd, samp) {
    box-decoration-break: clone;
    font-family: var(--font-mono);
    hyphens: none;
    padding: 0.2em 0.2em 0.05em;
    tab-size: 2;
    text-align: left;
    word-break: normal;
    word-spacing: normal;
    word-wrap: normal;
  }
  @supports not (font-size-adjust: from-font) {
    :is(code, kbd, samp) { font-size: 0.8em; }
  }
  pre:has(code) { width: max-content; max-width: 100%; overflow-x: auto; }
  pre code { background: none; border: 0; padding: 0; }
  kbd { border: var(--stroke); padding-block-end: 0.1em; }
  var { font-style: normal; font-weight: var(--font-weight-medium, 500); }
  q { font-style: italic; }

  ul:not([class]) { padding-inline-start: 1.7ch; list-style-type: disc; }
  ul:not([class]) > li { padding-inline-start: var(--space-xs); }
  ul ::marker { font-size: 0.8lh; }
  ol ::marker { font-size: 1em; font-weight: var(--font-weight-bold, 700); }
  [role='list'][class], [role='tablist'][class] { margin-block: 0; padding: 0; }

  :is(video, iframe[src*='youtube'], iframe[src*='vimeo']) {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
  figcaption { padding-block-start: 0.5em; font-size: var(--font-size-md, 16px); font-family: var(--font-mono); }
  table { border: var(--stroke); border-collapse: collapse; width: 100%; }
  th { text-align: left; font-weight: var(--font-weight-bold, 700); line-height: 1.1; }
  thead th { padding-block: var(--space-sm); }
  td, th { padding: var(--space-xs) var(--space-sm); }
  th:not(:only-of-type) { border-block-end: var(--stroke); }
  th:only-of-type { border-inline-end: var(--stroke); }
  :is(th, td) ~ :is(th, td) { border-inline-start: var(--stroke); }
  tr + tr :is(th, td) { border-block-start: var(--stroke); }
  caption { caption-side: bottom; margin-block-start: var(--space-sm); }

  a:not([class]) { color: currentColor; text-underline-offset: 0.2lh; }
  a:hover { color: var(--accent); text-underline-offset: 0.1lh; }
  :is(h1, h2, h3, h4) a:not([class]) { text-decoration-thickness: 0.2ex; text-underline-offset: 0.2ex; }
  :is(h1, h2, h3, h4) a { text-underline-offset: 0.3ex; }
  :focus { outline: none; }
  :focus-visible { outline: 2px solid var(--focus-color); outline-offset: var(--focus-offset); }
  ::selection { color: var(--page); background: var(--text); }
  hr { border: 0; border-block-start: var(--stroke); margin-block: var(--flow-space, 1em); }
  svg:not([class]) { width: auto; height: 1lh; }
  svg { flex-shrink: 0; }

  form > * + * { margin-block-start: var(--flow-space, 1rem); }
  :is(input, select, textarea) { accent-color: var(--accent); }
  :is(input:not([type='checkbox'], [type='radio'], [type='color']), select, textarea) {
    display: block;
    width: 100%;
    padding: 0.5em 0.8em;
    border: var(--stroke);
    background: var(--surface);
    color: var(--text);
  }
  :is(input, select, textarea)::placeholder { color: var(--text-muted); opacity: 1; }
  label { line-height: 1.1; font-weight: var(--font-weight-medium, 500); }
  input:disabled { background: var(--surface-2); cursor: not-allowed; }
  input:disabled, label input:disabled + * { cursor: not-allowed; }
  fieldset { padding: var(--space-sm); border: var(--stroke); }
  legend { padding-inline: 1ex; padding-block: 0.75ex; font-weight: var(--font-weight-medium, 500); }
  summary { font-weight: var(--font-weight-bold, 700); cursor: pointer; }
  details[open] summary { margin-block-end: var(--space-sm); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`
