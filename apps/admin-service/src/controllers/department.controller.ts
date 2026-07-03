import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createDepartment, listDepartments } from "../services/department.service";

const CreateDepartmentSchema = z.object({
    name: z.string().min(2).max(100),
    zone: z.string().min(2).max(100),
    contactEmail: z.string().email(),
});

export async function createDepartmentHandler(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const body = CreateDepartmentSchema.parse(req.body);
        const department = await createDepartment(body);
        res.status(201).json(department);
    } catch (error) {
        next(error);
    }
}

export async function listDepartmentsHandler(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const departments = await listDepartments();
        res.status(200).json(departments);
    } catch (error) {
        next(error);
    }
}
