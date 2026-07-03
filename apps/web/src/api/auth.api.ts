import apiClient from './client';
import type { AuthResponse, User } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/users/register', data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/users/login', data),

  logout: () => apiClient.post('/users/logout'),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/users/refresh'),

  getProfile: (userId: string) =>
    apiClient.get<User>(`/users/${userId}/profile`),
};
