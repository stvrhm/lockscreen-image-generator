export const THEME_COLOR = '#15171b'

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
    --radius: 12px;
    --font: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
    --font-display: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(1200px 600px at 10% -10%, #1c2a3a 0%, transparent 55%),
      radial-gradient(900px 500px at 100% 0%, #24301f 0%, transparent 50%),
      var(--page);
    color: var(--text);
    font-family: var(--font);
    -webkit-font-smoothing: antialiased;
  }

  button, input, textarea, select {
    font: inherit;
  }

  a { color: inherit; }

  @keyframes loading-spin {
    to { transform: rotate(360deg); }
  }
`
