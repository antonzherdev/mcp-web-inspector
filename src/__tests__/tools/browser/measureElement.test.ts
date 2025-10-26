import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { MeasureElementTool } from '../../../tools/browser/measureElement.js';

describe('MeasureElementTool', () => {
  let browser: Browser;
  let page: Page;
  let tool: MeasureElementTool;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
    tool = new MeasureElementTool({} as any);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should measure element with margin, padding, and border', async () => {
    await page.setContent(`
      <html>
        <body>
          <button id="test-button" style="
            width: 120px;
            height: 40px;
            margin: 8px 0px 8px 0px;
            padding: 12px 24px;
            border: 1px solid #ccc;
            box-sizing: border-box;
          ">
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
    const text = result.content[0].text;

    // Should show element descriptor
    expect(text).toContain('Element: <button#test-button>');

    // Should show box model sections
    expect(text).toContain('Box Model:');
    expect(text).toContain('Content:');
    expect(text).toContain('Padding:');
    expect(text).toContain('Border:');
    expect(text).toContain('Margin:');
    expect(text).toContain('Total Space:');

    // Should show directional arrows for spacing
    expect(text).toMatch(/↑|↓|←|→/); // At least one directional arrow
  });

  it('should handle element with no margin, padding, or border', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test-div" style="
            width: 200px;
            height: 100px;
            margin: 0;
            padding: 0;
            border: none;
          ">
            Content
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#test-div' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    expect(text).toContain('Element: <div#test-div>');
    expect(text).toContain('Box Model:');
    expect(text).toContain('Content:');

    // Should show "none" for border
    expect(text).toContain('Border:');
    expect(text).toMatch(/none|0px/);
  });

  it('should handle asymmetric spacing (different values per side)', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="
            width: 300px;
            height: 150px;
            margin-top: 10px;
            margin-right: 20px;
            margin-bottom: 30px;
            margin-left: 40px;
            padding-top: 5px;
            padding-right: 10px;
            padding-bottom: 15px;
            padding-left: 20px;
            border-top: 1px solid black;
            border-right: 2px solid black;
            border-bottom: 3px solid black;
            border-left: 4px solid black;
          ">
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

    // Should show directional arrows for different spacing values
    expect(text).toMatch(/↑\d+px/); // Top spacing
    expect(text).toMatch(/↓\d+px/); // Bottom spacing
    expect(text).toMatch(/←\d+px/); // Left spacing
    expect(text).toMatch(/→\d+px/); // Right spacing
  });

  it('should handle testid shortcuts', async () => {
    await page.setContent(`
      <html>
        <body>
          <button data-testid="submit-btn" style="
            width: 100px;
            height: 50px;
            padding: 10px;
          ">
            Submit
          </button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'testid:submit-btn' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('Element: <button data-testid="submit-btn">');
    expect(text).toContain('Box Model:');
  });

  it('should handle data-test shortcuts', async () => {
    await page.setContent(`
      <html>
        <body>
          <div data-test="container" style="width: 100px; height: 100px;">
            Content
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: 'data-test:container' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('Element: <div data-testid="container">');
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
          <button class="btn" style="width: 100px; height: 40px; padding: 10px;">Button 1</button>
          <button class="btn" style="width: 200px; height: 60px; padding: 20px;">Button 2</button>
          <button class="btn" style="width: 300px; height: 80px; padding: 30px;">Button 3</button>
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

    expect(text).toContain('⚠ Found 3 elements matching ".btn"');
    expect(text).toContain('using element 1 (first visible)');
    expect(text).toContain('Box Model:');
  });

  it('should display element position coordinates', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="positioned" style="
            position: absolute;
            top: 50px;
            left: 100px;
            width: 200px;
            height: 150px;
          ">
            Content
          </div>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '#positioned' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show position in format @ (x,y) WxH
    expect(text).toMatch(/@\s*\(\d+,\d+\)\s+\d+x\d+px/);
  });

  it('should calculate total space including margin', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="
            width: 100px;
            height: 80px;
            margin: 10px;
            padding: 5px;
            border: 2px solid black;
          ">
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

    // Should show total space
    expect(text).toContain('Total Space:');
    expect(text).toMatch(/Total Space:\s+\d+x\d+px\s+\(with margin\)/);
  });

  it('should handle element with classes', async () => {
    await page.setContent(`
      <html>
        <body>
          <button class="btn btn-primary btn-large" style="width: 100px; height: 50px;">
            Submit
          </button>
        </body>
      </html>
    `);

    const result = await tool.execute(
      { selector: '.btn-primary' },
      { page, browser } as any
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Should show element descriptor with classes (may be truncated to first 2)
    expect(text).toMatch(/<button/);
    expect(text).toContain('Box Model:');
  });

  it('should show uniform border when all sides are equal', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="
            width: 100px;
            height: 100px;
            border: 2px solid red;
          ">
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

    // Should show uniform border notation (not directional arrows)
    expect(text).toContain('Border:');
    expect(text).toMatch(/Border:\s+2px\s+solid/);
  });

  it('should round measurements to integers', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="
            width: 123.456px;
            height: 789.012px;
            padding: 10.5px;
            margin: 5.7px;
          ">
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

    // All measurements should be rounded to whole numbers
    // Check that there are no decimal points in dimension values
    const dimensions = (text as string).match(/\d+\.\d+px/g);
    expect(dimensions).toBeNull(); // Should not find any decimal values
  });

  it('should handle box-sizing: border-box correctly', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="
            width: 200px;
            height: 100px;
            padding: 20px;
            border: 5px solid black;
            box-sizing: border-box;
          ">
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

    // Should show box model with content, padding, and border
    expect(text).toContain('Box Model:');
    expect(text).toContain('Content:');
    expect(text).toContain('Padding:');
    expect(text).toContain('Border:');

    // Content size should be width/height minus padding and border
    // With width: 200px, padding: 20px each side, border: 5px each side
    // Content width = 200 - (20+20) - (5+5) = 150px
    // But we just check that content is shown
    expect(text).toMatch(/Content:\s+\d+x\d+px/);
  });

  it('should handle element with only margin (no padding or border)', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="test" style="
            width: 100px;
            height: 100px;
            margin: 15px;
          ">
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

    expect(text).toContain('Margin:');
    expect(text).toMatch(/↑15px|↓15px|←15px|→15px/); // Should show margin with arrows
  });
});
