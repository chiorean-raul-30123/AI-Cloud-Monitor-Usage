# ADR 0002: Use Cognito authentication

- Status: Accepted
- Context: The application is private and has one user; API access must be authenticated before application execution.
- Decision: Use one Amazon Cognito User Pool with public sign-up disabled, an App Client, Cognito Hosted UI with Authorization Code and PKCE, and an API Gateway native JWT Authorizer. Do not use a Lambda Authorizer.
- Alternatives considered: Public API access, custom Lambda authorization, and multi-tenant identity design.
- Consequences: API Gateway rejects invalid requests before Lambda. The desktop client handles tokens through Tauri Stronghold. See ADR 0001 and ADR 0006.
