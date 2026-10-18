export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: string;
  details: Record<string, any>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated: boolean;
  active: boolean;
}

export interface MemoryTopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  session_id: string;
  turn_id: number;
  vector_db_connected: boolean;
  llm_connected: boolean;
}

export interface ProceduralRule {
  index: number;
  instruction: string;
  rationale?: string | null;
}

export interface RuleDiffItem {
  index: number;
  action: 'added' | 'modified' | 'removed' | 'unchanged';
  old_instruction?: string | null;
  new_instruction?: string | null;
  rationale?: string | null;
}

export interface SemanticChunk {
  id?: string;
  chunk_index: number;
  text: string;
  source: string;
  score?: number | null;
}

export interface EpisodicRecord {
  id?: string;
  conversation: string;
  context_tags: string[];
  conversation_summary: string;
  what_worked: string;
  what_to_avoid: string;
  timestamp?: string;
}

export interface WorkingMemoryDiff {
  messages_before: number;
  messages_after: number;
  delta_messages: number;
  summary_triggered: boolean;
  new_summary?: string | null;
  estimated_tokens_delta: number;
  added_messages: Array<{ role: string; content: string }>;
}

export interface EpisodicMemoryDiff {
  matched_prior_episode?: EpisodicRecord | null;
  new_reflection_created: boolean;
  new_reflection?: EpisodicRecord | null;
  persisted_to_vdb: boolean;
}

export interface ProceduralMemoryDiff {
  changed: boolean;
  rule_diffs: RuleDiffItem[];
  rules_before_count: number;
  rules_after_count: number;
}

export interface SemanticMemoryDiff {
  search_query?: string | null;
  retrieved_chunks_count: number;
  retrieved_chunks: SemanticChunk[];
}

export interface TurnMemoryDiff {
  session_id: string;
  turn_id: number;
  timestamp: string;
  working_diff: WorkingMemoryDiff;
  episodic_diff: EpisodicMemoryDiff;
  procedural_diff: ProceduralMemoryDiff;
  semantic_diff: SemanticMemoryDiff;
}

export interface FullMemorySnapshot {
  snapshot_id: string;
  session_id: string;
  turn_id: number;
  working: {
    message_count: number;
    is_summarized: boolean;
    active_summary?: string | null;
    recent_messages_preview: Array<{ role: string; preview: string }>;
    estimated_tokens: number;
  };
  episodic?: EpisodicRecord | null;
  semantic: SemanticChunk[];
  procedural: {
    rules: ProceduralRule[];
    raw_text: string;
    last_updated: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  turnId?: number;
  securityBlocked?: boolean;
  blockedReason?: string | null;
  diff?: TurnMemoryDiff;
}

export interface WorkingMemoryContext {
  message_count: number;
  is_summarized: boolean;
  active_summary?: string | null;
  estimated_tokens: number;
  recent_messages: Array<{ role: string; content: string }>;
}

export interface EpisodicMemoryContext {
  storage: string;
  matched_prior_episode?: EpisodicRecord | null;
  recent_reflections: EpisodicRecord[];
  what_worked: string[];
  what_to_avoid: string[];
}

export interface SemanticMemoryContext {
  source: string;
  retrieved_chunks: SemanticChunk[];
  total_chunks_available: number;
}

export interface ProceduralMemoryContext {
  total_rules: number;
  rules: ProceduralRule[];
  raw_text: string;
  last_updated: string;
}

export interface SystemStatusContext {
  vector_db_connected: boolean;
  model_name: string;
  guardrail_armed: boolean;
  session_id: string;
  turn_id: number;
  timestamp: string;
}

export interface BackendMemoryContext {
  session_id: string;
  turn_id: number;
  system_status: SystemStatusContext;
  working: WorkingMemoryContext;
  episodic: EpisodicMemoryContext;
  semantic: SemanticMemoryContext;
  procedural: ProceduralMemoryContext;
  formatted_prompt_context?: string | null;
}

