import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useUnreadCount, useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unread } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-600 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                  {unread} new
                </span>
              )}
            </h3>
          </div>
          <div className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
            {!notifications?.length ? (
              <p className="p-4 text-center text-sm text-gray-400">No notifications</p>
            ) : (
              notifications.slice(0, 5).map((n) => <NotificationItem key={n.id} notification={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
