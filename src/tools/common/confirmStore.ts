const STORE = new Map<string, { payload: string; expiresAt: number }>();

function now() {
  return Date.now();
}

function purgeExpired(): void {
  const t = now();
  for (const [k, v] of STORE.entries()) {
    if (v.expiresAt <= t) STORE.delete(k);
  }
}

function genToken(len = 12): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function registerPayload(payload: string, ttlMs = 120000): string {
  purgeExpired();
  const token = genToken();
  const expiresAt = now() + Math.max(1000, ttlMs);
  STORE.set(token, { payload, expiresAt });
  return token;
}

export function consumePayload(token: string): { ok: true; payload: string } | { ok: false; error: string } {
  purgeExpired();
  const entry = STORE.get(token);
  if (!entry) return { ok: false, error: 'Invalid or expired token' };
  STORE.delete(token);
  if (entry.expiresAt <= now()) return { ok: false, error: 'Invalid or expired token' };
  return { ok: true, payload: entry.payload };
}

