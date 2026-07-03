import { z } from "zod";

// ─────────────────────────────────────────────
// Enums (TypeScript const enums)
// ─────────────────────────────────────────────

export const enum ComplaintStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
  REJECTED = "REJECTED",
}

export const enum ComplaintCategory {
  POTHOLE = "POTHOLE",
  GARBAGE = "GARBAGE",
  WATER_LEAK = "WATER_LEAK",
  STREETLIGHT = "STREETLIGHT",
  OTHER = "OTHER",
}

export const enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export const enum UserRole {
  CITIZEN = "CITIZEN",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}

export const enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  IN_APP = "IN_APP",
}

// ─────────────────────────────────────────────
// Zod Enums (runtime-safe, mirror const enums)
// ─────────────────────────────────────────────

export const ComplaintStatusZod = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
]);

export const ComplaintCategoryZod = z.enum([
  "POTHOLE",
  "GARBAGE",
  "WATER_LEAK",
  "STREETLIGHT",
  "OTHER",
]);

export const PriorityZod = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const UserRoleZod = z.enum(["CITIZEN", "ADMIN", "SUPERADMIN"]);

export const NotificationChannelZod = z.enum(["EMAIL", "SMS", "IN_APP"]);

// ─────────────────────────────────────────────
// Zod Schemas + Inferred Types
// ─────────────────────────────────────────────

const ComplaintLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CreateComplaintSchema = z.object({
  category: ComplaintCategoryZod,
  description: z.string().min(20).max(1000),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  location: ComplaintLocationSchema.optional(),
  priority: PriorityZod.optional(),
}).superRefine((value, ctx) => {
  const hasFlat = typeof value.lat === "number" && typeof value.lng === "number";
  const hasNested = !!value.location;

  if (!hasFlat && !hasNested) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["location"],
      message: "Location is required",
    });
  }
});
export type CreateComplaint = z.infer<typeof CreateComplaintSchema>;

export const UpdateComplaintStatusSchema = z.object({
  status: ComplaintStatusZod,
  reason: z.string().optional(),
});
export type UpdateComplaintStatus = z.infer<typeof UpdateComplaintStatusSchema>;

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});
export type RegisterUser = z.infer<typeof RegisterUserSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type Login = z.infer<typeof LoginSchema>;

// ─────────────────────────────────────────────
// Event Envelope
// ─────────────────────────────────────────────

export interface AppEvent {
  event_id: string;       // UUID
  event_type: string;
  timestamp: string;      // ISO 8601
  service_origin: string;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// Event Payload Interfaces
// ─────────────────────────────────────────────

export interface ComplaintCreatedPayload {
  complaint_id: string;
  reporter_id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  priority: string;
  status: string;
}

export interface StatusChangedPayload {
  complaint_id: string;
  reporter_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  reason?: string;
}

export interface ComplaintAssignedPayload {
  complaint_id: string;
  department_id: string;
  assigned_by: string;
}

export interface UserRegisteredPayload {
  user_id: string;
  email: string;
}

export interface MediaUploadedPayload {
  media_id: string;
  complaint_id: string;
  url: string;
  thumbnail_url: string;
}

// ─────────────────────────────────────────────
// Unified API Error Shape
// ─────────────────────────────────────────────

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}
