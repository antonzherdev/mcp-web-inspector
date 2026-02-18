import { chromium } from 'playwright';
import fs from 'fs';

/**
 * Check synchronously whether the Playwright Chromium executable is available.
 * Use this to conditionally skip entire describe blocks:
 *
 *   const d = browserAvailable ? describe : describe.skip;
 *   d('MySuite', () => { ... });
 */
export const browserAvailable: boolean = fs.existsSync(chromium.executablePath());
