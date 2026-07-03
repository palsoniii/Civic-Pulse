// ─────────────────────────────────────────────
// Mirrored types from shared-types (const enums
// don't cross package boundaries safely in the
// browser bundle, so we redefine them here as
// regular string literal union types)
// ─────────────────────────────────────────────

export type ComplaintStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';

export type ComplaintCategory =
  | 'POTHOLE'
  | 'GARBAGE'
  | 'WATER_LEAK'
  | 'STREETLIGHT'
  | 'OTHER';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type UserRole = 'CITIZEN' | 'ADMIN' | 'SUPERADMIN';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP';

// ─────────────────────────────────────────────
// API Response Shapes
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Complaint {
  id: string;
  reporterId: string;
  category: ComplaintCategory;
  description: string;
  lat: number;
  lng: number;
  priority: Priority;
  status: ComplaintStatus;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  mediaRefs?: Array<{
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    mediaType: string;
  }>;
}

export interface ComplaintHistory {
  id: string;
  complaintId: string;
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  zone?: string;
  contactEmail?: string;
  _count?: {
    assignments: number;
  };
}

export interface AssignmentRecord {
  id: string;
  complaintId: string;
  departmentId: string;
  department?: {
    name: string;
  };
  assignedAt: string;
}

export interface DashboardSummary {
  open: number;
  in_progress: number;
  resolved: number;
  sla_violations?: number;
  closed?: number;
  rejected?: number;
}

export interface SlaViolation {
  complaintId: string;
  departmentId: string;
  assignedAt: string;
  resolutionHours: number;
  hoursOverdue: number;
  time_overdue_hours?: number | null;
  complaint?: Complaint;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}
