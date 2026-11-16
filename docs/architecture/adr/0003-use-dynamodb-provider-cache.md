# ADR 0003: Use a DynamoDB provider cache

- Status: Accepted
- Context: Provider calls are external, may be delayed, and should not occur on every dashboard read.
- Decision: Use one on-demand DynamoDB table for the latest provider snapshots and manual configuration. A snapshot is valid for 60 minutes based on `lastSuccessfulUpdate`, not a cached read. Retain only the latest snapshot in the MVP.
- Alternatives considered: Scheduled polling, full usage history, DynamoDB Streams, global tables, backups, and point-in-time recovery.
- Consequences: Reads are inexpensive and fast, but historical analytics are not available. Cache coordination requires the lock and fencing decision in ADR 0004.
