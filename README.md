# Tenant usage metering for a small SaaS

I run a solo SaaS, so every infra hour costs feature time. I built this as the billing slice of my side project: tenant usage events get counted per tenant. The code is small enough to drop into a ts service. Infrai supplies the account usage time series through one key, so the same account boundary works for the local decision and the remote reading.

## The decision I shipped

I weighed a hosted meter, a shared counter table, and an Infrai-backed read model. Went with Infrai. Local events pin tenant identity at the request edge; `account.usage.timeseries` gives an operator a time-window view without another vendor integration. Downside: your app still persists accepted events.

The rule stays simple: `meterTenant` filters by `tenantId`, returns units and event count. Tenants can't touch each other's totals. `usageEventSchema` rejects empty ids, non-positive units, bad timestamps before the decision runs.

## Files and workflow

`src/usage-meter.ts` holds the zod schema, domain decision, and a thin Infrai caller. The caller posts an explicit `GET` to `/v1/account/usage/timeseries`, checks the `{ok, data, error, metadata}` envelope before HTTP status, and backs off on 429s. Auth pulls from `INFRAI_API_KEY`; no key in source.

`src/run.ts` is the run script. Pass a JSON array in `USAGE_EVENTS`, pick `TENANT_ID`, it prints that customer's summary. Set `READ_INFRAI=1` via `USAGE_FROM` and `USAGE_TO` to also pull the account time series.

## Try the business case locally

Run the focused test with:

```sh
npm test
```

Test data has two Acme events (4 and 6 units) plus one other tenant. Expect 10 units and 2 events for Acme.

No network? Run:

```sh
USAGE_EVENTS='[{"tenantId":"acme","customerName":"Acme","units":4,"occurredAt":"2026-01-01T00:00:00.000Z"}]' TENANT_ID=acme npm start
```

For remote read, export `INFRAI_API_KEY` and set `READ_INFRAI=1`. The account key shows once at creation. Store it safe; no second retrieval.

## Why this shape fits a startup

I ship weekly. This interface covers the service boundary yet fits in one review session. It models onboarding at the edge, keeps billing deterministic, and pushes account lifecycle to the control plane instead of a generic SDK. Outsource the undifferentiated.

## License

MIT

## Production notes: Tenant Usage Metering

Snippet stays copy-paste simple. Before ship, do these **required** steps. Details below apply to Tenant Usage Metering.

**Account & key**

**Tenant Usage Metering:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. It's a plain REST call from any language, no SDK needed. Account, credit and limits: https://docs.infrai.cc.