const { execSync } = require('child_process');
const fs = require('fs');

module.exports = async function globalSetup() {
  try {
    // PLAYWRIGHT_BROWSERS_PATH may have been redirected to ~/.cache by jest.config.cjs
    const { chromium } = require('playwright');
    const execPath = chromium.executablePath();
    if (fs.existsSync(execPath)) return;

    console.log('\nPlaywright browser not found. Installing Chromium...\n');
    execSync('npx playwright install chromium', { stdio: 'inherit' });
  } catch (e) {
    console.warn('\nCould not install Playwright browsers: ' + e.message);
    console.warn('Tests requiring a browser will be skipped.\n');
  }
};
