/** Supabase keeps the function's JSON error in context, behind a generic message. */
export async function edgeFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : 'Falha ao executar a função.';
  const context = (error as { context?: unknown } | null)?.context;
  if (!(context instanceof Response)) return fallback;
  try {
    const body = await context.clone().json();
    const detail = body?.error;
    if (typeof detail?.message === 'string') {
      const step = typeof detail.step === 'string' ? `[${detail.step}] ` : '';
      return `${step}${detail.message}`;
    }
    if (typeof detail === 'string') return detail;
    if (typeof body?.message === 'string') return body.message;
  } catch { /* A gateway can return a non-JSON error. */ }
  return `${fallback} (HTTP ${context.status})`;
}
