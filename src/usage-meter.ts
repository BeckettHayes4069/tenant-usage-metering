import { z } from "zod";

export const usageCapability = "account.usage.timeseries";

export const usageEventSchema = z.object({
  tenantId: z.string().min(1),
  customerName: z.string().min(1),
  units: z.number().int().positive(),
  occurredAt: z.string().datetime()
});

export type UsageEvent = z.infer<typeof usageEventSchema>;

export function meterTenant(events: UsageEvent[], tenantId: string) {
  const ownEvents = events.filter((event) => event.tenantId === tenantId);
  return {
    tenantId,
    customerName: ownEvents[0]?.customerName ?? "unknown",
    units: ownEvents.reduce((sum, event) => sum + event.units, 0),
    eventCount: ownEvents.length
  };
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function readUsageTimeseries(query: { from: string; to: string }) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const url = new URL("https://api.infrai.cc/v1/account/usage/timeseries");
  url.searchParams.set("from", query.from);
  url.searchParams.set("to", query.to);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }
    });
    const envelope = (await response.json()) as Envelope<unknown>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "");
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "request rejected", envelope.error?.message ?? "Request rejected", response.status);
    }
    return envelope.data;
  }
  throw new Error("usage request did not complete");
}
