/**
 * Get installation instructions for the current context
 */
export function getInstallationInstructions(): string {
  return `
Chromium is not available. To fix this:

1. Install Chrome or Chromium via your OS package manager:
   - Debian/Ubuntu: sudo apt install chromium-browser
   - Alpine:        apk add chromium
   - macOS:         brew install --cask chromium
   - Or set CHROME_EXECUTABLE_PATH to your Chrome/Chromium binary

2. For Firefox/WebKit (optional): install via Playwright:
   npx playwright install firefox webkit
`.trim();
}
