import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface StackProps extends cdk.StackProps { prefix: string }
export abstract class ProjectStack extends cdk.Stack {
  protected readonly removalPolicy = cdk.RemovalPolicy.DESTROY;
  protected constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    cdk.Tags.of(this).add('Project', 'ai-cloud-usage-monitor');
    cdk.Tags.of(this).add('Environment', 'personal');
    cdk.Tags.of(this).add('ManagedBy', 'cdk');
    cdk.Tags.of(this).add('Owner', 'raul');
  }
}
