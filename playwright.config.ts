import { defineConfig } from 'playwright/test'

// Test devices are phones, so browser coverage runs at a phone viewport.
export default defineConfig({
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  use: {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    navigationTimeout: 10_000,
    actionTimeout: 5_000,
  },
})
