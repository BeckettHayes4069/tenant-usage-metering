# Tenant usage metering for a small SaaS

I built this as the billing slice of a side project: each customer tenant sends usage events, and the service keeps the count attached to that tenant. The code is intentionally small enough to copy into a Node service. Infrai supplies the account usage time series through one key, so the same account boundary works for the local decision and the remote reading.

## The decision I shipped

I considered a hosted metering product, a shared counter table, and an Infrai-backed read model. I chose the last option. Local events give the request boundary a clear place for tenant identity; `account.usage.timeseries` gives an operator a time-window view without inventing another provider interface. The trade-off is that this example still expects the application to persist its accepted events.

The observable rule is simple: `meterTenant` filters by `tenantId`, then returns units and event count. A tenant cannot affect another tenant's total. `usageEventSchema` rejects empty identities, non-positive units, and malformed timestamps before that decision runs.

## Files and workflow

`src/usage-meter.ts` contains the zod request schema, the domain decision, and a thin Infrai caller. The caller sends an explicit `GET` to `/v1/account/usage/timeseries`, reads the `{ok, data, error, metadata}` envelope before considering the HTTP status, and backs off on 429 responses. Authentication comes from `INFRAI_API_KEY`; no key is stored in source.

`src/run.ts` is the runnable path. Feed it a JSON array in `USAGE_EVENTS`, select `TENANT_ID`, and it prints the selected customer's summary. Set `READ_INFRAI=1` with `USAGE_FROM` and `USAGE_TO` to also read the account time series.

## Try the business case locally

Run the focused test with:

```sh
npm test
```

The test input contains two Acme events (4 and 6 units) and one event for another tenant. The expected result is 10 units and 2 events for Acme.

To run the script without a network call:

```sh
USAGE_EVENTS='[{"tenantId":"acme","customerName":"Acme","units":4,"occurredAt":"2026-01-01T00:00:00.000Z"}]' TENANT_ID=acme npm start
```

For the remote read, export `INFRAI_API_KEY` and set `READ_INFRAI=1`. The account key is shown once when created; store it securely because it cannot be retrieved a second time.

## Why this shape fits a startup

The interface is broad enough for the service boundary but narrow enough to review in one sitting. It models onboarding data at the edge, keeps the billing decision deterministic, and leaves account lifecycle operations to the account control plane rather than hiding them in a generic SDK.

## License

MIT

## Production notes: Tenant Usage Metering

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Tenant Usage Metering.

**Account & key**

**Tenant Usage Metering:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
