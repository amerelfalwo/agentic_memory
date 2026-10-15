import {
  MemoryTopologyResponse,
  TurnMemoryDiff,
  ProceduralRule,
  FullMemorySnapshot
} from '../types';

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return 'http://localhost:8000/api/v1';
    }
  }
  return 'https://mnemos-backend-ehi5.onrender.com/api/v1';
}

const API_BASE = getApiBase();

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchTopology(sessionId: string = 'default-session'): Promise<MemoryTopologyResponse> {
  const res = await fetch(`${API_BASE}/memories/topology?session_id=${encodeURIComponent(sessionId)}`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch memory topology');
  return res.json();
}

export async function fetchSessionDiffs(sessionId: string = 'default-session'): Promise<TurnMemoryDiff[]> {
  const res = await fetch(`${API_BASE}/memories/diffs/${encodeURIComponent(sessionId)}`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch memory diffs');
  const data = await res.json();
  return data.diffs || [];
}

export async function fetchProceduralRules(): Promise<{ rules: ProceduralRule[]; raw_text: string }> {
  const res = await fetch(`${API_BASE}/memories/procedural`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch procedural rules');
  return res.json();
}

export async function updateProceduralRules(rulesText: string): Promise<{ rules: ProceduralRule[]; raw_text: string }> {
  const res = await fetch(`${API_BASE}/memories/procedural`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules_text: rulesText })
  });
  if (!res.ok) throw new Error('Failed to update procedural rules');
  return res.json();
}

export async function resetSession(sessionId: string = 'default-session') {
  const res = await fetch(`${API_BASE}/chat/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId })
  });
  if (!res.ok) throw new Error('Failed to reset session');
  return res.json();
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
  onToken: (token: string) => void,
  onStatus?: (status: string) => void,
  onDiff?: (diff: TurnMemoryDiff) => void
): Promise<{
  response: string;
  turn_id: number;
  security_blocked: boolean;
  blocked_reason?: string | null;
  diff?: TurnMemoryDiff;
}> {
  // Use POST /chat/stream for SSE streaming
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ session_id: sessionId, message })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream available');

    const decoder = new TextDecoder();
    let accumulatedText = '';
    let currentDiff: TurnMemoryDiff | undefined = undefined;
    let finalPayload: any = {};

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        const blockLines = block.split('\n');
        let eventType = 'message';
        let dataStr = '';

        for (const line of blockLines) {
          if (line.startsWith('event:')) {
            eventType = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.replace('data:', '').trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'status') {
            if (onStatus) onStatus(parsed.message || parsed.status);
          } else if (eventType === 'memory_access') {
            if (onStatus) onStatus('Synchronizing multi-tier memories...');
          } else if (eventType === 'token') {
            accumulatedText += parsed.token;
            onToken(parsed.token);
          } else if (eventType === 'turn_diff') {
            currentDiff = parsed as TurnMemoryDiff;
            if (onDiff) onDiff(currentDiff);
          } else if (eventType === 'done') {
            finalPayload = parsed;
          }
        } catch (e) {
          // Non-JSON SSE line or formatting
        }
      }
    }

    return {
      response: accumulatedText,
      turn_id: finalPayload.turn_id || 1,
      security_blocked: finalPayload.security_blocked || false,
      blocked_reason: finalPayload.blocked_reason,
      diff: currentDiff
    };
  } catch (err) {
    // Graceful fallback to regular POST /chat endpoint
    const fallbackRes = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message })
    });
    if (!fallbackRes.ok) throw err;
    const data = await fallbackRes.json();
    onToken(data.response);
    if (onDiff && data.diff) onDiff(data.diff);
    return {
      response: data.response,
      turn_id: data.turn_id,
      security_blocked: data.security_blocked,
      blocked_reason: data.blocked_reason,
      diff: data.diff
    };
  }
}
