# AI Cloud Usage Monitor

## Document purpose

This document records the architectural decisions for **AI Cloud Usage Monitor**, a personal desktop application that monitors AI API consumption, AWS costs and AWS credits. It is designed as a portfolio project demonstrating practical AWS Cloud Practitioner knowledge through a low-cost serverless architecture.

The document is the reference for implementation tasks, Codex prompts, testing, deployment and the final README.

The default reporting period is the current calendar month, similar to the usage view in ChatGPT. Provider adapters may use the closest supported granularity and must preserve the provider's freshness timestamp.

## 1. Scope and objectives

The application will be used by one person. It will display the latest available usage and cost information for OpenAI, Anthropic and AWS, together with manually configured ChatGPT and Claude subscriptions.

The project must demonstrate:

- serverless AWS architecture;
- IAM least privilege;
- Amazon Cognito authentication;
- API Gateway and Lambda integration;
- DynamoDB caching and concurrency control;
- Secrets Manager usage;
- CloudWatch metrics, alarms and logs;
- SNS notifications;
- AWS Budgets and cost protection;
- infrastructure as code with AWS CDK;
- automated tests and cleanup procedures.

The application will not read ChatGPT or Claude web pages and will not automate a browser. ChatGPT Plus/Pro and Claude Pro/Max are configured manually through the application.

## 2. Fixed technology decisions

| Area | Decision |
|---|---|
| Project name | AI Cloud Usage Monitor |
| Scope | Personal monitoring and AWS portfolio demonstration |
| Backend | TypeScript and Node.js |
| Infrastructure | AWS CDK in TypeScript |
| AWS region | `eu-central-1` for the application stack; `us-east-1` for Cost Explorer calls |
| Desktop client | Tauri + React + TypeScript |
| Authentication | Amazon Cognito, one private user |
| API | API Gateway HTTP API |
| Database | One DynamoDB table, on-demand mode |
| Secrets | One JSON secret in Secrets Manager containing provider administrative keys |
| Lambda design | One modular Lambda for the MVP |
| Repository | Monorepo |
| Package manager | npm |
| Frontend distribution | Windows Tauri installer |
| CI/CD | GitHub Actions attempted from the beginning |

## 3. High-level architecture

```text
Tauri desktop application
        |
        | Cognito JWT
        v
API Gateway HTTP API
        |
        v
JWT Authorizer
        |
        v
Usage Lambda
  |       |        |        |
  v       v        v        v
DynamoDB Secrets  AWS      AI provider APIs
cache    Manager  APIs
```

The Tauri client is local and distributed as an installer. The backend is deployed to AWS. There is no PWA, S3 frontend hosting or CloudFront in the MVP.

## 4. Refresh and cache strategy

There is no scheduled polling, EventBridge schedule or scheduled Lambda. Data is refreshed only when the user presses Refresh or when the application requests the dashboard data.

For every provider:

1. API Gateway authenticates the request using Cognito.
2. Lambda reads the provider item from DynamoDB.
3. If the last real update is less than 60 minutes old, Lambda returns the cached snapshot.
4. If the snapshot is expired, Lambda attempts to acquire a temporary lock.
5. Only the request that acquires the lock calls the external provider API.
6. Lambda writes the new snapshot with a conditional fencing check.
7. Lambda releases or expires the lock and returns the result.
8. Other concurrent requests re-read the item or return the latest snapshot with a refresh-in-progress indication.

The cache age is calculated from `lastSuccessfulUpdate`, never from the time of a cached read.

Every provider response includes at least:

- `updatedAt`;
- `isCached`;
- `stale`;
- provider identifier;
- usage and cost values where available;
- configured limit where available;
- percentage used where meaningful;
- error information when a refresh fails.
- `dataRefreshedAt` when the upstream provider supplies a separate freshness timestamp.

## 5. Concurrency control

A conditional write performed only after an external API call is insufficient because two Lambda invocations could call the same provider simultaneously. The implementation therefore uses both:

- a temporary DynamoDB lock acquired before the external call;
- a conditional, fenced write when persisting the result.

