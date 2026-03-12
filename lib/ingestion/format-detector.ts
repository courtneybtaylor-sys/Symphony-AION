/**
 * Format Detection Engine
 * Automatically identifies input format from telemetry data structure
 */

export type IngestionFormat =
  | 'openai-export'        // has conversations[] + mapping
  | 'openai-assistants'    // object: "run" or "thread"
  | 'anthropic-export'     // has conversations[] + uuid
  | 'langchain'            // has runs[] with run_type
  | 'crewai'               // has crew_name or agents[]
  | 'autogen'              // has messages[] with role
  | 'n8n'                  // has executionId + nodes
  | 'whatsapp'             // regex: [DD/MM/YY, HH:MM] Sender: message
  | 'generic'              // fallback

/**
 * Detect format from data structure
 * Returns most specific format match or 'generic' as fallback
 */
export function detectFormat(data: unknown): IngestionFormat {
  if (!data || typeof data !== 'object') {
    return 'generic'
  }

  const obj = data as Record<string, any>

  // OpenAI Assistant/Run format
  if ((obj.run || obj.thread || obj.run_id || obj.thread_id) &&
      (typeof obj.run === 'object' || typeof obj.thread === 'object' || typeof obj.run_id === 'string')) {
    return 'openai-assistants'
  }

  // OpenAI Export format (has conversations array with specific structure)
  if (Array.isArray(obj.conversations) && obj.conversations.length > 0) {
    const firstConv = obj.conversations[0]
    if (firstConv && typeof firstConv === 'object' && 'mapping' in firstConv) {
      return 'openai-export'
    }
  }

  // Anthropic Export format (has conversations array + uuid)
  if (Array.isArray(obj.conversations) && (obj.uuid || obj.id)) {
    return 'anthropic-export'
  }

  // LangChain format (has runs array with run_type field)
  if (Array.isArray(obj.runs) && obj.runs.length > 0) {
    const firstRun = obj.runs[0]
    if (firstRun && typeof firstRun === 'object' && 'run_type' in firstRun) {
      return 'langchain'
    }
  }

  // CrewAI format (has crew_name or agents array)
  if (obj.crew_name || (Array.isArray(obj.agents) && obj.agents.length > 0)) {
    return 'crewai'
  }

  // AutoGen format (has messages array with role field)
  if (Array.isArray(obj.messages) && obj.messages.length > 0) {
    const firstMsg = obj.messages[0]
    if (firstMsg && typeof firstMsg === 'object' && 'role' in firstMsg) {
      return 'autogen'
    }
  }

  // n8n format (has executionId + nodes)
  if ((obj.executionId || obj.execution_id) && (Array.isArray(obj.nodes) || obj.nodeExecutionOrder)) {
    return 'n8n'
  }

  // WhatsApp format (text content with timestamp pattern)
  if (typeof obj === 'string' || (typeof obj === 'object' && typeof obj.text === 'string')) {
    const content = typeof obj === 'string' ? obj : obj.text
    if (/\[\d{1,2}\/\d{1,2}\/\d{2},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?\]\s*[\w\s]+:\s*./.test(content)) {
      return 'whatsapp'
    }
  }

  // Fallback to generic
  return 'generic'
}
