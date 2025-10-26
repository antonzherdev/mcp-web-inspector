/**
 * Test to reproduce the console log issue with navigation.
 *
 * Issue: After navigating to a page and clicking, console logs don't appear
 * when calling get_console_logs - only older logs are returned.
 */

import { handleToolCall } from '../../toolHandler.js';
import { jest } from '@jest/globals';

const mockServer = {
  sendMessage: jest.fn()
};

describe('Console logs after navigation - Bug Reproduction', () => {
  afterEach(async () => {
    // Clean up by closing the browser
    await handleToolCall('close', {}, mockServer);
  });

  test('should capture console logs after simple navigation', async () => {
    // Create a page with console logs
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Test Page</h1>
          <button id="myButton">Click Me</button>
          <script>
            console.log('Page loaded - initial log');

            document.getElementById('myButton').addEventListener('click', function() {
              console.log('Button was clicked!');
            });
          </script>
        </body>
      </html>
    `;
    const dataUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;

    console.log('\n=== Step 1: Navigate to page ===');
    const navResult = await handleToolCall('navigate', { url: dataUrl, headless: true }, mockServer);
    expect(navResult.isError).toBe(false);

    // Wait for page to fully load and console messages to fire
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n=== Step 2: Get console logs after navigation ===');
    const logsAfterNav = await handleToolCall('get_console_logs', {}, mockServer);
    console.log('Result:', JSON.stringify(logsAfterNav, null, 2));
    expect(logsAfterNav.isError).toBe(false);
    const logsAfterNavText = logsAfterNav.content.map((c: any) => c.text).join('\n');
    console.log('Logs after navigation:', logsAfterNavText);

    // Should see the initial log
    expect(logsAfterNavText).toContain('Page loaded - initial log');

    console.log('\n=== Step 3: Click button ===');
    const clickResult = await handleToolCall('click', { selector: '#myButton' }, mockServer);
    expect(clickResult.isError).toBe(false);

    // Wait for click event and console message
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n=== Step 4: Get console logs after click ===');
    const logsAfterClick = await handleToolCall('get_console_logs', { since: 'last-interaction' }, mockServer);
    console.log('Result:', JSON.stringify(logsAfterClick, null, 2));
    const logsAfterClickText = logsAfterClick.content.map((c: any) => c.text).join('\n');
    console.log('Logs after click:', logsAfterClickText);

    // Should see the button click log
    expect(logsAfterClickText).toContain('Button was clicked!');
  }, 30000);

  test('should capture logs from second navigation', async () => {
    // First page
    const html1 = `
      <!DOCTYPE html>
      <html>
        <head><title>Page 1</title></head>
        <body>
          <h1>Page 1</h1>
          <script>console.log('Log from page 1');</script>
        </body>
      </html>
    `;
    const dataUrl1 = `data:text/html;base64,${Buffer.from(html1).toString('base64')}`;

    console.log('\n=== Navigate to page 1 ===');
    await handleToolCall('navigate', { url: dataUrl1, headless: true }, mockServer);
    await new Promise(resolve => setTimeout(resolve, 300));

    const logs1 = await handleToolCall('get_console_logs', { since: 'last-navigation' }, mockServer);
    const logs1Text = logs1.content.map((c: any) => c.text).join('\n');
    console.log('Logs from page 1:', logs1Text);
    expect(logs1Text).toContain('Log from page 1');

    // Second page
    const html2 = `
      <!DOCTYPE html>
      <html>
        <head><title>Page 2</title></head>
        <body>
          <h1>Page 2</h1>
          <script>console.log('Log from page 2 - THIS IS NEW');</script>
        </body>
      </html>
    `;
    const dataUrl2 = `data:text/html;base64,${Buffer.from(html2).toString('base64')}`;

    console.log('\n=== Navigate to page 2 ===');
    await handleToolCall('navigate', { url: dataUrl2, headless: true }, mockServer);
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('\n=== Get logs since last navigation ===');
    const logs2 = await handleToolCall('get_console_logs', { since: 'last-navigation' }, mockServer);
    const logs2Text = logs2.content.map((c: any) => c.text).join('\n');
    console.log('Logs from page 2:', logs2Text);

    // This is the key test - do we see the NEW logs from page 2?
    expect(logs2Text).toContain('Log from page 2 - THIS IS NEW');

    // Should NOT see old logs from page 1 when using since: last-navigation
    expect(logs2Text).not.toContain('Log from page 1');
  }, 30000);

  test('should show all logs when no filter is applied', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            console.log('First log');
            setTimeout(() => console.log('Second log'), 100);
          </script>
        </body>
      </html>
    `;
    const dataUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;

    await handleToolCall('navigate', { url: dataUrl, headless: true }, mockServer);
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n=== Get ALL logs (no filter) ===');
    const allLogs = await handleToolCall('get_console_logs', {}, mockServer);
    const allLogsText = allLogs.content.map((c: any) => c.text).join('\n');
    console.log('All logs:', allLogsText);

    expect(allLogsText).toContain('First log');
    expect(allLogsText).toContain('Second log');
  }, 30000);
});
