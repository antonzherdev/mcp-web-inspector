import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { FindByTextTool } from '../../../tools/browser/findByText.js';

describe('FindByTextTool', () => {
  let browser: Browser;
  let page: Page;
  let tool: FindByTextTool;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    tool = new FindByTextTool({} as any);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should find elements by partial text match', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Sign In</button>
          <a href="/signin">Sign in to your account</a>
          <span>Please sign in to continue</span>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Sign in' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found');
    expect(result.content[0].text).toContain('Sign');
  });

  it('should find elements with exact text match', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Login</button>
          <button>Login Now</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Login', exact: true },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('1 element');
  });

  it('should respect case sensitivity', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>SUBMIT</button>
          <button>submit</button>
          <button>Submit</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'submit', caseSensitive: true },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    // Should only find the lowercase "submit"
    expect(result.content[0].text).toContain('1 element');
  });

  it('should return not found when no elements match', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Click Me</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Not Found' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('No elements found');
  });

  it('should limit results to specified number', async () => {
    await page.setContent(`
      <html>
        <body>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
          <div>Item 5</div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Item', limit: 3 },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('showing first 3');
  });

  it('should show visibility and interaction state', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Visible Button</button>
          <button style="display: none;">Hidden Button</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Button' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ visible');
    expect(result.content[0].text).toContain('⚡ interactive');
  });

  it('should include position information', async () => {
    await page.setContent(`
      <html>
        <body>
          <button style="position: absolute; top: 100px; left: 200px; width: 120px; height: 40px;">
            Click Me
          </button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Click Me' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toMatch(/@\s*\(\d+,\d+\)\s*\d+x\d+px/);
  });

  it('should identify elements with test IDs', async () => {
    await page.setContent(`
      <html>
        <body>
          <button data-testid="submit-button">Submit</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: 'Submit' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('data-testid="submit-button"');
  });
});
