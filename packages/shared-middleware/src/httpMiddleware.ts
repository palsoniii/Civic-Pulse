import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";
import { Logger } from "winston";
import { AppError } from "./AppError";

// Augment Express Request to carry traceId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      traceId?: string;
    }
  }
}

export function requestLogger(logger: Logger): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const traceId = (req.headers["x-trace-id"] as string) ?? uuidv4();
    req.traceId = traceId;
    res.setHeader("X-Trace-Id", traceId);

    const startMs = Date.now();

    res.on("finish", () => {
      logger.log({
        level: "info",
        message: "http_request",
        trace_id: traceId,
        user_id: req.headers["x-user-id"] ?? null,
        method: req.method,
        path: req.path,
        status_code: res.statusCode,
        duration_ms: Date.now() - startMs,
      });
    });

    next();
  };
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join(".") || "_root";
      if (!details[field]) details[field] = [];
      details[field].push(issue.message);
    }
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details,
    });
    return;
  }

  // Fallthrough — unhandled error
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};
