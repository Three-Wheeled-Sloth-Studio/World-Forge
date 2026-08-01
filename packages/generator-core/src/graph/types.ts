export type GenerationNodeId = string;

export type NodeValidationIssue = {
  severity: 'error' | 'warning';
  message: string;
};

export type NodeValidationResult = {
  valid: boolean;
  issues: NodeValidationIssue[];
};

export type GenerationNodeContext = {
  rootSeed: string;
};

export type GenerationNodeConditionResult<TOutput> =
  | { run: true }
  | { run: false; reason: string; output: TOutput };

export type GenerationNode<TInput, TOutput> = {
  id: GenerationNodeId;
  version: string;
  dependencies: readonly GenerationNodeId[];
  condition?(
    context: GenerationNodeContext,
    input: Readonly<TInput>,
    dependencies: ReadonlyMap<GenerationNodeId, unknown>
  ): GenerationNodeConditionResult<TOutput>;
  execute(context: GenerationNodeContext, input: Readonly<TInput>, dependencies: ReadonlyMap<GenerationNodeId, unknown>): TOutput;
  validate?(input: Readonly<TInput>, output: TOutput): NodeValidationResult;
};

export type GenerationNodeExecution<TOutput> = {
  nodeId: GenerationNodeId;
  version: string;
  status: 'completed' | 'skipped';
  output: TOutput;
  durationMs: number;
  validation?: NodeValidationResult;
  skipReason?: string;
};

export type GenerationGraphRun = {
  targetNodeId: GenerationNodeId;
  results: ReadonlyMap<GenerationNodeId, GenerationNodeExecution<unknown>>;
};

export type GenerationGraphNodeRunEvent = {
  nodeId: GenerationNodeId;
  version: string;
  dependencies: readonly GenerationNodeId[];
  phase: 'started' | 'completed' | 'skipped' | 'failed';
  startedAt: number;
  timestamp: number;
  durationMs?: number;
  validation?: NodeValidationResult;
  error?: string;
  skipReason?: string;
};
