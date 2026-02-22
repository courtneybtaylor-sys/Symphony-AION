/**
 * Symphony AION Type Definitions
 * Core types for the AI orchestration platform
 */

/**
 * Event kinds supported by Symphony AION
 * These represent the 13 different event types that can occur during workflow execution
 */
export enum EventKind {
  RUN_STARTED = 'RUN_STARTED',
  RUN_COMPLETED = 'RUN_COMPLETED',
  RUN_FAILED = 'RUN_FAILED',
  STEP_STARTED = 'STEP_STARTED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_FAILED = 'STEP_FAILED',
  MODEL_INVOKED = 'MODEL_INVOKED',
  MODEL_RESPONSE = 'MODEL_RESPONSE',
  TOOL_CALLED = 'TOOL_CALLED',
  TOOL_RESULT = 'TOOL_RESULT',
  COST_RECORDED = 'COST_RECORDED',
  VALIDATION_PASSED = 'VALIDATION_PASSED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

/**
 * Status enumeration for runs and steps
 */
export enum Status {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Core event structure for all telemetry events
 */
export interface Event {
  id: string;
  kind: EventKind;
  timestamp: number; // Unix milliseconds
  runId: string;
  stepId?: string;
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    environment?: string;
  };
}

/**
 * Step within a run (represents a node in the workflow DAG)
 */
export interface Step {
  id: string;
  name: string;
  status: Status;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  error?: {
    code: string;
    message: string;
    stackTrace?: string;
  };
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

/**
 * Model invocation details
 */
export interface ModelInvocation {
  id: string;
  provider: string; // 'openai', 'anthropic', etc.
  model: string; // 'gpt-4', 'claude-3-opus', etc.
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  latencyMs: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Tool execution details
 */
export interface ToolExecution {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  latencyMs: number;
}

/**
 * Complete run entity representing a workflow execution
 */
export interface Run {
  id: string;
  name: string;
  status: Status;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  steps: Step[];
  events: Event[];
  metadata?: {
    userId?: string;
    tags?: string[];
    externalId?: string;
  };
}

/**
 * Aggregated metrics for a run
 */
export interface RunMetrics {
  totalDurationMs: number;
  stepCount: number;
  successfulSteps: number;
  failedSteps: number;
  modelInvocations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  averageStepDurationMs: number;
}

/**
 * Aggregated model usage
 */
export interface ModelUsageSummary {
  provider: string;
  model: string;
  invocationCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  averageLatencyMs: number;
}

/**
 * View model for dashboard display
 * This is the transformed data used by UI components
 */
export interface RunViewModel {
  // Basic info
  id: string;
  name: string;
  status: Status;
  duration: {
    formatted: string; // e.g., "2m 34s"
    ms: number;
  };

  // Timeline
  startTime: {
    iso: string;
    relative: string; // e.g., "2 hours ago"
  };
  endTime?: {
    iso: string;
    relative: string;
  };

  // Step metrics
  steps: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    list: StepViewModel[];
  };

  // Cost analysis
  costs: {
    total: number;
    byModel: Array<{
      model: string;
      provider: string;
      cost: number;
      percentage: number;
    }>;
  };

  // Token usage
  tokens: {
    input: number;
    output: number;
    total: number;
    byModel: Array<{
      model: string;
      inputTokens: number;
      outputTokens: number;
    }>;
  };

  // Event summary
  events: {
    total: number;
    byKind: Record<EventKind, number>;
  };

  // Performance
  performance: {
    averageStepDurationMs: number;
    slowestStep?: StepViewModel;
    fastestStep?: StepViewModel;
  };

  // Error details if failed
  error?: {
    code: string;
    message: string;
    failedStepId?: string;
  };

  // Raw data for advanced views
  raw: {
    run: Run;
    events: Event[];
  };
}

/**
 * Step view model for display
 */
export interface StepViewModel {
  id: string;
  name: string;
  status: Status;
  duration: {
    formatted: string;
    ms: number;
  };
  startTime: {
    iso: string;
    relative: string;
  };
  endTime?: {
    iso: string;
    relative: string;
  };
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  modelInvocations?: ModelInvocation[];
  toolExecutions?: ToolExecution[];
  costUSD?: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Billing architecture data
 */
export interface BillingData {
  currentPlan: {
    name: string;
    pricePerMonth: number;
    features: string[];
  };
  usage: {
    period: {
      startDate: string;
      endDate: string;
    };
    apiCalls: number;
    apiCallLimit: number;
    totalCostThisMonth: number;
    estimatedCostEndOfMonth: number;
    modelUsage: Array<{
      model: string;
      provider: string;
      costThisMonth: number;
      costProjected: number;
      tokenCount: number;
    }>;
  };
  history: Array<{
    date: string;
    amount: number;
    description: string;
    status: 'pending' | 'paid' | 'failed';
  }>;
}

/**
 * Dashboard metrics at a glance
 */
export interface DashboardMetrics {
  totalRuns: number;
  activeRuns: number;
  successRate: number; // 0-100
  totalCostThisMonth: number;
  averageRunDuration: string;
  totalTokensProcessed: number;
  recentRuns: Run[];
  topModels: Array<{
    model: string;
    provider: string;
    usageCount: number;
    costThisMonth: number;
  }>;
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>;
}

/**
 * Model configuration
 */
export interface Model {
  id: string;
  name: string;
  provider: string;
  version: string;
  enabled: boolean;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}
