import crypto from "node:crypto";
import type { VercelRequest } from "@vercel/node";

export interface AuthResult {
  ok: boolean;
  clientId?: string;
  reason?: "unauthorized" | "server_misconfigured";
}

/**
 * Bearer-token auth against the shared app secret (JARVIS_API_KEY).
 * Uses constant-time comparison; the raw token is never logged.
 */
export function authenticate(req: VercelRequest): AuthResult {
  const configured = process.env.JARVIS_API_KEY;
  if (!configured) {
    return { ok: false, reason: "server_misconfigured" };
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !timingSafeEqual(token, configured)) {
    return { ok: false, reason: "unauthorized" };
  }

  // Pseudonymous rate-limit bucket derived from the token (never the token itself).
  const clientId = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
  return { ok: true, clientId };
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}
