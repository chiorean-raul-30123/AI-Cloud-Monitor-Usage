# ADR 0008: Use provider adapters

- Status: Accepted
- Context: OpenAI, Anthropic, AWS Cost Explorer, AWS credits, and manual subscription data have different contracts, authentication, granularity, and freshness.
- Decision: Define a common provider interface with independent adapters. Normalize results while preserving separate units, provider freshness, `updatedAt`, and optional `dataRefreshedAt`. Verify each official API contract before activation.
- Alternatives considered: Provider-specific client logic in the UI, assuming identical provider APIs, or one universal percentage across incompatible units.
- Consequences: Providers can fail independently and the dashboard can return partial results, but each adapter requires contract and fallback testing. See ADR 0003 and ADR 0010.