The lock contains a unique fencing token and an expiration time. The final write succeeds only if the invocation still owns the current fencing token. An invocation whose lock expired cannot overwrite a newer snapshot.

## 6. DynamoDB design

One table is used for provider snapshots and manual configuration.

| Partition key | Sort key | Purpose |
|---|---|---|
| `PROVIDER#OPENAI` | `STATE` | OpenAI snapshot |
| `PROVIDER#ANTHROPIC` | `STATE` | Anthropic snapshot |
| `PROVIDER#AWS` | `STATE` | AWS Cost Explorer snapshot |
| `PROVIDER#AWS_CREDITS` | `STATE` | AWS credits snapshot or fallback state |
| `MANUAL#CHATGPT` | `STATE` | ChatGPT subscription settings |
| `MANUAL#CLAUDE` | `STATE` | Claude subscription settings |

Provider items contain the snapshot, `updatedAt`, `lastSuccessfulUpdate`, `lockUntil`, `lockToken`, `version`, `stale` and the last error metadata. Only the latest snapshot is retained in the MVP. No DynamoDB Streams, global tables, backups or point-in-time recovery are required for the first version.

## 7. Providers

The backend will expose a common provider interface and independent adapters for:

- OpenAI API usage and cost;
- Anthropic API usage and cost;
- AWS Cost Explorer;
- AWS credits through the AWS Billing API when available;
- manual ChatGPT subscription data;
- manual Claude subscription data.

The default reporting period is the current calendar month. OpenAI usage and costs are queried through `/v1/organization/usage/completions` and `/v1/organization/costs`. OpenAI cost results use daily buckets and may be paginated.

Anthropic uses the Usage and Cost Analytics API where the account supports it: `/v1/organizations/analytics/usage` and `/v1/organizations/analytics/cost`. This API is beta and requires the documented beta and version headers. If Analytics access is unavailable, the implementation may use the legacy Usage and Cost Admin API or the manual fallback. Anthropic data may be delayed or revised, so the snapshot stores both `updatedAt` and `dataRefreshedAt`.

AWS Cost Explorer is called through the `us-east-1` service region even though the application stack is deployed in `eu-central-1`. The provider uses `ce:GetCostAndUsage` and queries the current calendar month.

AWS credits use the Billing `GetCredits` operation when available. The request requires the AWS account ID and a start date. If the operation is unavailable because of account or permission restrictions, the UI switches to manual credit configuration and provides a link to the AWS Billing Console.

Each external provider is activated only after its current official API contract, authentication method, response fields, granularity and access requirements have been verified. The implementation must not assume that OpenAI and Anthropic expose identical data.

If AWS credits cannot be retrieved through the account or permissions available, the application falls back to manual credit configuration and provides a link to the AWS Billing Console.

## 8. Normalized response model

The API returns one aggregated response containing all providers. A single provider failure does not fail the complete dashboard. The response uses HTTP 200 with per-provider status information.

Conceptually, each provider entry contains:

```text
provider
usedAmount
usedUnit
limitAmount
limitUnit
percentageUsed
currency
updatedAt
isCached
stale
error
```

Costs, token usage, credits and subscription consumption remain separate values. The application does not create a misleading universal percentage between incompatible units.

## 9. Error handling and resilience

If a provider fails during refresh, Lambda returns the last valid snapshot with `stale: true` and a non-sensitive error code. The widget displays the last successful update time and the provider error state.

External calls use a configurable timeout, with a default of 10 seconds. One retry is allowed for transient failures such as `429`, `502`, `503` and `504`. Authentication, authorization and validation errors are not retried.

## 10. Authentication and authorization

Amazon Cognito provides one private user. Public sign-up is disabled. The User Pool and App Client are defined through CDK.

API Gateway uses a native JWT Authorizer and validates Cognito tokens before invoking Lambda. No Lambda Authorizer is used in the MVP.

The application is not designed as a multi-tenant product. There are no user groups, roles or tenant isolation rules in the first version.

## 11. Secrets and IAM

