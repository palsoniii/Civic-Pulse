import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { AppShell } from '@/components/layout/AppShell';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Citizen pages
import { DashboardPage } from '@/pages/citizen/DashboardPage';
import { ComplaintFormPage } from '@/pages/citizen/ComplaintFormPage';
import { ComplaintListPage } from '@/pages/citizen/ComplaintListPage';
import { ComplaintDetailPage } from '@/pages/citizen/ComplaintDetailPage';

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminComplaintListPage } from '@/pages/admin/AdminComplaintListPage';
import { AdminSlaPage } from '@/pages/admin/AdminSlaPage';
import { AssignmentPage } from '@/pages/admin/AssignmentPage';

// Misc
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // ── Protected routes (any authenticated user) ────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/complaints', element: <ComplaintListPage /> },
          { path: '/complaints/new', element: <ComplaintFormPage /> },
          { path: '/complaints/:id', element: <ComplaintDetailPage /> },

          // ── Admin-only routes ────────────────────────────────────────────
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/sla', element: <AdminSlaPage /> },
              { path: '/admin/complaints', element: <AdminComplaintListPage /> },
              { path: '/admin/complaints/:id/assign', element: <AssignmentPage /> },
            ],
          },
        ],
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);
