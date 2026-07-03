import type { Notification } from '@/types';
import { formatRelativeDate } from '@/utils/formatDate';
import { useMarkNotificationRead } from '@/hooks/useNotifications';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { mutate: markRead } = useMarkNotificationRead();
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg p-3 transition-colors hover:bg-gray-50',
        !notification.read && 'bg-primary-50'
      )}
      onClick={() => {
        if (!notification.read) markRead(notification.id);
        if (notification.href) navigate(notification.href);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 line-clamp-1">{notification.subject}</p>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{notification.body}</p>
        </div>
        {!notification.read && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">{formatRelativeDate(notification.createdAt)}</p>
    </div>
  );
}
