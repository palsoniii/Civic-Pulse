import { env } from "./env";

/**
 * Typed map of internal service base URLs.
 * These are only reachable within the Docker internal network.
 */
export const services = {
    users: env.USER_SERVICE_URL,
    complaints: env.COMPLAINT_SERVICE_URL,
    admin: env.ADMIN_SERVICE_URL,
    notifications: env.NOTIFICATION_SERVICE_URL,
    media: env.MEDIA_SERVICE_URL,
} as const;

export type ServiceName = keyof typeof services;
