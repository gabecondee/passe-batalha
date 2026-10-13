import { handleRequest } from './handler.ts';
import { allowedOrigin, decryptToken, encryptToken, hashState, needsRefresh, tokenKey } from './security.ts';

function assert(value: unknown, message = 'Assertion failed'): asserts value {
  if (!value) throw new Error(message);
}
const userId = '11111111-1111-4111-8111-111111111111';
const keyValue = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const post = (action: string, rest = {}) => new Request('https://example.supabase.co/functions/v1/google-calendar', {
  method: 'POST', headers: { Authorization: 'Bearer test-user-jwt', 'Content-Type': 'application/json' },
  body: JSON.stringify({ action, ...rest }),
});

async function withServer(test: (context: {
  setConnection: (value: Record<string, unknown> | null) => void;
  getConnection: () => Record<string, unknown> | null;
  setTokenError: (value: boolean | 'temporary') => void;
  rejectGoogleOnce: () => void;
  setPending: (value: Record<string, unknown>) => void;
  calls: string[];
}) => Promise<void>) {
  const oldFetch = globalThis.fetch;
  const env = {
    SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    GOOGLE_CALENDAR_CLIENT_ID: 'test-client', GOOGLE_CALENDAR_CLIENT_SECRET: 'test-secret',
    GOOGLE_CALENDAR_ALLOWED_ORIGINS: 'https://app.example.com', GOOGLE_CALENDAR_TOKEN_KEY: keyValue,
  };
  const previous = Object.fromEntries(Object.keys(env).map(name => [name, Deno.env.get(name)]));
  Object.entries(env).forEach(([name, value]) => Deno.env.set(name, value));
  let connection: Record<string, unknown> | null = null;
  let pending: Record<string, unknown> | null = null;
  let tokenError: boolean | 'temporary' = false;
  let googleRejection = false;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    calls.push(`${request.method} ${url.origin}${url.pathname}`);
    if (url.pathname === '/auth/v1/user') {
      assert(request.headers.get('Authorization') === 'Bearer test-user-jwt');
      return response({ id: userId });
    }
    if (url.pathname === '/rest/v1/google_calendar_connections') {
      assert(url.searchParams.get('user_id') === `eq.${userId}` || request.method === 'POST', 'Queries must be scoped to the authenticated user');
      if (request.method === 'GET') return response(connection ? [connection] : []);
      if (request.method === 'PATCH') {
        if (connection && url.searchParams.get('revision') === `eq.${connection.revision}`) {
          connection = { ...connection, ...await request.json() };
          return response(connection);
        }
        return response(null);
      }
      if (request.method === 'DELETE') {
        assert(!url.searchParams.has('revision'), 'Disconnect must remove the account even after a concurrent refresh');
        connection = null; return new Response(null, { status: 204 });
      }
      if (request.method === 'POST') { connection = await request.json(); return new Response(null, { status: 201 }); }
    }
    if (url.pathname === '/rest/v1/google_calendar_oauth_states') {
      if (request.method === 'DELETE') {
        if (url.searchParams.has('state_hash')) {
          const result = pending && url.searchParams.get('state_hash') === `eq.${pending.state_hash}` ? pending : null;
          pending = null;
          return response(result);
        }
        pending = null; return new Response(null, { status: 204 });
      }
      pending = await request.json(); return new Response(null, { status: 201 });
    }
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/token') {
      const params = new URLSearchParams(await request.text());
      assert(params.get('client_secret') === 'test-secret');
      if (tokenError === 'temporary') return response({ error: 'server_error' }, 503);
      if (tokenError) return response({ error: 'invalid_grant' }, 400);
      if (params.get('grant_type') === 'refresh_token') {
        assert(params.get('refresh_token') === 'refresh-old');
        return response({ access_token: 'access-renewed', expires_in: 3600 });
      }
      return response({ access_token: 'access-new', refresh_token: 'refresh-new', expires_in: 3600, scope: 'https://www.googleapis.com/auth/calendar.events' });
    }
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/revoke') return new Response(null, { status: 200 });
    if (url.origin === 'https://www.googleapis.com') {
      assert(request.headers.get('Authorization')?.startsWith('Bearer access-'));
      if (googleRejection) { googleRejection = false; return response({ error: 'unauthorized' }, 401); }
      return response({ items: [{ id: 'event-one' }] });
    }
    throw new Error(`Unexpected request: ${request.method} ${url}`);
  };
  try {
    await test({ setConnection: value => { connection = value; }, getConnection: () => connection,
      setTokenError: value => { tokenError = value; }, rejectGoogleOnce: () => { googleRejection = true; },
      setPending: value => { pending = value; }, calls });
  } finally {
    globalThis.fetch = oldFetch;
    Object.entries(previous).forEach(([name, value]) => value === undefined ? Deno.env.delete(name) : Deno.env.set(name, value));
  }
}

async function oldConnection() {
  const key = await tokenKey(keyValue);
  return {
    user_id: userId, access_token: await encryptToken('access-old', key, userId),
    refresh_token: await encryptToken('refresh-old', key, userId),
    expires_at: '2020-01-01T00:00:00Z', needs_reconnect: false, revision: crypto.randomUUID(),
  };
}

