const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface NvidiaChatPayload {
  model: string;
  messages: ChatMessageInput[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

// Bilingual, speakable assistant persona. Tool-calling instructions expand
// in Session 5 once the Android tool registry is live.
const JARVIS_SYSTEM_PROMPT =
  "You are JARVIS, a personal assistant running on the user's Android phone. " +
  "Communicate naturally in English or Hindi, matching the user's language. " +
  "Keep replies short and speakable — they are read aloud via text-to-speech. " +
  "If you do not know something or lack the capability, say so plainly.";

export function withSystemPrompt(messages: ChatMessageInput[]): ChatMessageInput[] {
  const hasSystem = messages.some((m) => m.role === "system");
  return hasSystem ? messages : [{ role: "system", content: JARVIS_SYSTEM_PROMPT }, ...messages];
}

/**
 * Calls the NVIDIA NIM OpenAI-compatible chat completions endpoint.
 * The NVIDIA_API_KEY stays on the server — never shipped in the APK (PRD §10).
 */
export async function callNvidia(payload: NvidiaChatPayload): Promise<Response> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("nvidia_api_key_missing");
  }

  return fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: payload.stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify({
      model: payload.model,
      messages: withSystemPrompt(payload.messages),
      stream: payload.stream,
      ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
      ...(payload.max_tokens !== undefined ? { max_tokens: payload.max_tokens } : {}),
    }),
  });
}
