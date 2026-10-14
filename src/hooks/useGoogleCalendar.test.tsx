import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoogleCalendar } from './useGoogleCalendar';
import { GoogleCalendarError } from '@/services/googleCalendar';

const mocks = vi.hoisted(() => ({
  user: { id: 'user-one' } as { id: string } | null,
  status: vi.fn(), list: vi.fn(), disconnect: vi.fn(), start: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/services/googleCalendar', () => ({
  GoogleCalendarError: class extends Error { constructor(message: string, public code?: string) { super(message); } },
  getGoogleConnection: mocks.status, listPrimaryEvents: mocks.list,
  disconnectGoogleConnection: mocks.disconnect, startGoogleConnection: mocks.start,
}));

describe('Google connection across devices and sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'user-one' };
    localStorage.clear();
    mocks.status.mockResolvedValue({ connected: true, needsReconnect: false });
    mocks.list.mockResolvedValue([{ id: 'google-event' }]);
    mocks.disconnect.mockResolvedValue(undefined);
  });

  it('restores the account connection in a browser without a local token', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
    expect(result.current.googleConnected).toBe(true);
    expect(result.current.googleEvents).toEqual([{ id: 'google-event' }]);
    expect(localStorage.getItem('google_calendar_session_v1')).toBeNull();
  });

  it('keeps the connection and existing events after a temporary network failure', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
    mocks.list.mockRejectedValueOnce(new Error('Rede indisponível'));
    await act(() => result.current.syncGoogleEvents());
    expect(result.current.googleConnected).toBe(true);
    expect(result.current.googleEvents).toHaveLength(1);
    expect(result.current.googleError).toBe('Rede indisponível');
  });

  it('requests reconnection only when the server reports revoked authorization', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
    mocks.list.mockRejectedValueOnce(new GoogleCalendarError('Conecte novamente', 'GOOGLE_RECONNECT_REQUIRED'));
    await act(() => result.current.syncGoogleEvents());
    expect(result.current.googleConnected).toBe(false);
    expect(result.current.googleEvents).toEqual([]);
  });

  it('refreshes on return to the PWA and observes disconnects from another device', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
    mocks.status.mockResolvedValue({ connected: false, needsReconnect: false });
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(result.current.googleConnected).toBe(false));
    expect(result.current.googleEvents).toEqual([]);
  });

  it('does not show the previous user connection after switching accounts', async () => {
    const { result, rerender } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
    mocks.user = { id: 'user-two' };
    mocks.status.mockResolvedValue({ connected: false, needsReconnect: false });
    rerender();
    expect(result.current.googleConnected).toBe(false);
    expect(result.current.googleEvents).toEqual([]);
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
  });

  it('ignores an old pending sync after disconnecting', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleLoading).toBe(false));
    let finish!: (value: { id: string }[]) => void;
    mocks.list.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let syncing!: Promise<void>;
    act(() => { syncing = result.current.syncGoogleEvents(); });
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    await act(() => result.current.disconnectGoogleCalendar());
    await act(async () => { finish([{ id: 'stale' }]); await syncing; });
    expect(result.current.googleConnected).toBe(false);
    expect(result.current.googleEvents).toEqual([]);
  });

  it('shows progress, ignores repeated clicks and confirms disconnection', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleSyncing).toBe(false));
    let finish!: () => void;
    mocks.disconnect.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.disconnectGoogleCalendar(); });
    expect(result.current.googleDisconnecting).toBe(true);
    await act(() => result.current.disconnectGoogleCalendar());
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); await pending; });
    expect(result.current.googleDisconnecting).toBe(false);
    expect(result.current.googleConnected).toBe(false);
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Google Agenda desconectado' });
  });

  it('reports a failed disconnect and keeps the connection available for retry', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.googleSyncing).toBe(false));
    mocks.disconnect.mockRejectedValueOnce(new Error('O Google não respondeu'));
    await act(() => result.current.disconnectGoogleCalendar());
    expect(result.current.googleConnected).toBe(true);
    expect(result.current.googleDisconnecting).toBe(false);
    expect(result.current.googleError).toBe('O Google não respondeu');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
