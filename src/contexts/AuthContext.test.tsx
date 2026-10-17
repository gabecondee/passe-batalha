import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mock = vi.hoisted(() => ({ getSession: vi.fn(), unsubscribe: vi.fn(), listener: null as null | ((event: string, session: unknown) => void) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getSession: mock.getSession,
  onAuthStateChange: (listener: typeof mock.listener) => { mock.listener = listener; return { data: { subscription: { unsubscribe: mock.unsubscribe } } }; },
} } }));
const session = (id: string | null) => ({ data: { session: id ? { user: { id } } : null }, error: null });
beforeEach(() => { vi.clearAllMocks(); mock.listener = null; mock.getSession.mockReset(); mock.getSession.mockResolvedValue(session('one')); });
afterEach(cleanup);
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
describe('session recovery after clearing site storage', () => {
  it('restores the existing session without a new login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.id).toBe('one');
  });
  it('clears stale user state when storage no longer has a session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('one'));
    mock.getSession.mockResolvedValue(session(null));
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    await waitFor(() => expect(result.current.user).toBeNull());
  });
  it('does not restore an old session when logout arrives during the initial read', async () => {
    let finish!: (value: ReturnType<typeof session>) => void;
    mock.getSession.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => mock.listener?.('SIGNED_OUT', null));
    await act(async () => { finish(session('one')); });
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
  it('finishes initial loading when reading the session fails', async () => {
    mock.getSession.mockRejectedValue(new Error('storage unavailable'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });
  it('preserves an established user when a focus check fails temporarily', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('one'));
    mock.getSession.mockRejectedValue(new Error('network unavailable'));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(result.current.user?.id).toBe('one');
  });
});
