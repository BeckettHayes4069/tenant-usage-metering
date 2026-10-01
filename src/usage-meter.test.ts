import test from "node:test";
import assert from "node:assert/strict";
import { meterTenant, usageEventSchema } from "./usage-meter.ts";

test("meters only the selected tenant for a billing decision", () => {
  const events = [
    usageEventSchema.parse({ tenantId: "acme", customerName: "Acme", units: 4, occurredAt: "2026-01-01T00:00:00.000Z" }),
    usageEventSchema.parse({ tenantId: "other", customerName: "Other", units: 90, occurredAt: "2026-01-01T00:00:00.000Z" }),
    usageEventSchema.parse({ tenantId: "acme", customerName: "Acme", units: 6, occurredAt: "2026-01-02T00:00:00.000Z" })
  ];
  assert.deepEqual(meterTenant(events, "acme"), { tenantId: "acme", customerName: "Acme", units: 10, eventCount: 2 });
});
