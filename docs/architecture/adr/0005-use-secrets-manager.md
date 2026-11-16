# ADR 0005: Use Secrets Manager for provider keys

- Status: Accepted
- Context: OpenAI and Anthropic administrative keys are sensitive and must not reach source control or the desktop client.
- Decision: Store the OpenAI and Anthropic administrative keys in one JSON AWS Secrets Manager secret. Populate it securely after deployment; use Lambda IAM to read it. Do not store AWS credentials there.
- Alternatives considered: Source code, client configuration, clear-text environment variables, and AWS access keys in Secrets Manager.
- Consequences: Secret access is centralized and auditable, while rotation remains manual. The secret uses a destroy-compatible policy for this disposable personal environment. See ADR 0001.
