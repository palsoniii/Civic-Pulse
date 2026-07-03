import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  PlusSquare,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Complaints', to: '/complaints', icon: <MessageSquare size={18} /> },
  { label: 'New Complaint', to: '/complaints/new', icon: <PlusSquare size={18} /> },
  { label: 'Admin Dashboard', to: '/admin', icon: <BarChart3 size={18} />, adminOnly: true },
  { label: 'Manage Complaints', to: '/admin/complaints', icon: <Users size={18} />, adminOnly: true },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-full flex-col bg-gray-900 text-white',
        'transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700">
            <span className="text-xs font-bold text-white">CP</span>
          </div>
          <span className="text-base font-bold tracking-tight">CivicPulse</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          title="Collapse sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-700 text-white'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold uppercase">
            {user?.email?.[0] ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user?.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <Settings size={15} className="shrink-0 text-gray-500" />
        </div>
      </div>
    </aside>
  );
}
