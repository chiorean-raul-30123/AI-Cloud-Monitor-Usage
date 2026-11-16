# Product Requirements Document — AI Cloud Usage Monitor

## Problem

A single user needs one desktop view of the latest available AI API usage, AI API costs, AWS costs, AWS credits, and manually configured ChatGPT and Claude subscriptions. Provider data has different units, freshness, and access rules, so the product must preserve those distinctions while presenting one dashboard.

## Target user

One personal user. The product is not multi-tenant and does not support public registration or tenant isolation.

## Product objectives

- Provide a small Windows Tauri desktop widget for current-month monitoring.
- Use a low-cost, serverless AWS architecture.
- Authenticate the private user with Cognito.
- Return cached data quickly and coordinate concurrent refreshes safely.
- Preserve the last valid provider snapshot when a refresh fails.
- Demonstrate least-privilege AWS, CDK, testing, monitoring, and cleanup practices.

## MVP functionality

- Tauri desktop window with always-on-top behavior and system tray support.
- Provider cards, refresh action, cached/stale state, and last update time.
- Settings for manual ChatGPT and Claude subscription data, limits, and related configuration.
- `GET /usage`, `GET /settings`, and `PUT /settings`.
- Current-calendar-month reporting in UTC.
- OpenAI and Anthropic usage/cost adapters.
- AWS Cost Explorer monthly cost and service breakdown where supported.
- AWS credits through Billing API when available, with manual fallback.
- Cognito Hosted UI using Authorization Code with PKCE.
- DynamoDB latest-snapshot cache with a 60-minute freshness window.
- CloudWatch metrics, alarms, logs, and SNS email notifications.
- AWS Budget with an initial 5 USD monthly target and a kill switch.

## Integrated providers and sources

- OpenAI organization usage and costs.
- Anthropic usage and cost analytics, with documented fallback options.
- AWS Cost Explorer in `us-east-1`.
- AWS Billing credits when available.
- Manual ChatGPT and Claude subscription configuration; no browser automation.

## Excluded functionality

Scheduled polling, EventBridge schedules, browser automation, provider keys in the client, AWS access keys in Secrets Manager, multi-user support, RDS, ECS/Fargate, VPC/NAT Gateway, PWA hosting, full usage history, complex analytics, and forecasting are excluded from the MVP.

## Functional requirements

1. The API must aggregate provider entries without failing the complete dashboard because one provider failed.
2. Each entry must retain provider, period, units, amount, optional limit and percentage, currency, update state, and error information.
3. The default period must be the current calendar month: first day at 00:00:00 UTC through the current UTC time.
4. A snapshot younger than 60 minutes, measured from `lastSuccessfulUpdate`, must be served from DynamoDB without an external provider call.
5. An expired snapshot must use a temporary lock before calling an external provider.
6. Only the lock owner may persist a result using a fencing-token condition.
7. A provider failure must return the last valid snapshot as stale with a non-sensitive error.
8. `GET /usage` must expose refresh-in-progress state when applicable.
9. Authentication failures must be rejected by API Gateway before Lambda execution.
10. Manual settings must be readable and replaceable through the settings endpoints.

## Non-functional requirements

- Backend and infrastructure: TypeScript and Node.js; infrastructure: AWS CDK in TypeScript.
- Application stack region: `eu-central-1`; Cost Explorer client region: `us-east-1`.
- One modular Lambda for the MVP.
- External call timeout: configurable, default 10 seconds; one retry for 429, 502, 503, and 504.
- No sensitive values in source, client, logs, or clear-text environment variables.
- CloudWatch logs retained for 14 days.
- CORS must explicitly name the Tauri origin; wildcard CORS is not allowed.
- The desktop client converts UTC timestamps to the local display timezone.
- IAM permissions must follow least privilege.

## Error behavior

Authentication, authorization, and validation failures are not retried. A provider failure does not fail the aggregate response: the last valid snapshot is returned with `stale: true`, a non-sensitive error code, and its last successful update. AWS credits fall back to manual configuration when unavailable.

## Security

Cognito provides one private user with public sign-up disabled. API Gateway uses a native Cognito JWT Authorizer. OpenAI and Anthropic administrative keys are stored together in one JSON Secrets Manager secret. AWS credentials are supplied by the Lambda execution role. The desktop client receives only non-secret deployment outputs.

## Cost control

The architecture avoids continuously billed infrastructure such as NAT Gateway, RDS, and ECS. DynamoDB uses on-demand mode. Refresh occurs only on demand. A 5 USD initial AWS Budget, configurable alerts, CloudWatch thresholds, API throttling, logical refresh limits, provider safety limits, and a DynamoDB kill switch limit exposure.

## Acceptance criteria

- The Windows Tauri installer starts and displays provider states.
- Cognito protects the API and unauthorized requests are rejected before Lambda.
- Valid cache is returned inside 60 minutes.
- Concurrent expired requests do not make duplicate provider refreshes.
- Fencing prevents an expired lock owner from overwriting newer data.
- Provider failures preserve the last valid snapshot.
- Manual subscription settings are editable.
- Provider secrets are absent from source and client files.
- CloudWatch alarms, SNS notifications, and the 5 USD budget are configured.
- Tests cover cache, concurrency, errors, manual configuration, CDK, and selected authentication E2E behavior.
- CDK deployment and cleanup succeed when performed in a real AWS environment.

## Risks and limitations

Provider contracts, permissions, granularity, and freshness can change. Anthropic analytics may be beta or unavailable. AWS credits may not be accessible for every account. Provider data may be delayed or revised. The personal single-user scope and manual subscription configuration limit general product applicability. No scheduled polling means alarms reflect the latest user-triggered refresh only.

## Future directions

Only after the MVP and current provider contracts are verified: broader operational hardening, additional supported provider capabilities, and product features justified by a clear requirement. Multi-tenant functionality, historical analytics, and forecasting are not implied by this document.
