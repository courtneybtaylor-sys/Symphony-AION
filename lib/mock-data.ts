/**
 * Symphony AION Mock Data
 * Realistic sample data for development and testing
 */

import {
  Event,
  EventKind,
  Run,
  Status,
  Step,
  ModelInvocation,
  ToolExecution,
  BillingData,
  DashboardMetrics,
  Model,
} from './types';

/**
 * Generate a mock run with realistic events and steps
 */
export function generateMockRun(overrides?: Partial<Run>): Run {
  const now = Date.now();
  const runDuration = 2 * 60 * 1000 + 34 * 1000; // 2m 34s
  const startTime = now - runDuration;

  const steps: Step[] = [
    {
      id: 'step-1',
      name: 'Extract Intent',
      status: Status.COMPLETED,
      startedAt: startTime + 100,
      completedAt: startTime + 5000,
      durationMs: 4900,
      input: { text: 'What is the weather in San Francisco?' },
      output: { intent: 'weather_query', location: 'San Francisco' },
    },
    {
      id: 'step-2',
      name: 'Search External Data',
      status: Status.COMPLETED,
      startedAt: startTime + 5100,
      completedAt: startTime + 12000,
      durationMs: 6900,
      input: { location: 'San Francisco' },
      output: { weather: 'Sunny', temperature: 72, humidity: 60 },
    },
    {
      id: 'step-3',
      name: 'Generate Response',
      status: Status.COMPLETED,
      startedAt: startTime + 12100,
      completedAt: startTime + 25000,
      durationMs: 12900,
      input: { intent: 'weather_query', data: { weather: 'Sunny', temperature: 72 } },
      output: { response: 'The weather in San Francisco is sunny with a temperature of 72°F.' },
    },
  ];

  const events: Event[] = [
    // RUN_STARTED event
    {
      id: 'event-1',
      kind: EventKind.RUN_STARTED,
      timestamp: startTime,
      runId: 'run-001',
      data: {
        workflowId: 'workflow-weather-query',
        input: { query: 'What is the weather in San Francisco?' },
      },
      metadata: { userId: 'user-123', sessionId: 'session-456' },
    },

    // STEP_STARTED and STEP_COMPLETED for step 1
    {
      id: 'event-2',
      kind: EventKind.STEP_STARTED,
      timestamp: startTime + 100,
      runId: 'run-001',
      stepId: 'step-1',
      data: { stepName: 'Extract Intent' },
    },
    {
      id: 'event-3',
      kind: EventKind.MODEL_INVOKED,
      timestamp: startTime + 200,
      runId: 'run-001',
      stepId: 'step-1',
      data: {
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 45,
        temperature: 0.7,
      },
    },
    {
      id: 'event-4',
      kind: EventKind.MODEL_RESPONSE,
      timestamp: startTime + 3500,
      runId: 'run-001',
      stepId: 'step-1',
      data: {
        model: 'gpt-4',
        outputTokens: 28,
        costUSD: 0.0018,
        latencyMs: 3300,
      },
    },
    {
      id: 'event-5',
      kind: EventKind.STEP_COMPLETED,
      timestamp: startTime + 5000,
      runId: 'run-001',
      stepId: 'step-1',
      data: { durationMs: 4900, success: true },
    },

    // STEP_STARTED and STEP_COMPLETED for step 2
    {
      id: 'event-6',
      kind: EventKind.STEP_STARTED,
      timestamp: startTime + 5100,
      runId: 'run-001',
      stepId: 'step-2',
      data: { stepName: 'Search External Data' },
    },
    {
      id: 'event-7',
      kind: EventKind.TOOL_CALLED,
      timestamp: startTime + 5200,
      runId: 'run-001',
      stepId: 'step-2',
      data: {
        toolName: 'weather_api',
        input: { location: 'San Francisco' },
      },
    },
    {
      id: 'event-8',
      kind: EventKind.TOOL_RESULT,
      timestamp: startTime + 10500,
      runId: 'run-001',
      stepId: 'step-2',
      data: {
        toolName: 'weather_api',
        result: { weather: 'Sunny', temperature: 72, humidity: 60 },
        latencyMs: 5300,
      },
    },
    {
      id: 'event-9',
      kind: EventKind.STEP_COMPLETED,
      timestamp: startTime + 12000,
      runId: 'run-001',
      stepId: 'step-2',
      data: { durationMs: 6900, success: true },
    },

    // STEP_STARTED and STEP_COMPLETED for step 3
    {
      id: 'event-10',
      kind: EventKind.STEP_STARTED,
      timestamp: startTime + 12100,
      runId: 'run-001',
      stepId: 'step-3',
      data: { stepName: 'Generate Response' },
    },
    {
      id: 'event-11',
      kind: EventKind.MODEL_INVOKED,
      timestamp: startTime + 12200,
      runId: 'run-001',
      stepId: 'step-3',
      data: {
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 156,
        temperature: 0.7,
      },
    },
    {
      id: 'event-12',
      kind: EventKind.MODEL_RESPONSE,
      timestamp: startTime + 24000,
      runId: 'run-001',
      stepId: 'step-3',
      data: {
        model: 'gpt-4',
        outputTokens: 52,
        costUSD: 0.0042,
        latencyMs: 11800,
      },
    },
    {
      id: 'event-13',
      kind: EventKind.COST_RECORDED,
      timestamp: startTime + 24100,
      runId: 'run-001',
      data: {
        stepId: 'step-3',
        costUSD: 0.0042,
        model: 'gpt-4',
        inputTokens: 156,
        outputTokens: 52,
      },
    },
    {
      id: 'event-14',
      kind: EventKind.VALIDATION_PASSED,
      timestamp: startTime + 24500,
      runId: 'run-001',
      data: {
        validationType: 'output_schema',
        details: 'Response matches expected schema',
      },
    },
    {
      id: 'event-15',
      kind: EventKind.STEP_COMPLETED,
      timestamp: startTime + 25000,
      runId: 'run-001',
      stepId: 'step-3',
      data: { durationMs: 12900, success: true },
    },

    // RUN_COMPLETED event
    {
      id: 'event-16',
      kind: EventKind.RUN_COMPLETED,
      timestamp: now,
      runId: 'run-001',
      data: {
        totalDurationMs: runDuration,
        stepCount: 3,
        successfulSteps: 3,
        totalCostUSD: 0.0060,
        totalInputTokens: 201,
        totalOutputTokens: 80,
      },
    },
  ];

  return {
    id: 'run-001',
    name: 'Weather Query Processing',
    status: Status.COMPLETED,
    startedAt: startTime,
    completedAt: now,
    durationMs: runDuration,
    input: { query: 'What is the weather in San Francisco?' },
    output: { response: 'The weather in San Francisco is sunny with a temperature of 72°F.' },
    steps,
    events,
    metadata: {
      userId: 'user-123',
      tags: ['weather', 'query', 'production'],
      externalId: 'ext-weather-001',
    },
    ...overrides,
  };
}

