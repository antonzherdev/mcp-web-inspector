/**
 * Get installation instructions for the current context
 */
export function getInstallationInstructions(): string {
  return `
Chromium is not available. To fix this:

1. Run: npm install (installs bundled Chromium via @playwright/browser-chromium)

2. Or set CHROME_EXECUTABLE_PATH to your Chrome/Chromium binary

3. For Firefox/WebKit (optional): npx playwright install firefox webkit
`.trim();
}
