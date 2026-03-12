/**
 * Event Normalization Engine
 * Converts all formats to canonical CanonicalEvent schema
 */

import { IngestionFormat } from './format-detector'

export interface CanonicalEvent {
  run_id: string
  step_id: string
  event_kind: string
  provider: string
  model?: string
  tokens_input: number
  tokens_output: number
  cost_usd: number
  status: string
  duration_ms?: number
  error_type?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

// Model pricing (per 1K tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
}

const DEFAULT_PRICING = { input: 0.003, output: 0.015 }

function getModelPricing(model?: string): { input: number; output: number } {
  if (!model) return DEFAULT_PRICING
  const normalized = model.toLowerCase()
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalized.includes(key)) return pricing
  }
  return DEFAULT_PRICING
}

function calculateCost(model: string | undefined, inputTokens?: number, outputTokens?: number): number {
  if (!inputTokens && !outputTokens) return 0
  const pricing = getModelPricing(model)
  const inputCost = (inputTokens || 0) * (pricing.input / 1000)
  const outputCost = (outputTokens || 0) * (pricing.output / 1000)
  return inputCost + outputCost
}

/**
 * Normalize OpenAI export format
 */
function normalizeOpenAIExport(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  if (!Array.isArray(data.conversations)) return events

  data.conversations.forEach((conv: any, convIdx: number) => {
    const runId = conv.id || `openai-conv-${convIdx}`
    const mapping = conv.mapping || {}

    Object.entries(mapping).forEach(([msgId, msgData]: any) => {
      if (!msgData || !msgData.message) return
      const msg = msgData.message
      if (!msg.content) return

      const isAssistant = msg.author?.role === 'assistant'
      if (!isAssistant) return

      const stepId = msgId || `step-${convIdx}-${msgId}`
      let inputTokens = 0,
        outputTokens = 0

      if (msg.metadata?.tokens_used) {
        inputTokens = msg.metadata.tokens_used.prompt_tokens || 0
        outputTokens = msg.metadata.tokens_used.completion_tokens || 0
      }

      events.push({
        run_id: runId,
        step_id: stepId,
        event_kind: 'llm_call',
        provider: 'openai',
        model: msg.metadata?.model_slug || 'gpt-3.5-turbo',
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        cost_usd: calculateCost(msg.metadata?.model_slug, inputTokens, outputTokens),
        status: 'success',
        timestamp: msg.create_time ? new Date(msg.create_time * 1000).toISOString() : new Date().toISOString(),
        metadata: { author_role: msg.author?.role },
      })
    })
  })

  return events
}

/**
 * Normalize Anthropic export format
 */
function normalizeAnthropicExport(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  if (!Array.isArray(data.conversations)) return events

  data.conversations.forEach((conv: any, convIdx: number) => {
    const runId = conv.uuid || data.uuid || `anthropic-conv-${convIdx}`

    ;(conv.conversation || []).forEach((msg: any, msgIdx: number) => {
      if (msg.role !== 'assistant') return

      const stepId = `step-${convIdx}-${msgIdx}`
      let inputTokens = 0,
        outputTokens = 0

      if (msg.model && msg.text) {
        // Rough estimation for Anthropic
        inputTokens = Math.ceil((JSON.stringify(msg).length || 0) / 4)
        outputTokens = Math.ceil((msg.text.length || 0) / 4)
      }

      events.push({
        run_id: runId,
        step_id: stepId,
        event_kind: 'llm_call',
        provider: 'anthropic',
        model: msg.model || 'claude-3-sonnet',
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        cost_usd: calculateCost(msg.model, inputTokens, outputTokens),
        status: 'success',
        timestamp: msg.timestamp || new Date().toISOString(),
        metadata: { role: msg.role },
      })
    })
  })

  return events
}

/**
 * Normalize LangChain format
 */
function normalizeLangChain(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  if (!Array.isArray(data.runs)) return events

  data.runs.forEach((run: any, runIdx: number) => {
    const runId = run.id || run.run_id || `langchain-${runIdx}`

    ;(run.steps || []).forEach((step: any, stepIdx: number) => {
      const stepId = step.id || `step-${runIdx}-${stepIdx}`
      const startTime = step.start_time ? new Date(step.start_time).toISOString() : new Date().toISOString()
      const latency = step.end_time ? new Date(step.end_time).getTime() - new Date(step.start_time).getTime() : 0

      let eventKind: CanonicalEvent['event_kind'] = 'AGENT_START'
      if (step.type === 'llm') eventKind = 'MODEL_INVOKED'
      else if (step.type === 'tool') eventKind = 'TOOL_CALLED'

      const inputTokens = step.inputs?.prompt_tokens || 0
      const outputTokens = step.outputs?.completion_tokens || 0

      events.push({
        run_id: runId,
        step_id: stepId,
        event_kind: eventKind,
        provider: 'langchain',
        model: step.metadata?.model,
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        cost_usd: calculateCost(step.metadata?.model, inputTokens, outputTokens),
        duration_ms: latency,
        status: step.error ? 'failed' : 'success',
        timestamp: startTime,
        metadata: step.metadata || {},
      })
    })
  })

  return events
}

