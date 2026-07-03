import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/api/auth.api';
import type { RegisterPayload, LoginPayload } from '@/api/auth.api';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { data } = await authApi.login(payload);
      setAuth(data.user, data.accessToken);
      return data;
    },
    [setAuth]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await authApi.register(payload);
      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  }, [clearAuth, navigate]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
  };
}
