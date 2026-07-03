import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import type { NotificationPreferences } from '@/types';

export const notificationKeys = {
  all: ['notifications'] as const,
  mine: () => [...notificationKeys.all, 'mine'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.mine(),
    queryFn: async () => {
      const { data } = await notificationsApi.getMyNotifications();
      return data;
    },
    refetchInterval: 30_000, // poll every 30 s
  });
}

export function useUnreadCount() {
  const query = useNotifications();
  const unread = query.data?.filter((n) => !n.read).length ?? 0;
  return { ...query, unread };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await notificationsApi.markRead(id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.mine() });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const { data } = await notificationsApi.getPreferences();
      return data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<NotificationPreferences>) => {
      const { data } = await notificationsApi.updatePreferences(payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
