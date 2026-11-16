# ADR 0006: Use a Tauri desktop client

- Status: Accepted
- Context: The product is a small personal desktop widget distributed as a Windows installer and must not expose provider secrets.
- Decision: Use Tauri with React and TypeScript, a floating always-on-top window, system tray support, provider cards, refresh, stale/cache states, and settings. Use Cognito Hosted UI with PKCE and Tauri Stronghold for tokens.
- Alternatives considered: PWA, browser automation, and hosted frontend distribution through S3/CloudFront.
- Consequences: The client remains local and receives only non-secret deployment outputs. Windows packaging is required. See ADR 0002 and ADR 0010.
