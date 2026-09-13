import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module.
// We define the mock structure inside the factory to avoid hoisting issues.
vi.mock('../lib/supabase', () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn().mockReturnValue(mockChain),
    },
  };
});

import { supabase } from '../lib/supabase';

const TestComponent = () => {
  const { isSuperAdmin, isEmployee, isFaculty, isGuest } = useAuth();
  return (
    <div>
      <span data-testid="is-super-admin">{isSuperAdmin.toString()}</span>
      <span data-testid="is-employee">{isEmployee.toString()}</span>
      <span data-testid="is-faculty">{isFaculty.toString()}</span>
      <span data-testid="is-guest">{isGuest.toString()}</span>
    </div>
  );
};

describe('AuthContext Role Derivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify a superadmin correctly (itdept)', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });

    // Access the chain through the mocked supabase.from() return value
    const chain = supabase.from();
    chain.single.mockResolvedValue({ data: { user_type: 'member' } });

    // Mock the sequential calls to .eq()
    // 1st call (profiles): returns chain
    // 2nd call (user_roles): returns data
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: [{ role: 'itdept', department: 'IT' }] });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {});

    expect(screen.getByTestId('is-super-admin').textContent).toBe('true');
    expect(screen.getByTestId('is-employee').textContent).toBe('true');
    expect(screen.getByTestId('is-faculty').textContent).toBe('false');
    expect(screen.getByTestId('is-guest').textContent).toBe('false');
  });

  it('should identify a faculty member correctly', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });

    const chain = supabase.from();
    chain.single.mockResolvedValue({ data: { user_type: 'member' } });
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: [{ role: 'faculty', department: 'Science' }] });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {});

    expect(screen.getByTestId('is-super-admin').textContent).toBe('false');
    expect(screen.getByTestId('is-employee').textContent).toBe('true');
    expect(screen.getByTestId('is-faculty').textContent).toBe('true');
    expect(screen.getByTestId('is-guest').textContent).toBe('false');
  });

  it('should identify a guest correctly', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });

    const chain = supabase.from();
    chain.single.mockResolvedValue({ data: { user_type: 'guest' } });
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {});

    expect(screen.getByTestId('is-super-admin').textContent).toBe('false');
    expect(screen.getByTestId('is-employee').textContent).toBe('false');
    expect(screen.getByTestId('is-faculty').textContent).toBe('false');
    expect(screen.getByTestId('is-guest').textContent).toBe('true');
  });
});
