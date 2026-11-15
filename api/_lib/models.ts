export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "meta/llama-3.1-8b-instruct";

// Sensible NIM catalogue defaults; override with ALLOWED_MODELS env var.
const FALLBACK_ALLOWLIST = [
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-405b-instruct",
  "google/gemma-2-9b-it",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "qwen/qwen2.5-7b-instruct",
];

export function allowedModels(): string[] {
  const raw = process.env.ALLOWED_MODELS;
  if (raw && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return FALLBACK_ALLOWLIST;
}

export function normalizeModelId(model: string): string {
  return model.trim().toLowerCase();
}

export function isModelAllowed(model: string): boolean {
  return allowedModels().includes(normalizeModelId(model));
}
