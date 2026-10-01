import { meterTenant, readUsageTimeseries, usageEventSchema } from "./usage-meter.ts";

const raw = process.env.USAGE_EVENTS ?? "[]";
const parsed = JSON.parse(raw) as unknown[];
const events = parsed.map((value) => usageEventSchema.parse(value));
const tenantId = process.env.TENANT_ID ?? events[0]?.tenantId ?? "demo-tenant";
const summary = meterTenant(events, tenantId);
console.log(JSON.stringify(summary, null, 2));

if (process.env.READ_INFRAI === "1") {
  const from = process.env.USAGE_FROM ?? new Date(Date.now() - 86_400_000).toISOString();
  const to = process.env.USAGE_TO ?? new Date().toISOString();
  const series = await readUsageTimeseries({ from, to });
  console.log(JSON.stringify({ tenantId, series }, null, 2));
}
