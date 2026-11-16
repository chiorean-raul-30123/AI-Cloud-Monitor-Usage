import * as assert from 'node:assert/strict';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { ComputeStack } from '../lib/compute-stack';

const app = new cdk.App();
const authStack = new AuthStack(app, 'AuthStackTest', { env: { region: 'eu-central-1' }, prefix: 'ai-cloud-usage-monitor-personal', callbackUrl: 'http://localhost:1420/auth/callback', logoutUrl: 'http://localhost:1420/auth/logout', cognitoDomainPrefix: 'ai-cloud-usage-monitor-personal-raul' });
const dataStack = new DataStack(app, 'DataStackTest', { env: { region: 'eu-central-1' }, prefix: 'ai-cloud-usage-monitor-personal' });
const stack = new ComputeStack(app, 'ComputeStackTest', { env: { region: 'eu-central-1' }, prefix: 'ai-cloud-usage-monitor-personal', authStack, dataStack, tauriOrigin: 'http://localhost:1420', throttleBurstLimit: 10, throttleRateLimit: 5, lambdaMemorySize: 256, lambdaTimeoutSeconds: 10, lambdaLogRetentionDays: 14 });
const template = Template.fromStack(stack);

template.resourceCountIs('AWS::Lambda::Function', 1);
template.hasResourceProperties('AWS::Lambda::Function', { Runtime: 'nodejs22.x', Handler: 'index.handler', MemorySize: 256, Timeout: 10, Environment: { Variables: { APP_ENVIRONMENT: 'personal' } } });
template.resourceCountIs('AWS::Logs::LogGroup', 1);
template.hasResourceProperties('AWS::Logs::LogGroup', { RetentionInDays: 14 });
template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
template.hasResourceProperties('AWS::ApiGatewayV2::Api', { ProtocolType: 'HTTP', CorsConfiguration: { AllowHeaders: ['authorization', 'content-type'], AllowMethods: ['GET'], AllowOrigins: ['http://localhost:1420'] } });
template.hasResourceProperties('AWS::ApiGatewayV2::Stage', { StageName: 'prod', AutoDeploy: true, DefaultRouteSettings: { ThrottlingBurstLimit: 10, ThrottlingRateLimit: 5 } });
template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', { AuthorizerType: 'JWT', IdentitySource: ['$request.header.Authorization'] });
const authorizers = template.findResources('AWS::ApiGatewayV2::Authorizer');
const authorizerJson = JSON.stringify(Object.values(authorizers)[0]);
assert.match(authorizerJson, /cognito-idp\.eu-central-1\.amazonaws\.com/);
assert.match(authorizerJson, /AuthStackTest:ExportsOutputRefUserPoolAppClient/);
assert.match(authorizerJson, /AuthStackTest:ExportsOutputRefUserPool/);
template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'GET /usage', AuthorizationType: 'JWT' });

const policies = template.findResources('AWS::IAM::Policy');
assert.equal(Object.values(policies).some((resource) => JSON.stringify(resource).match(/dynamodb|secretsmanager/i)), false);

const outputs = template.findOutputs('*');
assert.deepEqual(Object.keys(outputs).sort(), ['ApiId', 'ApiUrl', 'LambdaArn', 'UsageRoute'].sort());
assert.ok(outputs.ApiId);
assert.ok(outputs.ApiUrl);
assert.ok(outputs.LambdaArn);
assert.ok(outputs.UsageRoute);

console.log('ComputeStack CDK assertions passed.');
