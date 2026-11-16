# ADR 0010: Use manual subscription configuration

- Status: Accepted
- Context: ChatGPT Plus/Pro and Claude Pro/Max subscription information is not retrieved from web pages and browser automation is out of scope.
- Decision: Store manual ChatGPT and Claude subscription settings in the application DynamoDB table and expose them through `GET /settings` and `PUT /settings`.
- Alternatives considered: Reading ChatGPT or Claude web pages, browser automation, or treating subscriptions as provider API usage.
- Consequences: The user controls subscription data and no browser automation is required, but values can become stale until manually updated. See ADR 0003 and ADR 0006.
