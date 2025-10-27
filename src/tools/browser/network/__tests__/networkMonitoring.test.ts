import { test, expect, beforeEach, afterAll, describe } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { ListNetworkRequestsTool } from '../list_network_requests.js';
import { GetRequestDetailsTool } from '../get_request_details.js';
import type { ToolContext } from '../../../common/types.js';
import { clearNetworkLog, getNetworkLog, ensureBrowser, resetBrowserState } from '../../../../toolHandler.js';

describe('Network Monitoring Tools', () => {
  let browser: Browser;
  let page: Page;
  let context: ToolContext;
  let listNetworkRequestsTool: ListNetworkRequestsTool;
  let getRequestDetailsTool: GetRequestDetailsTool;

  beforeEach(async () => {
    // Clear network log before each test
    clearNetworkLog();

    // Use ensureBrowser to properly set up network monitoring
    page = await ensureBrowser({ headless: true });

    context = {
      page,
      server: {} as any
    };

    listNetworkRequestsTool = new ListNetworkRequestsTool({} as any);
    getRequestDetailsTool = new GetRequestDetailsTool({} as any);
  });

  afterAll(async () => {
    resetBrowserState();
    clearNetworkLog();
  });

  test('should capture network requests when navigating', async () => {
    clearNetworkLog();

    // Navigate to a simple page
    await page.goto('https://example.com', { waitUntil: 'networkidle' });

    // Wait a bit for all responses to be captured
    await page.waitForTimeout(500);

    const networkLog = getNetworkLog();
    expect(networkLog.length).toBeGreaterThan(0);

    // Should have at least the main document request
    const documentRequest = networkLog.find(req => req.resourceType === 'document');
    expect(documentRequest).toBeDefined();
    expect(documentRequest?.url).toContain('example.com');
    expect(documentRequest?.method).toBe('GET');
  });

  test('list_network_requests should return compact text format', async () => {
    clearNetworkLog();

    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const result = await listNetworkRequestsTool.execute({}, context);

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text as string;
    expect(text).toContain('Network Requests');
    expect(text).toContain('Use get_request_details(index) for full info');
    expect(text).toMatch(/\[\d+\]/); // Should have index markers
  });

  test('list_network_requests should filter by resource type', async () => {
    clearNetworkLog();

    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const result = await listNetworkRequestsTool.execute({ type: 'document' }, context);

    expect(result.isError).toBe(false);
    const text = result.content[0].text as string;
    expect(text).toContain('document');
  });

  test('list_network_requests should respect limit parameter', async () => {
    clearNetworkLog();

    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const result = await listNetworkRequestsTool.execute({ limit: 1 }, context);

    expect(result.isError).toBe(false);
    const text = result.content[0].text as string;

    // Should show "1 of X" in the header
    expect(text).toMatch(/Network Requests \(1 of \d+/);
  });

  test('get_request_details should return detailed info for valid index', async () => {
    clearNetworkLog();

    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const networkLog = getNetworkLog();
    expect(networkLog.length).toBeGreaterThan(0);

    const result = await getRequestDetailsTool.execute({ index: 0 }, context);

    expect(result.isError).toBe(false);
    const text = result.content[0].text as string;

    expect(text).toContain('Request Details [0]');
    expect(text).toContain('GET');
    expect(text).toContain('example.com');
    expect(text).toContain('Status:');
  });

  test('get_request_details should return error for invalid index', async () => {
    clearNetworkLog();

    const result = await getRequestDetailsTool.execute({ index: 999 }, context);

    expect(result.isError).toBe(true);
    const text = result.content[0].text as string;
    expect(text).toContain('Invalid index');
  });

  test('get_request_details should show response body when available', async () => {
    clearNetworkLog();

    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const networkLog = getNetworkLog();
    const documentRequest = networkLog.find(req => req.resourceType === 'document');

    if (documentRequest) {
      const result = await getRequestDetailsTool.execute({ index: documentRequest.index }, context);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;

      expect(text).toContain('Response Body');
    }
  });

  test('should handle empty network log gracefully', async () => {
    clearNetworkLog();

    const result = await listNetworkRequestsTool.execute({}, context);

    expect(result.isError).toBe(false);
    const text = result.content[0].text as string;
    expect(text).toContain('No network requests captured yet');
  });

  test('should truncate response body at 500 chars', async () => {
    clearNetworkLog();

    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const networkLog = getNetworkLog();

    // Find a request with a large response
    const largeRequest = networkLog.find(req =>
      req.responseData?.body && req.responseData.body.length > 500
    );

    if (largeRequest) {
      const result = await getRequestDetailsTool.execute({ index: largeRequest.index }, context);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;

      expect(text).toContain('more chars');
    }
  });
});
