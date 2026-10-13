import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, CALENDAR_SCOPE, decryptToken, encryptToken, hashState, needsRefresh, tokenKey } from './security.ts';

const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
class CalendarError extends Error {
  constructor(message: string, public status = 500, public code = 'CALENDAR_ERROR') { super(message); }
}
interface Connection {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  needs_reconnect: boolean;
  revision: string;
}
interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
function secret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new CalendarError('Integração Google Agenda ainda não configurada no servidor.', 503);
  return value;
}
function check(error: unknown): void {
  if (error) throw new CalendarError('Não foi possível salvar ou consultar a conexão Google Agenda.');
}
const reconnect = () => new CalendarError('A autorização do Google foi revogada ou expirou. Conecte novamente.', 409, 'GOOGLE_RECONNECT_REQUIRED');

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const baseUrl = secret('SUPABASE_URL');
    const db = createClient(baseUrl, secret('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const callbackUrl = `${baseUrl}/functions/v1/google-calendar`;
    const origins = () => secret('GOOGLE_CALENDAR_ALLOWED_ORIGINS');
    const key = () => tokenKey(secret('GOOGLE_CALENDAR_TOKEN_KEY'));

    async function exchange(params: Record<string, string>): Promise<Tokens> {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...params,
          client_id: secret('GOOGLE_CALENDAR_CLIENT_ID'),
          client_secret: secret('GOOGLE_CALENDAR_CLIENT_SECRET'),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error === 'invalid_grant') throw reconnect();
        throw new CalendarError('Não foi possível renovar a autorização Google. Tente novamente.', 502);
      }
      if (!data.access_token || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) {
        throw new CalendarError('Resposta de autorização Google inválida.', 502);
      }
      return data as Tokens;
    }

    // Google's redirect carries a one-time state bound to the authenticated initiator.
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const state = url.searchParams.get('state');
      if (!state || state.length > 256) return json({ error: 'Autorização inválida ou expirada.' }, 400);
      const { data: pending, error } = await db.from('google_calendar_oauth_states')
        .delete().eq('state_hash', await hashState(state)).gt('expires_at', new Date().toISOString())
        .select().maybeSingle();
      check(error);
      if (!pending) return json({ error: 'Autorização inválida ou expirada. Inicie a conexão novamente.' }, 400);
      const origin = allowedOrigin(pending.return_origin, origins());
      const returnUrl = new URL('/settings/integrations', origin);
      try {
        const code = url.searchParams.get('code');
        if (url.searchParams.has('error') || !code) {
          returnUrl.searchParams.set('google_calendar', 'cancelled');
        } else {
          const tokens = await exchange({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl });
          if (!tokens.refresh_token || !tokens.scope?.split(' ').includes(CALENDAR_SCOPE)) {
            throw new CalendarError('Autorize o acesso ao Google Agenda para continuar.', 400);
          }
          const cryptoKey = await key();
          const { error: saveError } = await db.from('google_calendar_connections').upsert({
            user_id: pending.user_id,
            access_token: await encryptToken(tokens.access_token, cryptoKey, pending.user_id),
            refresh_token: await encryptToken(tokens.refresh_token, cryptoKey, pending.user_id),
            expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
            needs_reconnect: false,
            revision: crypto.randomUUID(),
          });
          check(saveError);
          returnUrl.searchParams.set('google_calendar', 'connected');
        }
      } catch {
        // Never put Google's tokens, authorization code, or raw errors in redirects/logs.
        returnUrl.searchParams.set('google_calendar', 'error');
      }
      return new Response(null, { status: 303, headers: {
        Location: returnUrl.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      } });
    }
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Faça login para continuar.' }, 401);
    const { data: auth, error: authError } = await db.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return json({ error: 'Faça login para continuar.' }, 401);
    const userId = auth.user.id;
    const body = await req.json();
    async function readConnection(): Promise<Connection | null> {
      const { data, error } = await db.from('google_calendar_connections').select('*').eq('user_id', userId).maybeSingle();
      check(error);
      return data;
    }

    if (body.action === 'connect') {
      const origin = allowedOrigin(String(body.origin), origins());
      // Fail early if server credentials/encryption are missing, before sending the user to Google.
      secret('GOOGLE_CALENDAR_CLIENT_SECRET');
      await key();
      const state = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const { error: cleanupError } = await db.from('google_calendar_oauth_states').delete().eq('user_id', userId);
      check(cleanupError);
      const { error } = await db.from('google_calendar_oauth_states').insert({
        user_id: userId, state_hash: await hashState(state), return_origin: origin,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      check(error);
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: secret('GOOGLE_CALENDAR_CLIENT_ID'), redirect_uri: callbackUrl,
        response_type: 'code', scope: CALENDAR_SCOPE, access_type: 'offline',
        prompt: 'consent', state,
      }).toString();
      return json({ authorizationUrl: url.toString() });
    }
    const connection = await readConnection();
    if (body.action === 'status') {
      return json({ connected: Boolean(connection && !connection.needs_reconnect), needsReconnect: Boolean(connection?.needs_reconnect) });
    }
    if (body.action === 'disconnect') {
      if (connection) {
        const token = await decryptToken(connection.refresh_token, await key(), userId);
        const response = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token }),
        });
        if (!response.ok && response.status !== 400) throw new CalendarError('Não foi possível desconectar. Tente novamente.', 502);
        // Disconnect applies to the account even if another device just refreshed it.
        const { error } = await db.from('google_calendar_connections').delete().eq('user_id', userId);
        check(error);
      }
      const { error } = await db.from('google_calendar_oauth_states').delete().eq('user_id', userId);
      check(error);
      return json({ disconnected: true });
    }
    if (!['list', 'create', 'delete'].includes(body.action)) return json({ error: 'Operação inválida.' }, 400);
    if (!connection || connection.needs_reconnect) throw reconnect();

    const cryptoKey = await key();
    async function refresh(current: Connection): Promise<Connection> {
      try {
        const tokens = await exchange({
          grant_type: 'refresh_token', refresh_token: await decryptToken(current.refresh_token, cryptoKey, userId),
        });
        const patch = {
          access_token: await encryptToken(tokens.access_token, cryptoKey, userId),
          refresh_token: tokens.refresh_token ? await encryptToken(tokens.refresh_token, cryptoKey, userId) : current.refresh_token,
          expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
          revision: crypto.randomUUID(),
        };
        const { data, error } = await db.from('google_calendar_connections').update(patch)
          .eq('user_id', userId).eq('revision', current.revision).select().maybeSingle();
        check(error);
        // A concurrent refresh/reconnect may win; never recreate a disconnected account.
        const next = data ?? await readConnection();
        if (!next || next.needs_reconnect) throw reconnect();
        return next;
      } catch (error) {
        if (error instanceof CalendarError && error.code === 'GOOGLE_RECONNECT_REQUIRED') {
          const { error: updateError } = await db.from('google_calendar_connections').update({ needs_reconnect: true })
            .eq('user_id', userId).eq('revision', current.revision);
          check(updateError);
        }
        throw error;
      }
    }
    let active = needsRefresh(connection.expires_at) ? await refresh(connection) : connection;
    let endpoint = API;
    let init: RequestInit = {};
    if (body.action === 'list') {
      const now = new Date();
      const until = new Date(now); until.setDate(until.getDate() + 60);
      endpoint += '?' + new URLSearchParams({
        timeMin: now.toISOString(), timeMax: until.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      });
    } else if (body.action === 'create') {
      if (!body.event || typeof body.event.summary !== 'string' || !body.event.summary.trim() || !body.event.start || !body.event.end) {
        return json({ error: 'Evento inválido.' }, 400);
      }
      init = { method: 'POST', body: JSON.stringify({
        summary: body.event.summary, description: body.event.description, start: body.event.start, end: body.event.end,
      }) };
    } else {
      if (typeof body.eventId !== 'string' || !/^[a-zA-Z0-9_-]{1,1024}$/.test(body.eventId)) {
        return json({ error: 'Identificador de evento inválido.' }, 400);
      }
      endpoint += '/' + encodeURIComponent(body.eventId);
      init = { method: 'DELETE' };
    }
    const callGoogle = async () => fetch(endpoint, {
      ...init, headers: { Authorization: `Bearer ${await decryptToken(active.access_token, cryptoKey, userId)}`, 'Content-Type': 'application/json' },
    });
    let response = await callGoogle();
    if (response.status === 401) {
      active = await refresh(active);
      response = await callGoogle();
    }
    if (response.status === 401) {
      const { error } = await db.from('google_calendar_connections').update({ needs_reconnect: true })
        .eq('user_id', userId).eq('revision', active.revision);
      check(error);
      throw reconnect();
    }
    if (body.action === 'delete' && (response.status === 404 || response.status === 410)) return json({ deleted: true });
    if (!response.ok) throw new CalendarError('Não foi possível sincronizar o Google Agenda. Tente novamente.', 502);
    if (response.status === 204) return json({ deleted: true });
    if (body.action === 'list') {
      // Read every page so a busy calendar is not silently truncated.
      let page = await response.json();
      const items = [...(page.items ?? [])];
      while (page.nextPageToken) {
        const nextUrl = new URL(endpoint); nextUrl.searchParams.set('pageToken', page.nextPageToken);
        const next = await fetch(nextUrl, { headers: { Authorization: `Bearer ${await decryptToken(active.access_token, cryptoKey, userId)}` } });
        if (!next.ok) throw new CalendarError('Não foi possível carregar todos os eventos. Tente novamente.', 502);
        page = await next.json(); items.push(...(page.items ?? []));
      }
      return json({ items });
    }
    const result = await response.json();
    return json({ id: result.id, htmlLink: result.htmlLink });
  } catch (error) {
    if (error instanceof CalendarError) return json({ error: error.message, code: error.code }, error.status);
    return json({ error: 'Não foi possível acessar o Google Agenda. Tente novamente.' }, 500);
  }
}

