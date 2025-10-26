import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { GetComputedStylesTool } from '../../../tools/browser/computedStyles.js';

describe('GetComputedStylesTool', () => {
  let browser: Browser;
  let page: Page;
  let tool: GetComputedStylesTool;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    tool = new GetComputedStylesTool({} as any);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should return default computed styles', async () => {
    await page.setContent(`
      <html>
        <body>
          <button id="test-button" style="width: 120px; height: 40px; display: inline-block;">
            Click Me
          </button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#test-button' },
      { page, browser } as any
    );

    if (result.isError) {
      console.log('Error:', result.content[0].text);
    }
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Computed Styles');
    expect(result.content[0].text).toContain('Layout:');
    expect(result.content[0].text).toContain('display:');
    expect(result.content[0].text).toContain('width:');
    expect(result.content[0].text).toContain('height:');
  });

  it('should return specific CSS properties when requested', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test-div" style="color: red; font-size: 16px; background-color: blue;">
            Test Content
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#test-div', properties: 'color,font-size,background-color' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('color:');
    expect(result.content[0].text).toContain('font-size:');
    expect(result.content[0].text).toContain('background-color:');
  });

  it('should group styles by category', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="display: block; opacity: 0.5; margin: 10px; font-size: 14px;">
            Content
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#test' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Check for category headers
    expect(text).toContain('Layout:');
    expect(text).toContain('Visibility:');
    expect(text).toContain('Spacing:');
    expect(text).toContain('Typography:');
  });

  it('should handle testid shortcuts', async () => {
    await page.setContent(`
      <html>
        <body>
          <button data-testid="submit-btn" style="width: 100px;">Submit</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:submit-btn' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Computed Styles');
    expect(result.content[0].text).toContain('width:');
  });

  it('should return error when element not found', async () => {
    await page.setContent(`
      <html>
        <body>
          <div>Content</div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#nonexistent' },
      { page, browser } as any
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Operation failed: No elements found');
  });

  it('should handle multiple elements with warning (use first)', async () => {
    await page.setContent(`
      <html>
        <body>
          <button class="btn" style="width: 100px;">Button 1</button>
          <button class="btn" style="width: 200px;">Button 2</button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '.btn' },
      { page, browser } as any
    );

    // Should NOT error, should use first element with warning
    expect(result.isError).toBe(false);
    const text = result.content[0].text;
    expect(text).toContain('⚠ Found 2 elements matching ".btn"');
    expect(text).toContain('using element 1 (first visible)');
    expect(result.content[0].text).toContain('Computed Styles');
    // Should show styles from first button (100px width)
    expect(result.content[0].text).toContain('width:');
  });

  it('should display element info with classes', async () => {
    await page.setContent(`
      <html>
        <body>
          <button id="my-btn" class="btn btn-primary" data-testid="submit">
            Submit
          </button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#my-btn' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Computed Styles:');
    // Should show element identifier
    expect(result.content[0].text).toMatch(/<button/);
  });

  it('should handle opacity and visibility styles', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="opacity: 0.8; visibility: visible;">Content</div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#test', properties: 'opacity,visibility' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('opacity:');
    expect(result.content[0].text).toContain('visibility:');
  });
});
