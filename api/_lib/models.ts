export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "z-ai/glm-5.3-flash";

// Current NVIDIA NIM free-tier catalogue (verified live 2026-11-15).
// The 2024-era ids (llama-3.1-*, gemma-2-9b, mixtral, qwen2.5-7b) return
// 404/410 upstream now — NVIDIA retired them. Override with ALLOWED_MODELS.
const FALLBACK_ALLOWLIST = [
  "z-ai/glm-5.3-flash",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-3-super-120b-a12b",
  "deepseek-ai/deepseek-v4.1-flash",
  "openai/gpt-oss-20b",
  "meta/llama-3.2-11b-vision-instruct",
  "google/gemma-4-31b-it",
  "mistralai/mistral-large-4-1t-a52b",
  "minimaxai/minimax-m3.1-flash",
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
