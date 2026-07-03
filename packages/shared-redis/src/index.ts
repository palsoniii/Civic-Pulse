import Redis from "ioredis";
import type { AppEvent } from "@civicpulse/shared-types";

// ─────────────────────────────────────────────
// Singleton Redis client
// ─────────────────────────────────────────────

let _client: Redis | null = null;

export function createRedisClient(): Redis {
  if (_client) return _client;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL environment variable is not set");

  _client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  _client.on("error", (err) => {
    console.error("[shared-redis] Redis client error:", err);
  });

  _client.on("connect", () => {
    console.info("[shared-redis] Connected to Redis");
  });

  return _client;
}

// ─────────────────────────────────────────────
// publishEvent
// ─────────────────────────────────────────────

export async function publishEvent(stream: string, event: AppEvent): Promise<void> {
  const client = createRedisClient();
  await client.xadd(stream, "*", "data", JSON.stringify(event));
  console.info(`[shared-redis] Published event ${event.event_id} to stream ${stream}`);
}

// ─────────────────────────────────────────────
// createConsumerGroup
// ─────────────────────────────────────────────

export async function createConsumerGroup(stream: string, group: string): Promise<void> {
  const client = createRedisClient();
  try {
    await client.xgroup("CREATE", stream, group, "$", "MKSTREAM");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("BUSYGROUP")) {
      // Group already exists — this is fine
      return;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────
// startConsumer
// ─────────────────────────────────────────────

export interface ConsumerConfig {
  stream: string;
  group: string;
  consumer: string;
  handler: (event: AppEvent) => Promise<void>;
  batchSize?: number;
  blockMs?: number;
}

export function startConsumer(config: ConsumerConfig): void {
  const { stream, group, consumer, handler, batchSize = 10, blockMs = 2000 } = config;
  const client = createRedisClient();

  const run = async (): Promise<void> => {
    while (true) {
      try {
        const results = await client.xreadgroup(
          "GROUP", group, consumer,
          "COUNT", batchSize,
          "BLOCK", blockMs,
          "STREAMS", stream, ">"
        ) as Array<[string, Array<[string, string[]]>]> | null;

        if (!results) continue;

        for (const [, messages] of results) {
          for (const [messageId, fields] of messages) {
            const dataIndex = fields.indexOf("data");
            if (dataIndex === -1) continue;
            const raw = fields[dataIndex + 1];

            let event: AppEvent;
            try {
              event = JSON.parse(raw) as AppEvent;
            } catch {
              console.error(`[shared-redis] Failed to parse message ${messageId}`);
              await client.xack(stream, group, messageId);
              continue;
            }

            const idempotencyKey = `processed:${event.event_id}`;
            const alreadyProcessed = await client.exists(idempotencyKey);

            if (alreadyProcessed) {
              await client.xack(stream, group, messageId);
              continue;
            }

            try {
              await handler(event);
              await client.set(idempotencyKey, "1", "EX", 172800); // 48 hours
              await client.xack(stream, group, messageId);
            } catch (handlerErr) {
              console.error(
                `[shared-redis] Handler failed for event ${event.event_id}:`,
                handlerErr
              );
              // Do NOT ack — message stays in PEL for XAUTOCLAIM recovery
            }
          }
        }
      } catch (err) {
        console.error("[shared-redis] Consumer loop error:", err);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  };

  run().catch((err) => {
    console.error("[shared-redis] Fatal consumer error:", err);
  });
}

// ─────────────────────────────────────────────
// startReclaimer
// ─────────────────────────────────────────────

export function startReclaimer(stream: string, group: string, consumer: string): void {
  const client = createRedisClient();

  const reclaim = async (): Promise<void> => {
    try {
      // XAUTOCLAIM stream group consumer minIdleTime startId COUNT count
      const result = await (client as Redis).xautoclaim(
        stream,
        group,
        consumer,
        30000,   // minIdleTime ms
        "0-0",   // start from beginning of PEL
        "COUNT", 20
      ) as [string, Array<[string, string[]]>];

      const messages = result[1] ?? [];
      if (messages.length > 0) {
        console.info(
          `[shared-redis] Reclaimed ${messages.length} message(s) on stream ${stream}`
        );
      }
    } catch (err) {
      console.error("[shared-redis] Reclaimer error:", err);
    }
  };

  setInterval(() => {
    reclaim().catch((err) => console.error("[shared-redis] Reclaimer interval error:", err));
  }, 15_000);
}