OpenAI and Anthropic administrative keys are stored in one JSON secret in AWS Secrets Manager. A normal OpenAI project key or an Anthropic workspace key may not provide organization usage and cost access. Secrets are never stored in source code, the Tauri client or clear-text environment variables. Rotation is manual and documented.

AWS credentials are not stored in Secrets Manager. Lambda accesses AWS services using its execution role.

The role follows least privilege and grants only the actions required by the implementation:

- read and update the application DynamoDB table;
- read the application secret;
- query the required Cost Explorer operation;
- query AWS credits when supported;
- write CloudWatch custom metrics;
- write Lambda logs.

Permissions are scoped to the application table and secret ARN wherever the AWS service supports resource-level restrictions.

## 12. Monitoring and notifications

When Lambda performs a real provider refresh, it calculates the configured percentage used and publishes a CloudWatch custom metric. A standard CloudWatch alarm is configured per provider with a configurable threshold, initially 80%.

SNS sends email notifications. SMS is not included.

The alarms represent the latest real synchronization. Because there is no scheduled polling, no new metric is emitted while the application is not refreshed.

CloudWatch logs exclude API keys, Cognito tokens, complete upstream responses and sensitive user data. Log retention is 14 days.

## 13. Cost protection

The initial AWS Budget is 5 USD per month. It will send alerts at configured thresholds. If testing shows that the budget is too restrictive, it can be increased to 10 USD.

The application also includes a kill switch. When disabled, Lambda stops external provider calls while preserving cached data. Full infrastructure removal remains a manual operation through CDK cleanup.

The MVP does not use NAT Gateway, RDS, ECS, VPC networking or other continuously billed infrastructure.

## 14. Desktop client

The desktop client is a Tauri application with:

- a small floating window;
- always-on-top behavior;
- system tray support;
- provider cards;
- refresh action;
- cached and stale states;
- last update time;
- settings page for manual subscriptions and limits.

The client is distributed as a Windows installer. It does not contain provider secrets. It receives non-secret deployment outputs such as the API URL and Cognito client configuration.

## 15. Repository structure

```text
ai-cloud-usage-monitor/
├── infrastructure/
├── backend/
├── desktop/
├── docs/
├── scripts/
├── README.md
└── .env.example
```

The repository uses `main` plus `feat/*`, `fix/*` and `chore/*` branches. The main branch remains deployable.

## 16. Testing strategy

The project includes:

- unit tests for cache validity decisions;
- tests for expired cache behavior;
- tests for lock acquisition and fencing;
- tests for concurrent refreshes;
- tests for provider timeout and retry rules;
- tests for fallback to the last valid snapshot;
- tests for partial provider failures;
- tests for manual configuration;
- CDK assertions for resources, IAM and integrations;
- a small number of end-to-end tests against a deployed AWS environment.

Local tests use mocks and test doubles. Real AWS verification is performed selectively to control cost.

## 17. Deployment strategy

The first deployment will be performed through CDK. GitHub Actions will be attempted from the beginning for validation and deployment automation. If CI/CD configuration delays the core project, the first working deployment will be performed manually and GitHub Actions will be added afterward.

The initial AWS environment is a single personal environment. A second production environment is not required for the MVP.

## 18. Cleanup strategy

The project includes a cleanup script based on `cdk destroy`. Cleanup verifies that no application resources remain, including:

- CloudFormation stacks;
- API Gateway API;
- Lambda function;
- DynamoDB table;
- Cognito User Pool;
- SNS topic and subscriptions;
- CloudWatch alarms and log groups;
- Secrets Manager secret;
- any optional S3 resources.

The cleanup procedure must be tested before the final project demonstration.

## 19. Alternatives deliberately excluded

The following are excluded from the MVP:

- scheduled polling;
- EventBridge schedules;
- browser automation for ChatGPT or Claude subscriptions;
- API keys in the frontend;
- AWS access keys in Secrets Manager;
- multi-user and multi-tenant support;
- RDS;
- ECS or Fargate;
- VPC and NAT Gateway;
- PWA hosting;
- full usage history;
- complex analytics and forecasting.

