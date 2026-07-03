import apiClient from './client';
import type { Notification, NotificationPreferences } from '@/types';

interface NotificationLogResponse {
  id: string;
  userId: string;
  channel: Notification['channel'];
  eventType: string;
  payload: string;
  status: string;
  read: boolean;
  sentAt: string;
}

interface NotificationListResponse {
  data: NotificationLogResponse[];
  total: number;
}

function toNotificationSummary(entry: NotificationLogResponse): Notification {
  let payload: Record<string, unknown> = {};

  try {
    payload = JSON.parse(entry.payload) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const complaintId =
    typeof payload.complaint_id === 'string' ? payload.complaint_id.slice(0, 8).toUpperCase() : null;
  const complaintHref =
    typeof payload.complaint_id === 'string' ? `/complaints/${payload.complaint_id}` : undefined;

  if (entry.eventType === 'complaint.created') {
    return {
      id: entry.id,
      userId: entry.userId,
      channel: entry.channel,
      subject: complaintId ? `Complaint #${complaintId} created` : 'Complaint created',
      body: 'Your complaint was received and is now open.',
      read: entry.read,
      createdAt: entry.sentAt,
      href: complaintHref,
    };
  }

  if (entry.eventType === 'complaint.status_changed') {
    const fromStatus = typeof payload.from_status === 'string' ? payload.from_status : 'OPEN';
    const toStatus = typeof payload.to_status === 'string' ? payload.to_status : 'UPDATED';
    return {
      id: entry.id,
      userId: entry.userId,
      channel: entry.channel,
      subject: complaintId ? `Complaint #${complaintId} status updated` : 'Complaint status updated',
      body: `Status changed from ${fromStatus} to ${toStatus}.`,
      read: entry.read,
      createdAt: entry.sentAt,
      href: complaintHref,
    };
  }

  return {
    id: entry.id,
    userId: entry.userId,
    channel: entry.channel,
    subject: entry.eventType,
    body: 'You have a new notification.',
    read: entry.read,
    createdAt: entry.sentAt,
    href: complaintHref,
  };
}

export const notificationsApi = {
  getMyNotifications: () =>
    apiClient.get<NotificationListResponse | NotificationLogResponse[]>('/notifications/me').then((response) => ({
      ...response,
      data: (Array.isArray(response.data) ? response.data : response.data.data).map(toNotificationSummary),
    })),

  markRead: (id: string) =>
    apiClient.patch<NotificationLogResponse>(`/notifications/${id}/read`).then((response) => ({
      ...response,
      data: toNotificationSummary(response.data),
    })),

  getPreferences: () =>
    apiClient.get<NotificationPreferences>('/notifications/preferences'),

  updatePreferences: (data: Partial<NotificationPreferences>) =>
    apiClient.patch<NotificationPreferences>('/notifications/preferences', data),
};
