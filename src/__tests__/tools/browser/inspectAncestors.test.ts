import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { InspectAncestorsTool } from '../../../tools/browser/ancestorInspection.js';

describe('InspectAncestorsTool', () => {
  let browser: Browser;
  let page: Page;
  let tool: InspectAncestorsTool;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    tool = new InspectAncestorsTool({} as any);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should show ancestor chain with layout properties', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="max-width: 1600px; margin: 0 auto;">
            <div style="width: 1216px;">
              <header data-testid="test-header" style="max-width: 896px; margin: 0 auto; border-bottom: 1px solid #ccc;">
                <h1>Title</h1>
              </header>
            </div>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:test-header' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show ancestor chain header
    expect(text).toContain('Ancestor Chain: testid:test-header');

    // Should show the header element itself [0]
    expect(text).toContain('[0] <header>');
    expect(text).toContain('testid:test-header');

    // Should show parent div [1]
    expect(text).toContain('[1] <div>');

    // Should show position and size for each ancestor
    expect(text).toMatch(/@\s+\(\d+,\d+\)\s+\d+x\d+px/); // Position format

    // Should show width information
    expect(text).toContain('w:');

    // Should show max-width constraint
    expect(text).toContain('max-w:');

    // Should show border info (only for header)
    expect(text).toContain('border');
  });

  it('should detect and report auto margins (centering)', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0; width: 1920px;">
          <div style="max-width: 896px; margin: 0 auto;">
            <button data-testid="centered-button">Click</button>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:centered-button' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should detect auto margins causing centering
    expect(text).toMatch(/auto.*margin|margin.*auto/i);
  });

  it('should detect overflow:hidden clipping', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="overflow: hidden; width: 500px; height: 300px;">
            <div style="width: 200px;">
              <p data-testid="clipped-content">This content may be clipped</p>
            </div>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:clipped-content' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should detect overflow:hidden
    expect(text).toContain('overflow');
    expect(text).toContain('hidden');

    // Should show clipping diagnostic
    expect(text).toContain('CLIPPING POINT');
  });

  it('should respect limit parameter', async () => {
    await page.setContent(`
      <html>
        <body>
          <div><div><div><div><div><div><div><div>
            <span data-testid="deep-element">Deep</span>
          </div></div></div></div></div></div></div></div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:deep-element', limit: 3 },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should only show 3 ancestors
    expect(text).toContain('[0]');
    expect(text).toContain('[1]');
    expect(text).toContain('[2]');
    expect(text).not.toContain('[3]'); // Should stop at limit
  });

  it('should not show default values (border:none, overflow:visible)', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="width: 500px;">
            <p data-testid="normal-element">Normal paragraph</p>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:normal-element' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text as string;

    // Should NOT show "border: none" or "overflow: visible" (defaults omitted)
    // Check that if overflow appears, it's NOT "visible"
    if (text.includes('overflow')) {
      expect(text).not.toMatch(/overflow:\s*visible/);
    }

    // Should still show position and width
    expect(text).toMatch(/@\s+\(\d+,\d+\)/);
    expect(text).toContain('w:');
  });

  it('should show directional borders separately when different', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="border-bottom: 2px solid red; border-top: 1px solid blue; padding: 10px;">
            <span data-testid="bordered-element">Content</span>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:bordered-element' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show directional border information for the parent div [1]
    expect(text).toContain('border');
    // Should show "top:" and "bottom:" for directional borders
    expect(text).toMatch(/top:|bottom:/);
  });

  it('should handle testid shortcuts', async () => {
    await page.setContent(`
      <html>
        <body>
          <div>
            <button data-testid="my-button">Click</button>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:my-button' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    expect(text).toContain('Ancestor Chain: testid:my-button');
    expect(text).toContain('[0] <button>');
    expect(text).toContain('testid:my-button');
  });

  it('should return error for non-existent element', async () => {
    await page.setContent(`
      <html><body><div>Content</div></body></html>
    `);

    const result = await tool.execute(
      { selector: 'testid:does-not-exist' },
      { page, browser } as any
    );

    expect(result.isError).toBeTruthy();
    const text = result.content[0].text;
    expect(text).toContain('Element not found');
    expect(text).toContain('testid:does-not-exist');
  });

  it('should detect width constraints from parent', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <main style="max-width: 800px; margin: 0 auto;">
              <article data-testid="content">
                <p>Article content</p>
              </article>
            </main>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:content' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show multiple max-width constraints
    expect(text).toMatch(/max-w:.*\d+px/);

    // Should show WIDTH CONSTRAINT diagnostic
    expect(text).toContain('WIDTH CONSTRAINT');
  });

  it('should show overflow-x and overflow-y when different', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="overflow-x: hidden; overflow-y: auto; width: 500px; height: 300px;">
            <div data-testid="scrollable-content">
              <p>Scrollable content here</p>
            </div>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:scrollable-content' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show both overflow-x and overflow-y when different
    expect(text).toMatch(/overflow-x.*overflow-y|overflow.*hidden.*auto/);
  });

  it('should show flexbox layout context', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 16px;">
            <button data-testid="flex-child">Button</button>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:flex-child' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show flex context
    expect(text).toContain('flex');
    expect(text).toContain('column');
    expect(text).toContain('justify:center');
    expect(text).toContain('gap:16px');
  });

  it('should show grid layout context', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="display: grid; grid-template-columns: 1fr 2fr; grid-template-rows: auto auto; gap: 8px;">
            <div data-testid="grid-child">Cell</div>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:grid-child' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show grid context (note: computed values, not CSS values)
    expect(text).toContain('grid');
    expect(text).toMatch(/cols:\d+px \d+px/); // Computed pixel values
    expect(text).toMatch(/rows:\d+px \d+px/); // Computed pixel values
    expect(text).toContain('gap:8px');
  });

  it('should show margin details with arrows for non-uniform margins', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 0;">
          <div style="margin: 10px 20px 30px 40px;">
            <span data-testid="margin-element">Content</span>
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:margin-element' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show margin with directional arrows
    expect(text).toContain('margin:');
    expect(text).toMatch(/↑10px.*→20px.*↓30px.*←40px/);
  });
});
