import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { ElementExistsTool } from '../element_exists.js';

describe('ElementExistsTool', () => {
  let browser: Browser;
  let page: Page;
  let tool: ElementExistsTool;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    tool = new ElementExistsTool({} as any);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should return exists for element that exists', async () => {
    await page.setContent(`
      <html>
        <body>
          <button id="submit">Submit</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#submit' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
    expect(result.content[0].text).toContain('button');
  });

  it('should return not found for element that does not exist', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Click Me</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#nonexistent' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✗ not found');
  });

  it('should show element tag and id', async () => {
    await page.setContent(`
      <html>
        <body>
          <button id="login-btn">Login</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#login-btn' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
    expect(result.content[0].text).toContain('button');
    expect(result.content[0].text).toContain('login-btn');
  });

  it('should show element tag and classes', async () => {
    await page.setContent(`
      <html>
        <body>
          <button class="btn btn-primary">Submit</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '.btn' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
    expect(result.content[0].text).toContain('button');
  });

  it('should handle testid shortcuts', async () => {
    await page.setContent(`
      <html>
        <body>
          <button data-testid="submit-button">Submit</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:submit-button' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
  });

  it('should indicate when multiple elements match', async () => {
    await page.setContent(`
      <html>
        <body>
          <button class="btn">Button 1</button>
          <button class="btn">Button 2</button>
          <button class="btn">Button 3</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '.btn' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
    expect(result.content[0].text).toContain('3 matches');
  });

  it('should work with text selectors', async () => {
    await page.setContent(`
      <html>
        <body>
          <button>Click Me</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'text=Click Me' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
  });

  it('should be ultra-compact for simple checks', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="content">Content</div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#content' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    // Response should be very short
    const text = result.content[0].text as string;
    expect(text.length).toBeLessThan(50);
  });

  it('should handle complex selectors', async () => {
    await page.setContent(`
      <html>
        <body>
          <div class="container">
            <button type="submit">Submit</button>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'button[type="submit"]' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('✓ exists');
  });

  it('should work with hidden elements', async () => {
    await page.setContent(`
      <html>
        <body>
          <button style="display: none;">Hidden Button</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'button' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    // Element exists even if hidden
    expect(result.content[0].text).toContain('✓ exists');
  });
});
