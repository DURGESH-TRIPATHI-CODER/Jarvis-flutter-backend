import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate } from "../_lib/auth";
import { checkRateLimit } from "../_lib/rateLimit";
import { DEFAULT_MODEL, isModelAllowed, normalizeModelId } from "../_lib/models";
import { callNvidia, ChatMessageInput } from "../_lib/nvidia";

interface ParsedChatRequest {
  model: string;
  messages: ChatMessageInput[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

type ParseResult = { ok: true; value: ParsedChatRequest } | { ok: false; error: string };

const MAX_MESSAGES = 60;
const MAX_CONTENT_CHARS = 16_000;

function parseChatRequest(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const body = raw as Record<string, unknown>;

  const model =
    typeof body.model === "string" && body.model.trim()
      ? normalizeModelId(body.model)
      : DEFAULT_MODEL;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array" };
  }
  if (body.messages.length > MAX_MESSAGES) {
    return { ok: false, error: `too many messages (max ${MAX_MESSAGES})` };
  }

  const messages: ChatMessageInput[] = [];
  for (const m of body.messages) {
    if (typeof m !== "object" || m === null) {
      return { ok: false, error: "each message must be an object" };
    }
    const msg = m as Record<string, unknown>;
    if (msg.role !== "system" && msg.role !== "user" && msg.role !== "assistant") {
      return { ok: false, error: "invalid message role" };
    }
    if (typeof msg.content !== "string" || msg.content.length === 0) {
      return { ok: false, error: "message content must be a non-empty string" };
    }
    if (msg.content.length > MAX_CONTENT_CHARS) {
      return { ok: false, error: "message content too long" };
    }
    messages.push({ role: msg.role, content: msg.content });
  }

  let stream = false;
  if (body.stream !== undefined) {
    if (typeof body.stream !== "boolean") {
      return { ok: false, error: "stream must be a boolean" };
    }
    stream = body.stream;
  }

  let temperature: number | undefined;
  if (body.temperature !== undefined) {
    if (typeof body.temperature !== "number" || body.temperature < 0 || body.temperature > 2) {
      return { ok: false, error: "temperature must be between 0 and 2" };
    }
    temperature = body.temperature;
  }

  let maxTokens: number | undefined;
  if (body.max_tokens !== undefined) {
    if (
      typeof body.max_tokens !== "number" ||
      !Number.isInteger(body.max_tokens) ||
      body.max_tokens < 1 ||
      body.max_tokens > 4096
    ) {
      return { ok: false, error: "max_tokens must be an integer between 1 and 4096" };
    }
    maxTokens = body.max_tokens;
  }

  return { ok: true, value: { model, messages, stream, temperature, max_tokens: maxTokens } };
}

/**
 * POST /api/v1/chat
 * Authenticated proxy to NVIDIA NIM chat completions (PRD §8).
 * Supports streaming (SSE pass-through) and non-streaming JSON.
 *
 * Vercel hobby functions default to 10s — NIM cold starts regularly exceed
 * that, so extend the execution window to the hobby maximum.
 */
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const auth = authenticate(req);
  if (!auth.ok) {
    res.status(401).json({ error: auth.reason ?? "unauthorized" });
    return;
  }

  const rate = checkRateLimit(auth.clientId!);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    res.status(429).json({ error: "rate_limited", retryAfterSeconds: rate.retryAfterSeconds });
    return;
  }

  const parsed = parseChatRequest(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: "invalid_request", detail: parsed.error });
    return;
  }
  const payload = parsed.value;

  if (!isModelAllowed(payload.model)) {
    res.status(400).json({
      error: "model_not_allowed",
      detail: `Model '${payload.model}' is not in the allowlist. GET /api/v1/models lists the allowed ids.`,
    });
    return;
  }

  try {
    const upstream = await callNvidia(payload);

    if (!upstream.ok) {
      // Do not leak upstream error bodies; map to actionable statuses.
      const status = upstream.status === 429 ? 503 : 502;
      res.status(status).json({ error: "upstream_error", upstreamStatus: upstream.status });
      return;
    }

    if (payload.stream && upstream.body) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      res.status(200);
      const reader = upstream.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
      return;
    }

    const json = await upstream.json();
    res.status(200).json(json);
  } catch (err) {
    res.status(502).json({
      error: "upstream_error",
      detail: err instanceof Error ? err.message : "unknown upstream failure",
    });
  }
}
