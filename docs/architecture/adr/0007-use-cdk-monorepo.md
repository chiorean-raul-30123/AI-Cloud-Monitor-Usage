# ADR 0007: Use an AWS CDK TypeScript npm monorepo

- Status: Accepted
- Context: Infrastructure, backend, desktop, and shared contracts have distinct responsibilities but must evolve together.
- Decision: Use an npm-workspaces monorepo with `infrastructure`, `backend`, `desktop`, and `shared`. Define AWS resources in TypeScript CDK domain stacks: AuthStack, DataStack, ComputeStack, and MonitoringStack, in that dependency order.
- Alternatives considered: Separate repositories, non-TypeScript infrastructure, and a single undifferentiated stack.
- Consequences: Shared contracts and coordinated validation are straightforward, while workspace boundaries and CDK stack dependencies must be maintained. GitHub Actions validates the repository; deployment automation is not assumed here.
