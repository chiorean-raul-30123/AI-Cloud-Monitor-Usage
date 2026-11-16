import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { ComputeStack } from '../lib/compute-stack';
const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: app.node.tryGetContext('region') ?? 'eu-central-1' };
const prefix = 'ai-cloud-usage-monitor-personal';
const authStack = new AuthStack(app, `${prefix}-auth`, {
  env,
  prefix,
  callbackUrl: app.node.tryGetContext('callbackUrl'),
  logoutUrl: app.node.tryGetContext('logoutUrl'),
  cognitoDomainPrefix: app.node.tryGetContext('cognitoDomainPrefix'),
});
const dataStack = new DataStack(app, `${prefix}-data`, { env, prefix });
new ComputeStack(app, `${prefix}-compute`, {
  env,
  prefix,
  authStack,
  dataStack,
  tauriOrigin: app.node.tryGetContext('tauriOrigin') ?? 'http://localhost:1420',
  throttleBurstLimit: Number(app.node.tryGetContext('throttleBurstLimit') ?? 10),
  throttleRateLimit: Number(app.node.tryGetContext('throttleRateLimit') ?? 5),
  lambdaMemorySize: Number(app.node.tryGetContext('lambdaMemorySize') ?? 256),
  lambdaTimeoutSeconds: Number(app.node.tryGetContext('lambdaTimeoutSeconds') ?? 10),
  lambdaLogRetentionDays: Number(app.node.tryGetContext('lambdaLogRetentionDays') ?? 14),
});
