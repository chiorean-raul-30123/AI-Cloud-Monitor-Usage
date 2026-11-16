# ADR 0001: Use a serverless AWS architecture

- Status: Accepted
- Context: The personal portfolio application must monitor provider data at low cost and demonstrate AWS serverless capabilities.
- Decision: Use Amazon Cognito, API Gateway HTTP API, one modular Lambda, DynamoDB, Secrets Manager, CloudWatch, SNS, and AWS Budget within an AWS CDK application. Deploy the application stack in `eu-central-1`; Cost Explorer calls use `us-east-1`.
- Alternatives considered: PWA hosting, S3/CloudFront frontend hosting, RDS, ECS/Fargate, VPC/NAT Gateway, and scheduled polling are excluded from the MVP.
- Consequences: The system has low operational overhead and cost exposure, but refresh and alarm data are user-triggered rather than scheduled. See ADR 0002, ADR 0003, ADR 0005, and ADR 0009.
