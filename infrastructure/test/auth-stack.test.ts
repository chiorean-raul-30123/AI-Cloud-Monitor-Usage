import * as assert from 'node:assert/strict';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();
const stack = new AuthStack(app, 'AuthStackTest', {
  env: { region: 'eu-central-1' },
  prefix: 'ai-cloud-usage-monitor-personal',
  callbackUrl: 'http://localhost:1420/auth/callback',
  logoutUrl: 'http://localhost:1420/auth/logout',
  cognitoDomainPrefix: 'ai-cloud-usage-monitor-personal-raul',
});
const template = Template.fromStack(stack);

template.resourceCountIs('AWS::Cognito::UserPool', 1);
template.hasResourceProperties('AWS::Cognito::UserPool', {
  AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
  AccountRecoverySetting: {
    RecoveryMechanisms: [{ Name: 'verified_email', Priority: 1 }],
  },
  AutoVerifiedAttributes: ['email'],
  UsernameAttributes: ['email'],
});
template.hasResource('AWS::Cognito::UserPool', { DeletionPolicy: 'Delete' });
template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
  AllowedOAuthFlows: ['code'],
  AllowedOAuthFlowsUserPoolClient: true,
  CallbackURLs: ['http://localhost:1420/auth/callback'],
  LogoutURLs: ['http://localhost:1420/auth/logout'],
  GenerateSecret: false,
});
template.resourceCountIs('AWS::Cognito::UserPoolDomain', 1);
template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
  Domain: 'ai-cloud-usage-monitor-personal-raul',
});

const outputs = template.findOutputs('*');
assert.deepEqual(Object.keys(outputs).sort(), ['AwsRegion', 'CognitoDomain', 'UserPoolClientId', 'UserPoolId'].sort());
assert.ok(outputs.UserPoolId);
assert.ok(outputs.UserPoolClientId);
assert.ok(outputs.CognitoDomain);
assert.ok(outputs.AwsRegion);

console.log('AuthStack CDK assertions passed.');
