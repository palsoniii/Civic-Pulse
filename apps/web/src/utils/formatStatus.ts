import type { ComplaintStatus, ComplaintCategory, Priority } from '@/types';

// ─────────────────────────────────────────────
// Status → display label + Tailwind color classes
// ─────────────────────────────────────────────

export interface StatusDisplay {
  label: string;
  /** Tailwind bg + text classes for badges */
  badgeClass: string;
  /** Hex color for charts / icons */
  color: string;
}

export const STATUS_DISPLAY: Record<ComplaintStatus, StatusDisplay> = {
  OPEN: {
    label: 'Open',
    badgeClass: 'bg-blue-100 text-blue-800',
    color: '#1D4ED8',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'bg-amber-100 text-amber-800',
    color: '#D97706',
  },
  RESOLVED: {
    label: 'Resolved',
    badgeClass: 'bg-green-100 text-green-800',
    color: '#16A34A',
  },
  CLOSED: {
    label: 'Closed',
    badgeClass: 'bg-gray-100 text-gray-700',
    color: '#6B7280',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-800',
    color: '#DC2626',
  },
};

export function formatStatus(status: ComplaintStatus): StatusDisplay {
  return STATUS_DISPLAY[status] ?? { label: status, badgeClass: 'bg-gray-100 text-gray-700', color: '#6B7280' };
}

// ─────────────────────────────────────────────
// Category → display label
// ─────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  POTHOLE: 'Pothole',
  GARBAGE: 'Garbage',
  WATER_LEAK: 'Water Leak',
  STREETLIGHT: 'Streetlight',
  OTHER: 'Other',
};

export function formatCategory(category: ComplaintCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

// ─────────────────────────────────────────────
// Priority → display label + badge class
// ─────────────────────────────────────────────

export interface PriorityDisplay {
  label: string;
  badgeClass: string;
}

export const PRIORITY_DISPLAY: Record<Priority, PriorityDisplay> = {
  LOW: { label: 'Low', badgeClass: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Medium', badgeClass: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', badgeClass: 'bg-amber-100 text-amber-700' },
  CRITICAL: { label: 'Critical', badgeClass: 'bg-red-100 text-red-700' },
};

export function formatPriority(priority: Priority): PriorityDisplay {
  return PRIORITY_DISPLAY[priority] ?? { label: priority, badgeClass: 'bg-gray-100 text-gray-600' };
}
