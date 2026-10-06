import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JoinRequestsProvider, useJoinRequests } from '../context/JoinRequestsContext.jsx';

let rows = [];
const rpc = vi.fn().mockResolvedValue({ error: null });
const showToast = vi.fn();

vi.mock('../lib/supabase', () => {
  const query = () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      order: () => Promise.resolve({ data: rows, error: null }),
    };
    return chain;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      from: query,
      rpc: (...args) => rpc(...args),
      channel: () => channel,
      removeChannel: vi.fn(),
    },
  };
});
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-1' } }) }));
vi.mock('../context/ChatContext', () => ({ useChat: () => ({ refreshChats: vi.fn() }) }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../lib/notifications.js', () => ({ showNotification: vi.fn() }));


const req = (id, extra) => ({
  id,
  user_id: `user-${id}`,
  club_id: null,
  academic_group_id: null,
  requested_at: '2026-10-06T10:00:00Z',
  profile: { full_name: `Person ${id}` },
  ...extra,
});

describe('JoinRequestsContext', () => {
  beforeEach(() => {
    showToast.mockClear();
    rpc.mockClear();
    rows = [req('a', { club_id: 'robotics', club: { name: 'Robotics' } })];
  });

  it('counts pending requests per club and group', async () => {
    rows.push(req('b', { academic_group_id: 'cse-a', group: { name: 'CSE-A' } }));
    const { result } = renderHook(() => useJoinRequests(), { wrapper: JoinRequestsProvider });
    await waitFor(() => expect(result.current.pending).toHaveLength(2));
    expect(result.current.countFor({ clubId: 'robotics' })).toBe(1);
    expect(result.current.countFor({ groupId: 'cse-a' })).toBe(1);
    expect(result.current.countFor({ clubId: 'chess' })).toBe(0);
  });

  it('notifies the admin when a new request arrives, but not for ones already seen', async () => {
    const { result } = renderHook(() => useJoinRequests(), { wrapper: JoinRequestsProvider });
    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    expect(showToast).not.toHaveBeenCalled();

    rows = [...rows, req('c', { club_id: 'robotics', club: { name: 'Robotics' } })];
    await act(() => result.current.refresh());
    expect(showToast).toHaveBeenCalledWith('Person c wants to join Robotics', 'info', 6000);
  });

  it('removes a request once the admin decides it', async () => {
    const { result } = renderHook(() => useJoinRequests(), { wrapper: JoinRequestsProvider });
    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    rows = [];
    await act(() => result.current.decide('a', true));
    expect(rpc).toHaveBeenCalledWith('decide_membership_request', { _request: 'a', _approve: true });
    expect(result.current.pending).toHaveLength(0);
  });
});