/**
 * Normalize CrewAI format
 */
function normalizeCrewAI(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  const runId = data.id || data.crew_name || 'crewai-run'

  ;(data.tasks_output || []).forEach((task: any, taskIdx: number) => {
    const stepId = `task-${taskIdx}`

    ;(task.agents || []).forEach((agent: any, agentIdx: number) => {
      ;(agent.steps || []).forEach((step: any, stepIdx: number) => {
        const fullStepId = `${stepId}-agent-${agentIdx}-step-${stepIdx}`

        events.push({
          run_id: runId,
          step_id: fullStepId,
          event_kind: step.is_retry ? 'llm_call' : 'agent_start',
          provider: 'crewai',
          model: step.model,
          tokens_input: step.input_tokens,
          tokens_output: step.output_tokens,
          cost_usd: calculateCost(step.model, step.input_tokens, step.output_tokens),
          duration_ms: step.duration_ms,
          status: step.status === 'error' || step.error ? 'failed' : 'success',
          timestamp: step.timestamp || new Date().toISOString(),
          metadata: { agent_name: agent.name, task: task.name },
        })
      })
    })
  })

  return events
}

/**
 * Normalize AutoGen format
 */
function normalizeAutoGen(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  const runId = data.id || 'autogen-run'

  ;(data.messages || []).forEach((msg: any, msgIdx: number) => {
    if (msg.role !== 'assistant') return

    const stepId = `message-${msgIdx}`

    events.push({
      run_id: runId,
      step_id: stepId,
      event_kind: 'llm_call',
      provider: 'generic',
      model: msg.model,
      tokens_input: msg.input_tokens,
      tokens_output: msg.output_tokens,
      cost_usd: calculateCost(msg.model, msg.input_tokens, msg.output_tokens),
      status: 'success',
      timestamp: msg.timestamp || new Date().toISOString(),
      metadata: { role: msg.role, sender: msg.name },
    })
  })

  return events
}

/**
 * Normalize n8n format
 */
function normalizeN8N(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  const runId = data.executionId || data.execution_id || 'n8n-exec'

  const nodeExecutionOrder = data.nodeExecutionOrder || []
  ;(data.nodes || []).forEach((node: any) => {
    if (node.type !== 'n8n-nodes-base.openai' && node.type !== 'n8n-nodes-base.anthropic') return

    const stepId = node.id || `node-${node.name}`

    events.push({
      run_id: runId,
      step_id: stepId,
      event_kind: 'llm_call',
      provider: 'n8n',
      model: node.parameters?.model,
      tokens_input: node.parameters?.input_tokens || 0,
      tokens_output: node.parameters?.output_tokens || 0,
      cost_usd: calculateCost(node.parameters?.model, node.parameters?.input_tokens || 0, node.parameters?.output_tokens || 0),
      status: 'success',
      timestamp: new Date().toISOString(),
      metadata: { node_name: node.name, node_type: node.type },
    })
  })

  return events
}

/**
 * Normalize generic JSON/array format
 */
function normalizeGeneric(data: any): CanonicalEvent[] {
  const events: CanonicalEvent[] = []
  const runId = `generic-${Date.now()}`

  const arr = Array.isArray(data) ? data : typeof data === 'object' ? Object.values(data) : []

  ;(arr as any[]).forEach((item: any, idx: number) => {
    if (typeof item !== 'object') return

    const stepId = item.id || item.step_id || `step-${idx}`

    events.push({
      run_id: runId,
      step_id: stepId,
      event_kind: item.event_kind || 'agent_start',
      provider: 'generic',
      model: item.model,
      tokens_input: item.input_tokens || item.total_tokens,
      tokens_output: item.output_tokens,
      cost_usd: calculateCost(item.model, item.input_tokens, item.output_tokens),
      duration_ms: item.duration_ms || item.latency_ms,
      status: item.status === 'error' || item.error ? 'failed' : 'success',
      timestamp: item.timestamp || item.created_at || new Date().toISOString(),
      metadata: item.metadata || {},
    })
  })

  return events
}

/**
 * Main normalization function
 */
export function normalizeToCanonical(data: unknown, format: IngestionFormat): CanonicalEvent[] {
  switch (format) {
    case 'openai-export':
      return normalizeOpenAIExport(data)
    case 'anthropic-export':
      return normalizeAnthropicExport(data)
    case 'langchain':
      return normalizeLangChain(data)
    case 'crewai':
      return normalizeCrewAI(data)
    case 'autogen':
      return normalizeAutoGen(data)
    case 'n8n':
      return normalizeN8N(data)
    case 'openai-assistants':
      return normalizeOpenAIExport(data)
    case 'whatsapp':
    case 'generic':
    default:
      return normalizeGeneric(data)
  }
}
