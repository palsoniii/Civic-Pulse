import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError } from "./AppError";

export function validateRequest(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      req.body = result.data;
      next();
      return;
    }

    const zodError = result.error as ZodError;
    const details: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const field = issue.path.join(".") || "_root";
      if (!details[field]) details[field] = [];
      details[field].push(issue.message);
    }

    const appError = new AppError(400, "Validation failed", "VALIDATION_ERROR");
    (appError as AppError & { details?: Record<string, string[]> }).details = details;
    next(appError);
  };
}
