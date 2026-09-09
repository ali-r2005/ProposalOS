import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless proposal share links: no DB row, no token to store or revoke
 * individually. The URL itself carries an expiry and an HMAC signature over
 * `${proposalId}:${expiresAt}`, so anyone with the exact link can view the
 * proposal until it expires, and nobody can forge or extend one without the
 * server's secret. Revoking early is only possible by rotating SHARE_LINK_SECRET,
 * which invalidates every outstanding link at once.
 */
const SHARE_LINK_SECRET = process.env.SHARE_LINK_SECRET || "dev-secret-change-in-production";

function sign(proposalId: string, expiresAt: number): string {
  return createHmac("sha256", SHARE_LINK_SECRET)
    .update(`${proposalId}:${expiresAt}`)
    .digest("hex");
}

export function createShareSignature(proposalId: string, expiresAt: number): string {
  return sign(proposalId, expiresAt);
}

/** Verifies the signature and that the link hasn't expired. */
export function verifyShareSignature(
  proposalId: string,
  expiresAt: number,
  signature: string
): boolean {
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = sign(proposalId, expiresAt);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