/**
 * Generate mock run with failed step
 */
export function generateFailedMockRun(): Run {
  const now = Date.now();
  const startTime = now - 45000; // 45 seconds ago

  return {
    id: 'run-002',
    name: 'Data Processing Pipeline',
    status: Status.FAILED,
    startedAt: startTime,
    completedAt: now,
    durationMs: 45000,
    input: { dataSet: 'large_dataset_v2' },
    error: {
      code: 'STEP_FAILED',
      message: 'Validation step failed due to schema mismatch',
    },
    steps: [
      {
        id: 'step-fail-1',
        name: 'Load Data',
        status: Status.COMPLETED,
        startedAt: startTime + 100,
        completedAt: startTime + 8000,
        durationMs: 7900,
        output: { recordCount: 50000 },
      },
      {
        id: 'step-fail-2',
        name: 'Validate Schema',
        status: Status.FAILED,
        startedAt: startTime + 8100,
        completedAt: startTime + 45000,
        durationMs: 36900,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Field "timestamp" expected ISO string but got Unix timestamp',
          stackTrace: 'at validateSchema (processor.ts:234)',
        },
      },
    ],
    events: [
      {
        id: 'event-fail-1',
        kind: EventKind.RUN_STARTED,
        timestamp: startTime,
        runId: 'run-002',
        data: { workflowId: 'data-pipeline' },
      },
      {
        id: 'event-fail-2',
        kind: EventKind.STEP_STARTED,
        timestamp: startTime + 100,
        runId: 'run-002',
        stepId: 'step-fail-1',
        data: { stepName: 'Load Data' },
      },
      {
        id: 'event-fail-3',
        kind: EventKind.STEP_COMPLETED,
        timestamp: startTime + 8000,
        runId: 'run-002',
        stepId: 'step-fail-1',
        data: { success: true },
      },
      {
        id: 'event-fail-4',
        kind: EventKind.STEP_STARTED,
        timestamp: startTime + 8100,
        runId: 'run-002',
        stepId: 'step-fail-2',
        data: { stepName: 'Validate Schema' },
      },
      {
        id: 'event-fail-5',
        kind: EventKind.VALIDATION_FAILED,
        timestamp: startTime + 45000,
        runId: 'run-002',
        stepId: 'step-fail-2',
        data: {
          validationType: 'schema',
          error: 'Field "timestamp" mismatch',
        },
      },
      {
        id: 'event-fail-6',
        kind: EventKind.STEP_FAILED,
        timestamp: startTime + 45000,
        runId: 'run-002',
        stepId: 'step-fail-2',
        data: { durationMs: 36900, error: 'VALIDATION_ERROR' },
      },
      {
        id: 'event-fail-7',
        kind: EventKind.RUN_FAILED,
        timestamp: now,
        runId: 'run-002',
        data: {
          failedStepId: 'step-fail-2',
          error: 'VALIDATION_ERROR',
          message: 'Validation step failed',
        },
      },
    ],
  };
}

