import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoAway, IDLE_MS } from '../hooks/useAutoAway';

vi.mock('../lib/supabase.js', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_KEY: 'anon',
  supabase: {},
}));

const auth = {
  user: { id: 'u1' },
  session: { access_token: 'tok' },
  profile: { status: 'active' },
  updateStatus: vi.fn(),
};
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => auth }));

describe('useAutoAway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    auth.profile = { status: 'active' };
    auth.updateStatus = vi.fn((s) => {
      auth.profile = { status: s };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('goes out of office after the idle period and restores on activity', () => {
    const { rerender } = renderHook(() => useAutoAway());

    act(() => vi.advanceTimersByTime(IDLE_MS - 60000));
    expect(auth.updateStatus).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(90000));
    expect(auth.updateStatus).toHaveBeenLastCalledWith('out_of_office');
    rerender();

    act(() => {
      window.dispatchEvent(new Event('pointermove'));
    });
    expect(auth.updateStatus).toHaveBeenLastCalledWith('active');
  });

  it('keeps a status the user chose as out of office by hand', () => {
    auth.profile = { status: 'out_of_office' };
    renderHook(() => useAutoAway());

    act(() => vi.advanceTimersByTime(IDLE_MS + 60000));
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    expect(auth.updateStatus).not.toHaveBeenCalled();
  });

  it('marks away with a keepalive request when the last tab closes', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    renderHook(() => useAutoAway());

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/profiles?id=eq.u1',
      expect.objectContaining({ method: 'PATCH', keepalive: true })
    );
    fetchSpy.mockRestore();
  });
});
