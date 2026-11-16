# ADR 0009: Use CloudWatch and SNS alerting

- Status: Accepted
- Context: The application must surface configured usage thresholds and operational logs while controlling cost.
- Decision: On real provider refresh, publish a CloudWatch custom metric. Configure a per-provider alarm with an initial 80% threshold, SNS email notifications, and 14-day log retention. Configure the initial AWS Budget at 5 USD per month.
- Alternatives considered: SMS notifications, alarms based on scheduled polling, and continuously running monitoring infrastructure.
- Consequences: Alerts represent the latest real user-triggered synchronization; no metric is emitted while the application is not refreshed. See ADR 0001 and ADR 0008.