These features may be considered later only if they support a clear product requirement.

## 20. Implementation order

1. Verify the current OpenAI, Anthropic and AWS API contracts.
2. Create the monorepo and documentation structure.
3. Define the CDK stack and Cognito resources.
4. Define DynamoDB and IAM policies.
5. Implement the Lambda request contract and cache decision logic.
6. Implement locking and fencing.
7. Implement AWS Cost Explorer and AWS credits adapters.
8. Implement OpenAI and Anthropic adapters.
9. Implement manual subscription settings.
10. Add CloudWatch metrics, alarms, SNS and the kill switch.
11. Build the Tauri widget and installer.
12. Add unit, CDK and end-to-end tests.
13. Configure GitHub Actions.
14. Deploy, verify costs and test cleanup.

## 21. Definition of done for the MVP

The MVP is complete when:

- the Tauri installer starts successfully;
- Cognito authentication protects the API;
- cached data is returned inside the 60-minute window;
- only one concurrent request refreshes an expired provider;
- fenced writes prevent stale invocations from overwriting newer data;
- provider errors preserve the last valid snapshot;
- manual subscriptions can be edited from Settings;
- secrets are absent from source and client files;
- CloudWatch alarms and SNS notifications are configured;
- the 5 USD AWS Budget exists;
- tests cover the cache and concurrency rules;
- CDK deploy succeeds;
- cleanup removes the application resources;
- README documents architecture, cost assumptions, deployment and cleanup.

## 22. Reporting period and data contract

The default reporting period is the current calendar month:

```text
periodStart = first day of the current month at 00:00:00 UTC
periodEnd = current time in UTC
```

OpenAI and Anthropic usage and cost are represented separately from AWS costs and credits. Limits are configured by the user. `percentageUsed` is calculated only when a limit exists; otherwise it is `null`.

The normalized provider snapshot contains:

```text
provider
periodStart
periodEnd
updatedAt
dataRefreshedAt
isCached
stale
usedAmount
usedUnit
limitAmount
limitUnit
percentageUsed
currency
details
error
```

OpenAI details include cost, input tokens, output tokens, cached input tokens and request count. Anthropic details include the corresponding cost, token and request values. AWS details include total monthly cost and a service breakdown. AWS credits include remaining amount, initial amount, currency, expiration and estimated exhaustion date. Manual subscriptions include usage, limit, percentage and renewal date.

## 23. API contract

The main endpoint is:

```text
GET /usage
```

It returns an aggregated result for all enabled providers. It also refreshes any provider whose snapshot is at least 60 minutes old. Providers with valid cache are returned without external calls.

Manual configuration uses:

```text
GET /settings
PUT /settings
```

The `PUT` request updates the complete settings document for the single user. A refresh that encounters an active refresh lock returns HTTP 200 with the latest snapshot and `refreshInProgress: true`. A single provider failure does not fail the complete response.

Authentication failures are rejected by API Gateway with HTTP 401 or 403 before Lambda execution. Provider and application errors use a common structure containing `code`, `message`, `provider` and `retryable`.

Lambda consumes all required provider pages and stores one aggregated snapshot. The client never handles provider-specific pagination.

## 24. Client authentication and transport

The Tauri client uses Cognito Hosted UI with Authorization Code and PKCE. The client stores tokens in Tauri Stronghold. API Gateway uses a native Cognito JWT Authorizer.

CORS is explicitly configured for the Tauri origin and does not use a wildcard origin. The backend uses UTC for all calculations; the client converts timestamps to the local display timezone.

## 25. Operational controls

API Gateway throttling is combined with logical refresh limits in Lambda. Provider calls also respect the provider-enabled setting and the configured daily or monthly safety limits.

The kill switch is stored in the `CONFIG#GLOBAL` DynamoDB item. When disabled, Lambda returns cached data and does not call external providers. The same configuration item stores provider enabled flags, user limits and alert thresholds.

AWS Cost Explorer uses one query for the current monthly total and service breakdown where the API supports the grouping. The client displays the total first and the service breakdown as additional detail.

