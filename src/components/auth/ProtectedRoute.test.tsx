import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, isLoading: false, subscription: 'checking' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useSubscriptionStatus', () => ({ useSubscriptionStatus: () => auth.subscription }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
const visit = () => render(<MemoryRouter initialEntries={['/ranking']}><Routes>
  <Route path="/ranking" element={<ProtectedRoute><div>Ranking privado</div></ProtectedRoute>} />
  <Route path="/login" element={<div>Entrar na conta</div>} />
</Routes></MemoryRouter>);
beforeEach(() => { auth.user = null; auth.isLoading = false; auth.subscription = 'checking'; });
afterEach(cleanup);
describe('protected route after session restoration', () => {
  it('redirects a signed-out direct visit even while subscription status is checking', () => {
    visit();
    expect(screen.getByText('Entrar na conta')).toBeInTheDocument();
    expect(screen.queryByText('Ranking privado')).not.toBeInTheDocument();
  });
  it('waits for session restoration before deciding whether login is needed', () => {
    auth.isLoading = true;
    visit();
    expect(screen.queryByText('Entrar na conta')).not.toBeInTheDocument();
    expect(screen.queryByText('Ranking privado')).not.toBeInTheDocument();
  });
  it('keeps a restored active session on the requested protected page', () => {
    auth.user = { id: 'one' }; auth.subscription = 'active';
    visit();
    expect(screen.getByText('Ranking privado')).toBeInTheDocument();
    expect(screen.queryByText('Entrar na conta')).not.toBeInTheDocument();
  });
});
