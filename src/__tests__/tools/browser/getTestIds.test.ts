import { GetTestIdsTool } from '../../../tools/browser/getTestIds.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock Page
const mockPageEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any, arg?: any) => Promise<any>>;
const mockIsClosed = jest.fn().mockReturnValue(false);

const mockPage = {
  evaluate: mockPageEvaluate,
  isClosed: mockIsClosed,
} as unknown as Page;

// Mock Browser
const mockIsConnected = jest.fn().mockReturnValue(true);
const mockBrowser = {
  isConnected: mockIsConnected,
} as unknown as Browser;

// Mock Server
const mockServer = {
  sendMessage: jest.fn(),
};

// Mock Context
const mockContext = {
  page: mockPage,
  browser: mockBrowser,
  server: mockServer,
} as ToolContext;

describe('GetTestIdsTool', () => {
  let getTestIdsTool: GetTestIdsTool;

  beforeEach(() => {
    jest.clearAllMocks();
    getTestIdsTool = new GetTestIdsTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should discover test IDs with default attributes', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 5,
      byAttribute: {
        'data-testid': ['submit-button', 'email-input', 'password-input'],
        'data-test': ['legacy-form', 'old-button'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 5 test IDs:');
    expect(result.content[0].text).toContain('data-testid (3):');
    expect(result.content[0].text).toContain('submit-button, email-input, password-input');
    expect(result.content[0].text).toContain('data-test (2):');
    expect(result.content[0].text).toContain('legacy-form, old-button');
    expect(result.content[0].text).toContain('💡 Tip: Use these test IDs with selector shortcuts:');
  });

  test('should discover test IDs with custom attributes', async () => {
    const args = { attributes: 'data-testid,data-cy' };

    mockPageEvaluate.mockResolvedValue({
      totalCount: 3,
      byAttribute: {
        'data-testid': ['login-button'],
        'data-cy': ['cypress-login', 'cypress-submit'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 3 test IDs:');
    expect(result.content[0].text).toContain('data-testid (1):');
    expect(result.content[0].text).toContain('login-button');
    expect(result.content[0].text).toContain('data-cy (2):');
    expect(result.content[0].text).toContain('cypress-login, cypress-submit');
  });

  test('should handle page with no test IDs', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 0,
      byAttribute: {},
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 0 test IDs');
    expect(result.content[0].text).toContain('⚠ No test ID attributes found on this page.');
    expect(result.content[0].text).toContain('Searched for:');
    expect(result.content[0].text).toContain('data-testid');
    expect(result.content[0].text).toContain('data-test');
    expect(result.content[0].text).toContain('data-cy');
    expect(result.content[0].text).toContain('Suggestions:');
    expect(result.content[0].text).toContain('Use inspect_dom to see page structure');
  });

  test('should handle many test IDs (more than 10)', async () => {
    const args = {};

    const manyTestIds = Array.from({ length: 15 }, (_, i) => `test-id-${i + 1}`);

    mockPageEvaluate.mockResolvedValue({
      totalCount: 15,
      byAttribute: {
        'data-testid': manyTestIds,
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 15 test IDs:');
    expect(result.content[0].text).toContain('data-testid (15):');
    expect(result.content[0].text).toContain('test-id-1, test-id-2, test-id-3');
    expect(result.content[0].text).toContain('... and 7 more');
  });

  test('should show all test IDs when 10 or fewer', async () => {
    const args = {};

    const someTestIds = Array.from({ length: 6 }, (_, i) => `button-${i + 1}`);

    mockPageEvaluate.mockResolvedValue({
      totalCount: 6,
      byAttribute: {
        'data-testid': someTestIds,
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 6 test IDs:');
    expect(result.content[0].text).toContain('data-testid (6):');
    expect(result.content[0].text).toContain('button-1, button-2, button-3, button-4, button-5, button-6');
    expect(result.content[0].text).not.toContain('... and');
  });

  test('should handle mixed attributes with different counts', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 4,
      byAttribute: {
        'data-testid': ['main-form', 'submit-btn', 'cancel-btn'],
        'data-cy': ['e2e-login'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 4 test IDs:');
    expect(result.content[0].text).toContain('data-testid (3):');
    expect(result.content[0].text).toContain('data-cy (1):');
    expect(result.content[0].text).toContain('main-form, submit-btn, cancel-btn');
    expect(result.content[0].text).toContain('e2e-login');
  });

  test('should include usage tip with correct selector shorthand', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 2,
      byAttribute: {
        'data-testid': ['login-form'],
        'data-cy': ['cypress-test'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('💡 Tip: Use these test IDs with selector shortcuts:');
    expect(result.content[0].text).toContain('testid:login-form → [data-testid="login-form"]');
  });

  test('should show correct shorthand for data-test attribute', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 1,
      byAttribute: {
        'data-test': ['my-element'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('data-test:my-element → [data-test="my-element"]');
  });

  test('should handle browser disconnection gracefully', async () => {
    mockIsConnected.mockReturnValue(false);

    const result = await getTestIdsTool.execute({}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser is disconnected');
  });

  test('should handle page closed error gracefully', async () => {
    mockIsClosed.mockReturnValue(true);

    const result = await getTestIdsTool.execute({}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is closed');
  });

  test('should handle evaluate errors gracefully', async () => {
    mockPageEvaluate.mockRejectedValue(new Error('Evaluation failed'));

    const result = await getTestIdsTool.execute({}, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to discover test IDs: Evaluation failed');
  });

  test('should parse custom attributes correctly', async () => {
    const args = { attributes: 'data-qa, data-automation , data-e2e' };

    mockPageEvaluate.mockResolvedValue({
      totalCount: 3,
      byAttribute: {
        'data-qa': ['qa-id'],
        'data-automation': ['auto-id'],
        'data-e2e': ['e2e-id'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(mockPageEvaluate).toHaveBeenCalledWith(
      expect.any(Function),
      ['data-qa', 'data-automation', 'data-e2e']
    );
    expect(result.isError).toBe(false);
  });

  test('should detect and warn about duplicate test IDs', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 5,
      byAttribute: {
        'data-testid': ['main-header', 'submit-button', 'main-header'],
        'data-test': ['duplicate-id', 'duplicate-id'],
      },
      duplicates: {
        'data-testid': {
          'main-header': 2,
        },
        'data-test': {
          'duplicate-id': 2,
        },
      },
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('⚠ Warning: Duplicate test IDs found');
    expect(result.content[0].text).toContain('data-testid: "main-header" appears 2 times');
    expect(result.content[0].text).toContain('data-test: "duplicate-id" appears 2 times');

    // Verify impact warnings
    expect(result.content[0].text).toContain('⚠ Impact of Duplicate Test IDs:');
    expect(result.content[0].text).toContain('Flaky tests');
    expect(result.content[0].text).toContain('Ambiguous interactions');
    expect(result.content[0].text).toContain('Test automation will fail or behave unpredictably');

    // Verify fix guidance is provided
    expect(result.content[0].text).toContain('🔧 How to Fix:');
    expect(result.content[0].text).toContain('Use query_selector_all to locate all duplicates');
    expect(result.content[0].text).toContain('query_selector_all({ selector: "testid:main-header" })');
    expect(result.content[0].text).toContain('Identify which elements should keep the test ID');
    expect(result.content[0].text).toContain('Rename duplicates to be unique and descriptive');
    expect(result.content[0].text).toContain('"main-header" → "main-header-primary", "main-header-mobile"');
    expect(result.content[0].text).toContain('If one is hidden/unused, consider removing it entirely');
    expect(result.content[0].text).toContain('💡 Best Practice: Test IDs must be unique across the entire page');
  });

  test('should not show duplicate warning when no duplicates exist', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      totalCount: 3,
      byAttribute: {
        'data-testid': ['unique-1', 'unique-2', 'unique-3'],
      },
      duplicates: {},
    });

    const result = await getTestIdsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).not.toContain('⚠ Warning: Duplicate test IDs');
  });
});
