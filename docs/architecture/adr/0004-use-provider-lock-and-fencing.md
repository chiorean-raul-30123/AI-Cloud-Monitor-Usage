# ADR 0004: Use a provider lock and fencing

- Status: Accepted
- Context: A conditional write performed only after an external call cannot prevent two concurrent Lambda invocations from calling the same provider.
- Decision: Acquire a temporary DynamoDB lock before a refresh, assign a unique fencing token and expiration, and condition the final snapshot write on ownership of the current token. Expired owners cannot overwrite newer data.
- Alternatives considered: No lock, or only a conditional write after the provider call.
- Consequences: Refresh coordination is safe under concurrency, but implementation and testing must cover lock expiry, contention, and release. See ADR 0003.
