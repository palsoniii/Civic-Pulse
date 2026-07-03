import { prisma } from "../prisma/client";
import { createRedisClient } from "@civicpulse/shared-redis";
import type { User, UserPreference } from "@prisma/client";

const PROFILE_TTL_SECONDS = 300; // 5 min

export type ProfileResponse = Pick<User, "id" | "email" | "role" | "phone"> & {
    preferences: UserPreference | null;
};

// ─────────────────────────────────────────────
// getProfile
// ─────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ProfileResponse | null> {
    const redis = createRedisClient();
    const cacheKey = `users:profile:${userId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached) as ProfileResponse;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true },
    });

    if (!user) return null;

    const profile: ProfileResponse = {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferences: user.preferences,
    };

    await redis.set(cacheKey, JSON.stringify(profile), "EX", PROFILE_TTL_SECONDS);
    return profile;
}

// ─────────────────────────────────────────────
// updateProfile
// ─────────────────────────────────────────────

export interface UpdateProfileInput {
    phone?: string;
    preferences?: {
        emailEnabled?: boolean;
        smsEnabled?: boolean;
        pushEnabled?: boolean;
    };
}

export async function updateProfile(
    userId: string,
    input: UpdateProfileInput
): Promise<ProfileResponse> {
    const redis = createRedisClient();

    // Update user fields
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
        },
        include: { preferences: true },
    });

    // Upsert preferences if provided
    let updatedPrefs = user.preferences;
    if (input.preferences) {
        updatedPrefs = await prisma.userPreference.upsert({
            where: { userId },
            create: { userId, ...input.preferences },
            update: { ...input.preferences },
        });
    }

    // Bust cache
    await redis.del(`users:profile:${userId}`);

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferences: updatedPrefs,
    };
}
