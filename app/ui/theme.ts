export const THEME_COLOR = '#15171b'

const SPACE = {
  none: '0',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '40px',
} as const

export const theme = {
  space: SPACE,
  radius: { sm: '8px', md: '12px', lg: '20px', full: '999px' },
  fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '20px', xl: '28px' },
  fontWeight: { medium: 500, semibold: 600, bold: 700 },
} as const

export const baseCss = `
  :root {
    color-scheme: dark;
    --page: #0f1114;
    --surface: #1a1d22;
    --surface-2: #23272e;
    --border: #2e343d;
    --text: #f2f4f7;
    --text-muted: #9aa3af;
    --accent: #5eb8ff;
    --danger: #f07178;
    --radius: ${theme.radius.md};
    --space-xs: ${SPACE.xs};
    --space-sm: ${SPACE.sm};
    --space-md: ${SPACE.md};
    --space-lg: ${SPACE.lg};
    --space-xl: ${SPACE.xl};
    --space-xxl: ${SPACE.xxl};
    --gutter: var(--space-lg);
    --flow-space: 1em;
    --stroke-width: 1px;
    --stroke: var(--stroke-width) solid var(--border);
    --focus-color: var(--accent);
    --focus-offset: 0.2lh;
    --font: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    --font-display: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  /* Modern reset, adapted from Walk the Line's global reset. */
  *, *::before, *::after { box-sizing: border-box; }
  html {
    -moz-text-size-adjust: none;
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
  }
  body, h1, h2, h3, h4, p, figure, blockquote, dl, dd { margin-block: 0; }
  ul[role='list'], ol[role='list'] { list-style: none; }
  body {
    min-height: 100vh;
    min-height: 100dvh;
    line-height: 1.5;
    font-size-adjust: from-font;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    display: flex;
    flex-direction: column;
    background: radial-gradient(1200px 600px at 10% -10%, #1c2a3a 0%, transparent 55%), radial-gradient(900px 500px at 100% 0%, #24301f 0%, transparent 50%), var(--page);
    color: var(--text);
    font-family: var(--font);
  }
  h1, h2, h3, h4, button, input, label { line-height: 1.1; }
  h1, h2, h3, h4 { text-wrap: balance; }
  a:not([class]) { color: currentColor; text-decoration-skip-ink: auto; }
  img, picture { display: block; max-width: 100%; }
  input, button, textarea, select { font: inherit; }
  textarea:not([rows]) { min-height: 10em; }
  :target { scroll-margin-block: 5ex; }

  /* Global element policy. Layout spacing remains owned by Cube compositions. */
  :is(h1, h2, h3, h4) {
    font-family: var(--font-display);
    line-height: 1.2;
    font-weight: var(--font-weight-bold, 700);
  }
  h1 { font-size: clamp(28px, 7vw, 40px); max-width: 25ch; }
  h2 { font-size: 28px; max-width: 35ch; }
  h3 { font-size: 22px; max-width: 35ch; }
  :is(h4, h5, h6) { font-size: 18px; }

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

  a { color: currentColor; text-underline-offset: 0.2lh; }
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
