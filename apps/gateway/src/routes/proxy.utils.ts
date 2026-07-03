import { createProxyMiddleware } from "http-proxy-middleware";
import type { ClientRequest, IncomingMessage, ServerResponse } from "http";

export function createServiceProxy(target: string) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (_path, req) => (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? _path,
        on: {
            proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
                const traceId = req.headers["x-trace-id"];
                if (traceId) {
                    proxyReq.setHeader("X-Trace-Id", traceId as string);
                }

                 const requestWithBody = req as IncomingMessage & { body?: unknown };
                 const contentType = req.headers["content-type"];
                 if (
                     requestWithBody.body &&
                     typeof contentType === "string" &&
                     contentType.includes("application/json")
                 ) {
                     const bodyData = JSON.stringify(requestWithBody.body);
                     proxyReq.setHeader("Content-Type", "application/json");
                     proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
                     proxyReq.write(bodyData);
                 }
            },
            error: (_error, req, res) => {
                const response = res as ServerResponse;
                const traceId = req.headers["x-trace-id"];

                if (!response.headersSent) {
                    response.statusCode = 503;
                    response.setHeader("Content-Type", "application/json");
                }

                response.end(
                    JSON.stringify({
                        error: "Upstream service unavailable",
                        code: "SERVICE_UNAVAILABLE",
                        traceId: typeof traceId === "string" ? traceId : undefined,
                    })
                );
            },
        },
    });
}
