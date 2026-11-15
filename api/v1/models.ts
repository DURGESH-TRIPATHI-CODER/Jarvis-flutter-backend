import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate } from "../_lib/auth";
import { allowedModels, DEFAULT_MODEL } from "../_lib/models";

/**
 * GET /api/v1/models — cloud model allowlist (PRD §8).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const auth = authenticate(req);
  if (!auth.ok) {
    res.status(401).json({ error: auth.reason ?? "unauthorized" });
    return;
  }

  res.status(200).json({
    models: allowedModels(),
    default: DEFAULT_MODEL,
  });
}
