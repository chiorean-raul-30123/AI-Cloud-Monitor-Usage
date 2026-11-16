import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { ProjectStack, StackProps } from './stack-base';

export class DataStack extends ProjectStack {
  public readonly table: dynamodb.Table;
  public readonly providerSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'ApplicationTable', {
      tableName: `${props.prefix}-data`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.providerSecret = new secretsmanager.Secret(this, 'ProviderSecret', {
      secretName: `${props.prefix}/provider-keys`,
      description: 'Provider administrative keys for AI Cloud Usage Monitor.',
      secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
      })),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, 'DynamoDbTableName', { value: this.table.tableName });
    new cdk.CfnOutput(this, 'DynamoDbTableArn', { value: this.table.tableArn });
    new cdk.CfnOutput(this, 'ProviderSecretArn', { value: this.providerSecret.secretArn });
  }
}
