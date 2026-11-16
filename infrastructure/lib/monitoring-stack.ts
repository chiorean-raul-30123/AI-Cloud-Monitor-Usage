import { Construct } from 'constructs';
import { ProjectStack, StackProps } from './stack-base';
import { ComputeStack } from './compute-stack';
export interface MonitoringStackProps extends StackProps { computeStack: ComputeStack }
export class MonitoringStack extends ProjectStack { constructor(scope: Construct, id: string, props: MonitoringStackProps) { super(scope, id, props); this.addDependency(props.computeStack); } }
