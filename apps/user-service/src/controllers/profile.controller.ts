import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "@civicpulse/shared-middleware";
import { getProfile, updateProfile } from "../services/user.service";

const UpdateProfileSchema = z.object({
    phone: z.string().optional(),
    preferences: z
        .object({
            emailEnabled: z.boolean().optional(),
            smsEnabled: z.boolean().optional(),
            pushEnabled: z.boolean().optional(),
        })
        .optional(),
});

// ─────────────────────────────────────────────
// GET /api/v1/users/:id/profile
// ─────────────────────────────────────────────

export async function getProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const profile = await getProfile(id);

        if (!profile) {
            throw new AppError(404, "User not found", "USER_NOT_FOUND");
        }

        res.status(200).json(profile);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// PATCH /api/v1/users/:id/profile
// ─────────────────────────────────────────────

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const requestingUserId = req.headers["x-user-id"] as string | undefined;

        if (!requestingUserId || requestingUserId !== id) {
            throw new AppError(403, "Forbidden: cannot edit another user's profile", "FORBIDDEN");
        }

        const body = UpdateProfileSchema.parse(req.body);
        const updated = await updateProfile(id, body);

        res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
}
