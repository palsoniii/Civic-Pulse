import { Request, Response, NextFunction, RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Generates or propagates an X-Trace-Id header.
 * - If the incoming request already has X-Trace-Id, it is reused (trust upstream gateway/LB).
 * - Otherwise a new UUIDv4 is generated and attached.
 * The value is attached to req.traceId and echoed back via the response header.
 */
export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers["x-trace-id"] as string | undefined;
    const traceId = existing ?? uuidv4();

    // Store on request for downstream use within this process
    req.traceId = traceId;

    // Ensure the header is present on the request for proxy forwarding
    req.headers["x-trace-id"] = traceId;

    // Echo back to the client
    res.setHeader("X-Trace-Id", traceId);

    next();
}

export function createTraceIdMiddleware(): RequestHandler {
    return traceIdMiddleware;
}