## 26. Authentication testing

Authentication is tested through unit tests for authorization-related application behavior and at least one end-to-end test using a real Cognito User Pool, API Gateway JWT Authorizer and Lambda integration. The end-to-end test is run selectively to control AWS usage.

## 27. Monorepo structure

The repository is organized by responsibility:

```text
ai-cloud-usage-monitor/
├── infrastructure/
├── backend/
├── desktop/
├── shared/
├── docs/
├── scripts/
├── .github/
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
```

The root uses npm workspaces. `shared` contains TypeScript API contracts, normalized provider models and settings models consumed by the backend and desktop client. Tests remain next to the component they verify. Documentation is grouped into architecture, operations, security, testing and cost sections.

The CDK project uses domain-oriented stacks where useful: authentication, data, compute and monitoring. The backend remains one modular Lambda for the MVP. The desktop project keeps React UI code separate from native Tauri code.

## 28. Development standards

Lambda code is bundled with esbuild through AWS CDK. TypeScript is checked in every workspace. Vitest is used for unit tests, CDK assertions and mocked provider tests. ESLint and Prettier enforce code quality and formatting.

The root command `npm run validate` runs the required typecheck, lint, formatting check and test suites. A `.env.example` documents non-secret local configuration; real secrets are never committed.

The project uses Conventional Commits and branches named `feat/*`, `fix/*` and `chore/*`. The `main` branch requires a pull request and passing CI before merge.

## 29. CI/CD

GitHub Actions uses separate jobs for installation, linting, typechecking, tests, CDK synthesis and build verification. Deployment is triggered automatically only after changes reach `main`.

GitHub Actions authenticates to AWS using IAM OIDC federation. Long-lived AWS access keys are not stored in GitHub Secrets. If automated deployment delays the MVP, the same CDK deployment can be run manually while preserving the pipeline design for later activation.

## 30. Operational documentation

The root README contains the quick start, architecture summary and common commands. Detailed deployment, destroy, cleanup verification, cost monitoring and troubleshooting procedures live under `docs/operations/`.

## 31. CDK stack organization

The CDK application uses four domain-oriented stacks:

```text
AuthStack
  ↓
DataStack
  ↓
ComputeStack
  ↓
MonitoringStack
```

`AuthStack` owns the Cognito User Pool, App Client and Hosted UI domain. `DataStack` owns the DynamoDB table and Secrets Manager secret. `ComputeStack` owns the Lambda, API Gateway HTTP API, JWT Authorizer and routes. `MonitoringStack` owns CloudWatch configuration, alarms, SNS and the AWS Budget.

Stack names and resources use the project and environment prefix, for example `ai-cloud-usage-monitor-personal`.

## 32. CDK bootstrap and environment configuration

The account is bootstrapped using the standard CDK bootstrap in `eu-central-1`. Account and region are resolved from the AWS CLI environment through CDK defaults. The stack region is configurable through CDK context and defaults to `eu-central-1`.

AWS Cost Explorer calls still use the `us-east-1` SDK client region. AWS credits use the account ID obtained from STS rather than storing the account ID as a secret.

The application uses one API Gateway `prod` stage for the personal environment. There are no parallel development and production stacks in the MVP.

## 33. Secret lifecycle

CDK creates the Secrets Manager secret without real provider key values. The secret is populated after deployment through a documented secure procedure. Real values are never passed as CDK command-line arguments, committed to source control or written into CloudFormation templates.

Because the environment is personal and disposable, the secret uses a destroy-compatible removal policy. The cleanup script verifies that it has been removed.

## 34. Resource tags and client outputs

All resources receive common tags:

```text
Project=ai-cloud-usage-monitor
Environment=personal
ManagedBy=cdk
Owner=raul
```

CDK outputs are written to a desktop configuration file containing only non-secret values:

```text
apiUrl
userPoolId
userPoolClientId
cognitoDomain
region
```

The Tauri client does not discover AWS resources at runtime and does not receive provider secrets.
