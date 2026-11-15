import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/v1/health — unauthenticated availability check (PRD §8).
 * Reports only whether credentials exist; never their values.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  res.status(200).json({
    status: "ok",
    time: new Date().toISOString(),
    nvidiaConfigured: Boolean(process.env.NVIDIA_API_KEY),
  });
}
