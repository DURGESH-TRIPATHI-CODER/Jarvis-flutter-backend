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

// Bilingual, speakable assistant persona with the controlled tool registry
// (PRD §6). The client parses strict-JSON tool replies and executes them
// through its allowlisted executor — the AI never runs anything directly.
const JARVIS_SYSTEM_PROMPT = `You are JARVIS, a personal assistant running on the user's Android phone.
Communicate naturally in English or Hindi, matching the user's language.
Keep replies short and speakable — they are read aloud via text-to-speech.
If you do not know something or lack the capability, say so plainly.

PHONE ACTIONS — you can request them with the controlled tool registry.
When the user wants a phone action, respond with ONLY one JSON object and
nothing else (no markdown, no commentary):
{"tool":"<name>","arguments":{...}}

Registered tools and their exact argument names:
- open_app: {"app_name": "WhatsApp"}
- search_web: {"query": "weather today"}
- search_youtube: {"query": "lofi music"}
- play_media: {"query": "shape of you"}
- make_call: {"phone_number": "+911234567890"} or {"contact_name": "Mom"} (user confirmation required)
- set_alarm: {"hour": 7, "minute": 30}   (24h hour 0-23; minute 0-59)
- set_timer: {"minutes": 10}
- create_reminder: {"title": "Buy milk", "minutes_from_now": 30}
- toggle_flashlight: {"enabled": true}
- set_volume: {"level": 50}   (0-100)
- open_settings: {"screen": "general"}   (general | wifi | bluetooth | sound)

For anything that is not a phone action, reply in plain conversational text.`;

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
