import * as assert from 'node:assert/strict';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataStack } from '../lib/data-stack';

const app = new cdk.App();
const stack = new DataStack(app, 'DataStackTest', {
  env: { region: 'eu-central-1' },
  prefix: 'ai-cloud-usage-monitor-personal',
});
const template = Template.fromStack(stack);

template.resourceCountIs('AWS::DynamoDB::Table', 1);
template.hasResourceProperties('AWS::DynamoDB::Table', {
  TableName: 'ai-cloud-usage-monitor-personal-data',
  KeySchema: [
    { AttributeName: 'pk', KeyType: 'HASH' },
    { AttributeName: 'sk', KeyType: 'RANGE' },
  ],
  BillingMode: 'PAY_PER_REQUEST',
  PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: false },
  SSESpecification: { SSEEnabled: true },
});
template.hasResource('AWS::DynamoDB::Table', { DeletionPolicy: 'Delete' });

template.resourceCountIs('AWS::SecretsManager::Secret', 1);
template.hasResourceProperties('AWS::SecretsManager::Secret', {
  Name: 'ai-cloud-usage-monitor-personal/provider-keys',
  SecretString: '{"OPENAI_API_KEY":"","ANTHROPIC_API_KEY":""}',
});
template.hasResource('AWS::SecretsManager::Secret', { DeletionPolicy: 'Delete' });

const secretResources = template.findResources('AWS::SecretsManager::Secret');
const secret = Object.values(secretResources)[0] as { Properties?: { SecretString?: string } };
assert.equal(secret.Properties?.SecretString, '{"OPENAI_API_KEY":"","ANTHROPIC_API_KEY":""}');

const outputs = template.findOutputs('*');
assert.deepEqual(Object.keys(outputs).sort(), ['DynamoDbTableArn', 'DynamoDbTableName', 'ProviderSecretArn'].sort());
assert.ok(outputs.DynamoDbTableName);
assert.ok(outputs.DynamoDbTableArn);
assert.ok(outputs.ProviderSecretArn);

console.log('DataStack CDK assertions passed.');
