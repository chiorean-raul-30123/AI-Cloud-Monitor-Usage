import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { ProjectStack, StackProps } from './stack-base';
import { AuthStack } from './auth-stack';
import { DataStack } from './data-stack';

export interface ComputeStackProps extends StackProps {
  authStack: AuthStack;
  dataStack: DataStack;
  tauriOrigin: string;
  throttleBurstLimit: number;
  throttleRateLimit: number;
  lambdaMemorySize: number;
  lambdaTimeoutSeconds: number;
  lambdaLogRetentionDays: number;
}

export class ComputeStack extends ProjectStack {
  public readonly usageFunction: nodejs.NodejsFunction;
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);
    this.addDependency(props.authStack);
    this.addDependency(props.dataStack);

    const logGroup = new logs.LogGroup(this, 'UsageFunctionLogGroup', {
      retention: props.lambdaLogRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.usageFunction = new nodejs.NodejsFunction(this, 'UsageFunction', {
      functionName: `${props.prefix}-usage`,
      entry: `${__dirname}/usage-handler.ts`,
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(props.lambdaTimeoutSeconds),
      memorySize: props.lambdaMemorySize,
      logGroup,
      environment: { APP_ENVIRONMENT: 'personal' },
    });

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer('CognitoJwtAuthorizer',
      `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${props.authStack.userPool.userPoolId}`,
      { jwtAudience: [props.authStack.userPoolClient.userPoolClientId] },
    );

    this.httpApi = new apigwv2.HttpApi(this, 'UsageHttpApi', {
      apiName: `${props.prefix}-api`,
      createDefaultStage: false,
      corsPreflight: {
        allowOrigins: [props.tauriOrigin],
        allowMethods: [apigwv2.CorsHttpMethod.GET],
        allowHeaders: ['authorization', 'content-type'],
      },
    });

    const stage = new apigwv2.CfnStage(this, 'ProdStage', {
      apiId: this.httpApi.apiId,
      stageName: 'prod',
      autoDeploy: true,
      defaultRouteSettings: {
        throttlingBurstLimit: props.throttleBurstLimit,
        throttlingRateLimit: props.throttleRateLimit,
      },
    });
    stage.addDependency(this.httpApi.node.defaultChild as cdk.CfnResource);

    this.httpApi.addRoutes({
      path: '/usage',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('UsageIntegration', this.usageFunction),
      authorizer: jwtAuthorizer,
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: `https://${this.httpApi.httpApiId}.execute-api.${cdk.Stack.of(this).region}.amazonaws.com/prod` });
    new cdk.CfnOutput(this, 'LambdaArn', { value: this.usageFunction.functionArn });
    new cdk.CfnOutput(this, 'ApiId', { value: this.httpApi.httpApiId });
    new cdk.CfnOutput(this, 'UsageRoute', { value: 'GET /usage' });
  }
}
