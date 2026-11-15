export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "minimaxai/minimax-m3.1-flash";

// Verified live against NVIDIA NIM (2026-11-15): these three stream real
// completions with this account. The 2024-era ids (llama-3.1-*, gemma-2-9b,
// mixtral, qwen2.5-7b) return 404/410, and several 2026 free-tier ids
// (glm-5.3-flash, gpt-oss-20b, deepseek-v4.1-flash, gemma-4-31b) hang or need
// per-family registration. Override with ALLOWED_MODELS.
const FALLBACK_ALLOWLIST = [
  "minimaxai/minimax-m3.1-flash",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "mistralai/mistral-large-4-1t-a52b",
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
