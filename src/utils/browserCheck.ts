import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve package root so npx uses this package's Playwright,
// not whatever is in the caller's working directory.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..', '..');

/**
 * Check if Playwright browsers are installed
 * Returns true if browsers are available, false otherwise
 */
export function checkBrowsersInstalled(): { installed: boolean; message?: string } {
  try {
    // Check if playwright is available
    const result = execSync('npx playwright --version', {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: PACKAGE_ROOT,
    });

    // If we got here, playwright CLI is available
    // Now check if browsers are actually installed
    // Playwright stores browsers in a cache directory
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      return {
        installed: false,
        message: 'Could not determine home directory to check for browsers'
      };
    }

    // Common browser cache locations
    const possibleCacheDirs = [
      join(homeDir, '.cache', 'ms-playwright'),  // Linux
      join(homeDir, 'Library', 'Caches', 'ms-playwright'),  // macOS
      join(homeDir, 'AppData', 'Local', 'ms-playwright'),  // Windows
    ];

    const cacheExists = possibleCacheDirs.some(dir => existsSync(dir));

    if (!cacheExists) {
      return {
        installed: false,
        message: 'Playwright browsers not found in cache directories'
      };
    }

    return { installed: true };
  } catch (error) {
    return {
      installed: false,
      message: `Playwright check failed: ${(error as Error).message}`
    };
  }
}

/**
 * Get installation instructions for the current context
 */
export function getInstallationInstructions(): string {
  return `
Playwright browsers are not installed. To fix this, run one of the following commands:

1. In your project directory:
   npx playwright install chromium firefox webkit

2. If you installed mcp-web-inspector globally:
   cd $(npm root -g)/mcp-web-inspector && npx playwright install chromium firefox webkit

3. Or install system-wide with dependencies (requires admin/sudo):
   npx playwright install --with-deps chromium firefox webkit

For GitHub Copilot or VS Code users, you may need to:
- Close and reopen your IDE after installation
- Or run: npx playwright install chromium
`.trim();
}
