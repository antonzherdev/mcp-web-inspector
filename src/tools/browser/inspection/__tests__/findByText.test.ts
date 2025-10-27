import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { FindByTextTool } from '../find_by_text.js';

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

  it('should support regex patterns for advanced matching', async () => {
    await page.setContent(`
      <html>
        <body>
          <div>3 items</div>
          <div>10 items</div>
          <div>No items</div>
          <div>100 items</div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: '/\\d+ items?/', regex: true },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 3 elements'); // Matches "3 items", "10 items", "100 items"
    expect(result.content[0].text).toContain('3 items');
    expect(result.content[0].text).toContain('10 items');
    expect(result.content[0].text).toContain('100 items');
    // "No items" should not be in the results
  });

  it('should support regex with case insensitive flag', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Sign In</button>
          <button>SIGN OUT</button>
          <button>sign up</button>
          <button>Login</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: '/sign/i', regex: true },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 3 elements');
    expect(result.content[0].text).toContain('Sign In');
    expect(result.content[0].text).toContain('SIGN OUT');
    expect(result.content[0].text).toContain('sign up');
    expect(result.content[0].text).not.toContain('Login');
  });

  it('should support complex regex patterns', async () => {
    await page.setContent(`
      <html>
        <body>
          <span>Price: $29.99</span>
          <span>Price: €15.50</span>
          <span>Price: £100.00</span>
          <span>Free</span>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: '/Price:\\s*[$€£]\\d+\\.\\d+/', regex: true },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 3 elements');
    expect(result.content[0].text).toContain('$29.99');
    expect(result.content[0].text).toContain('€15.50');
    expect(result.content[0].text).toContain('£100.00');
    expect(result.content[0].text).not.toContain('Free');
  });

  it('should handle invalid regex gracefully', async () => {
    await page.setContent(`
      <html>
        <body>
          <div>Test</div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { text: '/[invalid(/', regex: true },
      { page, browser } as any
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid regex pattern');
  });
});
