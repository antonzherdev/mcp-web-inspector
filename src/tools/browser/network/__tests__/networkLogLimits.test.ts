import { test, expect, beforeEach, describe } from '@jest/globals';
import { clearNetworkLog, getNetworkLog, registerNetworkListeners } from '../../../../toolHandler.js';

// These limits are internal to toolHandler; mirrored here so a change to them
// has to be a deliberate edit of the expectations below.
const MAX_ENTRIES = 200;
const MAX_BODY_CHARS = 64 * 1024;

type Handlers = { request?: Function; response?: Function };

/** Minimal stand-in for a Playwright Page that just captures the listeners. */
function fakePage(): { handlers: Handlers } {
  const handlers: Handlers = {};
  const page = {
    on: (event: string, fn: Function) => { (handlers as any)[event] = fn; },
    addInitScript: async () => {},
  };
  registerNetworkListeners(page as any);
  return { handlers };
}

function fakeRequest(url: string, resourceType = 'xhr') {
  return {
    method: () => 'GET',
    url: () => url,
    resourceType: () => resourceType,
    headers: () => ({}),
    postData: () => null,
  };
}

function fakeResponse(request: any, body: string) {
  return {
    url: () => request.url(),
    request: () => request,
    status: () => 200,
    statusText: () => 'OK',
    headers: () => ({}),
    text: async () => body,
  };
}

describe('network log limits', () => {
  beforeEach(() => {
    clearNetworkLog();
  });

  test('keeps only the most recent entries once the cap is reached', () => {
    const { handlers } = fakePage();
    for (let i = 0; i < MAX_ENTRIES + 60; i++) {
      handlers.request!(fakeRequest(`https://x.test/${i}`));
    }

    const log = getNetworkLog();
    expect(log.length).toBe(MAX_ENTRIES);
    // Oldest dropped, newest kept.
    expect(log[log.length - 1].url).toBe(`https://x.test/${MAX_ENTRIES + 59}`);
    expect(log[0].url).toBe(`https://x.test/60`);
  });

  test('index stays usable as an array position after trimming', () => {
    const { handlers } = fakePage();
    for (let i = 0; i < MAX_ENTRIES + 25; i++) {
      handlers.request!(fakeRequest(`https://x.test/${i}`));
    }

    // get_request_details resolves the reported `index` by array position, so
    // the two must not drift apart when old entries are dropped.
    const log = getNetworkLog();
    log.forEach((entry, position) => expect(entry.index).toBe(position));
  });

  test('truncates oversized response bodies', async () => {
    const { handlers } = fakePage();
    const request = fakeRequest('https://x.test/big');
    handlers.request!(request);
    await handlers.response!(fakeResponse(request, 'z'.repeat(MAX_BODY_CHARS * 3)));

    const body = getNetworkLog()[0].responseData?.body ?? '';
    expect(body.length).toBeLessThan(MAX_BODY_CHARS + 100);
    expect(body).toContain('[body truncated');
  });

  test('keeps small response bodies intact', async () => {
    const { handlers } = fakePage();
    const request = fakeRequest('https://x.test/small');
    handlers.request!(request);
    await handlers.response!(fakeResponse(request, '{"ok":true}'));

    expect(getNetworkLog()[0].responseData?.body).toBe('{"ok":true}');
  });

  test.each(['xhr', 'fetch', 'document'])('captures the body for %s', async (resourceType) => {
    const { handlers } = fakePage();
    const request = fakeRequest('https://x.test/r', resourceType);
    handlers.request!(request);
    await handlers.response!(fakeResponse(request, 'payload'));

    expect(getNetworkLog()[0].responseData?.body).toBe('payload');
  });

  test.each(['script', 'stylesheet', 'image', 'font'])(
    'records %s but drops its body, which is what used to pin memory',
    async (resourceType) => {
      const { handlers } = fakePage();
      const request = fakeRequest('https://x.test/asset', resourceType);
      handlers.request!(request);
      await handlers.response!(fakeResponse(request, 'x'.repeat(5_000_000)));

      const entry = getNetworkLog()[0];
      expect(entry.status).toBe(200); // still listed by list_network_requests
      expect(entry.responseData?.body).toBeNull();
    }
  );
});
