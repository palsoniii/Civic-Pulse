import { Link } from 'react-router-dom';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left: hamburger */}
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Right: notification bell + user menu */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            <Shield size={16} />
            <span className="hidden sm:inline">Admin Panel</span>
          </Link>
        )}

        {/* Avatar + logout */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold uppercase text-primary-700">
            {user?.email?.[0] ?? 'U'}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 sm:block">{user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
