import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AgendaEvent } from '@/types/agenda';
import { toast } from '@/hooks/use-toast';
import {
  disconnectGoogleConnection, getGoogleConnection, GoogleCalendarError,
  listPrimaryEvents, startGoogleConnection,
} from '@/services/googleCalendar';

export function useGoogleCalendar() {
  const { user } = useAuth();
  const userId = user?.id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<AgendaEvent[]>([]);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const version = useRef(0);
  const running = useRef(false);
  const googleConnected = Boolean(userId && connectedUser === userId);

  const handleGoogleError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Não foi possível sincronizar o Google Agenda.';
    setGoogleError(message);
    if (error instanceof GoogleCalendarError && error.code === 'GOOGLE_RECONNECT_REQUIRED') {
      setConnectedUser(null);
      setGoogleEvents([]);
    }
    return message;
  }, []);

  const refreshGoogle = useCallback(async () => {
    if (!userId || running.current) return;
    running.current = true;
    const requestVersion = version.current;
    const stillCurrent = () => currentUser.current === userId && version.current === requestVersion;
    setGoogleSyncing(true);
    try {
      const status = await getGoogleConnection();
      if (!stillCurrent()) return;
      setConnectedUser(status.connected ? userId : null);
      if (!status.connected) {
        setGoogleEvents([]);
        if (status.needsReconnect) setGoogleError('A autorização do Google expirou ou foi revogada. Conecte novamente.');
        return;
      }
      const items = await listPrimaryEvents();
      if (!stillCurrent()) return;
      setGoogleEvents(items);
      setGoogleError(null);
    } catch (error) {
      if (stillCurrent()) handleGoogleError(error);
    } finally {
      if (stillCurrent()) {
        running.current = false;
        setGoogleLoading(false);
        setGoogleSyncing(false);
      }
    }
  }, [userId, handleGoogleError]);

  useEffect(() => {
    version.current += 1;
    running.current = false;
    setConnectedUser(null);
    setGoogleEvents([]);
    setGoogleError(null);
    setGoogleLoading(Boolean(userId));
    setGoogleSyncing(false);
    // Legacy browser tokens cannot be upgraded to an offline authorization.
    localStorage.removeItem('google_calendar_session_v1');
    if (userId) void refreshGoogle();
    return () => { version.current += 1; running.current = false; };
  }, [userId, refreshGoogle]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshGoogle();
    };
    const onFocus = () => { void refreshGoogle(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshGoogle]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get('google_calendar');
    if (!result) return;
    url.searchParams.delete('google_calendar');
    window.history.replaceState(window.history.state, '', url);
    if (result === 'connected') toast({ title: 'Google Agenda conectado', description: 'A conexão está vinculada à sua conta e disponível nos seus dispositivos.' });
    if (result === 'cancelled') setGoogleError('Conexão cancelada. Você pode tentar novamente.');
    if (result === 'error') setGoogleError('Não foi possível concluir a autorização. Tente conectar novamente.');
  }, []);

  const connectGoogleCalendar = useCallback(async () => {
    if (!userId) return;
    setGoogleError(null);
    setGoogleSyncing(true);
    try {
      const { authorizationUrl } = await startGoogleConnection();
      if (currentUser.current !== userId) return;
      const url = new URL(authorizationUrl);
      if (url.origin !== 'https://accounts.google.com') throw new Error('Endereço de autorização inválido.');
      // A full redirect works in standalone PWAs without a popup being blocked.
      window.location.assign(url.toString());
    } catch (error) {
      if (currentUser.current === userId) {
        handleGoogleError(error);
        setGoogleSyncing(false);
      }
    }
  }, [userId, handleGoogleError]);

  const disconnectGoogleCalendar = useCallback(async () => {
    if (!userId) return;
    // Ignore a pending sync so it cannot restore stale state after disconnecting.
    version.current += 1;
    running.current = true;
    setGoogleSyncing(true);
    try {
      await disconnectGoogleConnection();
      if (currentUser.current !== userId) return;
      setConnectedUser(null);
      setGoogleEvents([]);
      setGoogleError(null);
    } catch (error) {
      if (currentUser.current === userId) handleGoogleError(error);
    } finally {
      if (currentUser.current === userId) {
        running.current = false;
        setGoogleLoading(false);
        setGoogleSyncing(false);
      }
    }
  }, [userId, handleGoogleError]);

  return {
    googleConnected, googleLoading, googleSyncing, googleError,
    googleEvents: googleConnected ? googleEvents : [],
    connectGoogleCalendar, disconnectGoogleCalendar,
    syncGoogleEvents: refreshGoogle, handleGoogleError,
  };
}