Deno.test('encrypted tokens are bound to their owner and dates refresh before expiry', async () => {
  const key = await tokenKey(keyValue);
  const encrypted = await encryptToken('secret-refresh', key, userId);
  assert(encrypted !== 'secret-refresh');
  assert(await decryptToken(encrypted, key, userId) === 'secret-refresh');
  let refused = false;
  try { await decryptToken(encrypted, key, 'other-user'); } catch { refused = true; }
  assert(refused);
  assert(needsRefresh('2026-10-13T12:00:00Z', Date.parse('2026-10-13T11:59:01Z')));
  assert(!needsRefresh('2026-10-13T12:00:00Z', Date.parse('2026-10-13T11:58:00Z')));
});

Deno.test('redirects only allow configured app origins', () => {
  assert(allowedOrigin('https://app.example.com/settings', 'https://app.example.com') === 'https://app.example.com');
  for (const value of ['https://attacker.example', 'https://app.example.com.attacker.example', 'http://app.example.com']) {
    let refused = false;
    try { allowedOrigin(value, 'https://app.example.com'); } catch { refused = true; }
    assert(refused);
  }
});

Deno.test('every POST requires login even though the OAuth callback is public', () => withServer(async ({ calls }) => {
  const result = await handleRequest(new Request('https://example.supabase.co/functions/v1/google-calendar', {
    method: 'POST', body: JSON.stringify({ action: 'status' }),
  }));
  assert(result.status === 401);
  assert(calls.length === 0);
}));

Deno.test('a new device sees a connected account even after the access token expires', () => withServer(async ({ setConnection, calls }) => {
  setConnection(await oldConnection());
  const result = await handleRequest(post('status'));
  const data = await result.json();
  assert(data.connected === true && data.needsReconnect === false);
  assert(!JSON.stringify(data).includes('token'));
  assert(!calls.some(call => call.includes('oauth2.googleapis.com')));
}));

Deno.test('an expired access token renews automatically before listing events', () => withServer(async ({ setConnection, getConnection, calls }) => {
  setConnection(await oldConnection());
  const result = await handleRequest(post('list'));
  assert(result.status === 200, await result.clone().text());
  assert((await result.json()).items[0].id === 'event-one');
  assert(calls.some(call => call === 'POST https://oauth2.googleapis.com/token'));
  assert(!needsRefresh(String(getConnection()?.expires_at)));
}));

Deno.test('revoked refresh tokens require reconnection and keep a useful status', () => withServer(async ({ setConnection, setTokenError, getConnection }) => {
  setConnection(await oldConnection()); setTokenError(true);
  const result = await handleRequest(post('list'));
  assert(result.status === 409);
  assert((await result.json()).code === 'GOOGLE_RECONNECT_REQUIRED');
  assert(getConnection()?.needs_reconnect === true);
  const status = await (await handleRequest(post('status'))).json();
  assert(status.connected === false && status.needsReconnect === true);
}));

Deno.test('a temporary token endpoint outage does not disconnect the account', () => withServer(async ({ setConnection, setTokenError, getConnection }) => {
  setConnection(await oldConnection()); setTokenError('temporary');
  assert((await handleRequest(post('list'))).status === 502);
  assert(getConnection()?.needs_reconnect === false);
  const status = await (await handleRequest(post('status'))).json();
  assert(status.connected === true);
}));

Deno.test('a rejected access token refreshes and retries the Google request once', () => withServer(async ({ setConnection, rejectGoogleOnce, calls }) => {
  const connection = await oldConnection();
  connection.expires_at = new Date(Date.now() + 3600_000).toISOString();
  setConnection(connection); rejectGoogleOnce();
  assert((await handleRequest(post('list'))).status === 200);
  assert(calls.filter(call => call === 'POST https://oauth2.googleapis.com/token').length === 1);
  assert(calls.filter(call => call.startsWith('GET https://www.googleapis.com/')).length === 2);
}));

Deno.test('disconnect revokes Google and removes the account connection', () => withServer(async ({ setConnection, getConnection, calls }) => {
  setConnection(await oldConnection());
  assert((await handleRequest(post('disconnect'))).status === 200);
  assert(getConnection() === null);
  assert(calls.some(call => call.includes('/revoke')));
}));

Deno.test('OAuth state can be consumed only once and no token appears in the redirect', () => withServer(async ({ setPending, getConnection }) => {
  const state = 'test-random-state';
  setPending({ state_hash: await hashState(state), user_id: userId, return_origin: 'https://app.example.com', expires_at: '2099-01-01T00:00:00Z' });
  const request = () => new Request(`https://example.supabase.co/functions/v1/google-calendar?state=${state}&code=test-code`);
  const result = await handleRequest(request());
  assert(result.status === 303);
  assert(result.headers.get('Location') === 'https://app.example.com/settings/integrations?google_calendar=connected');
  assert(getConnection()?.user_id === userId);
  assert(!String(getConnection()?.refresh_token).includes('refresh-new'));
  assert((await handleRequest(request())).status === 400);
}));
