import { describe, it, expect } from 'vitest';
import { edgeFunctionErrorMessage } from './edgeFunctionError';

describe('edgeFunctionErrorMessage', () => {
  it('shows the failing stage and preserves the response for other consumers', async () => {
    const context = new Response(JSON.stringify({ error: { step: 'image_processing', message: 'Falha na compactação.' } }), { status: 502 });
    const error = Object.assign(new Error('Generic SDK error'), { context });
    expect(await edgeFunctionErrorMessage(error)).toBe('[image_processing] Falha na compactação.');
    expect(context.bodyUsed).toBe(false);
  });
  it('handles gateway errors without JSON', async () => {
    const error = Object.assign(new Error('Generic SDK error'), { context: new Response('Bad Gateway', { status: 502 }) });
    expect(await edgeFunctionErrorMessage(error)).toBe('Generic SDK error (HTTP 502)');
  });
  it('preserves network error messages', async () => {
    expect(await edgeFunctionErrorMessage(new Error('Failed to fetch'))).toBe('Failed to fetch');
  });
});