/**
 * Collection of mock runs for testing and dashboard
 */
export const MOCK_RUNS: Run[] = [
  generateMockRun({
    id: 'run-001',
    name: 'Weather Query Processing',
  }),
  generateFailedMockRun(),
  generateMockRun({
    id: 'run-003',
    name: 'Email Classification',
    status: Status.COMPLETED,
    startedAt: Date.now() - 5 * 60 * 1000,
    completedAt: Date.now() - 60 * 1000,
    durationMs: 4 * 60 * 1000,
  }),
  generateMockRun({
    id: 'run-004',
    name: 'Document Extraction',
    status: Status.RUNNING,
    startedAt: Date.now() - 30 * 1000,
  }),
];

/**
 * Mock model configurations
 */
export const MOCK_MODELS: Model[] = [
  {
    id: 'model-gpt4',
    name: 'GPT-4',
    provider: 'openai',
    version: '0125',
    enabled: true,
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
    },
    costPer1kInputTokens: 0.03,
    costPer1kOutputTokens: 0.06,
  },
  {
    id: 'model-claude3',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    version: '3',
    enabled: true,
    parameters: {
      temperature: 0.8,
      maxTokens: 4096,
    },
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
  },
  {
    id: 'model-gpt35',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    version: '0125',
    enabled: true,
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
  },
];

/**
 * Mock billing data
 */
export function generateMockBillingData(): BillingData {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();
  const projectionRatio = daysInMonth / dayOfMonth;

  return {
    currentPlan: {
      name: 'Pro',
      pricePerMonth: 99,
      features: [
        'Unlimited API calls',
        'Advanced monitoring',
        'Priority support',
        'Custom integrations',
      ],
    },
    usage: {
      period: {
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
      },
      apiCalls: 145230,
      apiCallLimit: 1000000,
      totalCostThisMonth: 342.50,
      estimatedCostEndOfMonth: 342.50 * projectionRatio,
      modelUsage: [
        {
          model: 'GPT-4',
          provider: 'OpenAI',
          costThisMonth: 185.25,
          costProjected: 185.25 * projectionRatio,
          tokenCount: 1845000,
        },
        {
          model: 'Claude 3 Opus',
          provider: 'Anthropic',
          costThisMonth: 125.80,
          costProjected: 125.80 * projectionRatio,
          tokenCount: 890000,
        },
        {
          model: 'GPT-3.5 Turbo',
          provider: 'OpenAI',
          costThisMonth: 31.45,
          costProjected: 31.45 * projectionRatio,
          tokenCount: 420000,
        },
      ],
    },
    history: [
      {
        date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 289.30,
        description: 'Monthly subscription + API overages',
        status: 'paid',
      },
      {
        date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 312.10,
        description: 'Monthly subscription + API overages',
        status: 'paid',
      },
      {
        date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 276.85,
        description: 'Monthly subscription + API overages',
        status: 'paid',
      },
    ],
  };
}

/**
 * Mock dashboard metrics
 */
export function generateMockDashboardMetrics(): DashboardMetrics {
  return {
    totalRuns: 1523,
    activeRuns: 7,
    successRate: 94.2,
    totalCostThisMonth: 342.50,
    averageRunDuration: '2m 15s',
    totalTokensProcessed: 3155000,
    recentRuns: MOCK_RUNS.slice(0, 4),
    topModels: [
      {
        model: 'GPT-4',
        provider: 'OpenAI',
        usageCount: 523,
        costThisMonth: 185.25,
      },
      {
        model: 'Claude 3 Opus',
        provider: 'Anthropic',
        usageCount: 412,
        costThisMonth: 125.80,
      },
      {
        model: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        usageCount: 588,
        costThisMonth: 31.45,
      },
    ],
    alerts: [
      {
        id: 'alert-1',
        severity: 'info',
        message: 'Daily API quota will be reached in ~8 hours',
        timestamp: Date.now() - 15 * 60 * 1000,
      },
      {
        id: 'alert-2',
        severity: 'warning',
        message: 'Estimated monthly spend will exceed budget by 12%',
        timestamp: Date.now() - 60 * 60 * 1000,
      },
    ],
  };
}
