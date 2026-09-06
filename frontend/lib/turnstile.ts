/**
 * Cloudflare Turnstile Server-Side Siteverify Utility
 * Follows the canonical Cloudflare Turnstile integration contract:
 * https://developers.cloudflare.com/turnstile/spin/prompt.md
 */

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

export async function verifyTurnstile(
  token: unknown,
  expectedAction: string,
  clientIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET;

  // If TURNSTILE_SECRET is not configured (e.g. offline dev or isolated test environments),
  // bypass verification to prevent blocking developer workflows.
  if (!secret) {
    return { success: true };
  }

  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? 'neurach.tech,www.neurach.tech,vectrieve.duckdns.org,localhost,127.0.0.1')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
  );

  // Canonical token constraints: string, 1 to 2048 chars
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return {
      success: false,
      error: 'Security verification failed: missing or invalid security token.',
    };
  }

  try {
    const formData = new URLSearchParams({
      secret: secret,
      response: token,
    });

    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(10_000),
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Security verification service responded with status ${response.status}.`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      const errorCodes = Array.isArray(data['error-codes']) ? data['error-codes'].join(', ') : 'rejected';
      console.warn(`[Turnstile] Verification rejected: ${errorCodes}`);
      return {
        success: false,
        error: 'Bot verification failed. Please refresh and try again.',
      };
    }

    // Action check
    if (expectedAction && data.action && data.action !== expectedAction) {
      console.warn(`[Turnstile] Action mismatch: expected '${expectedAction}', got '${data.action}'`);
      return {
        success: false,
        error: 'Security verification action mismatch.',
      };
    }

    // Hostname check (must be in the allowlist if specified)
    if (expectedHostnames.size > 0 && data.hostname && !expectedHostnames.has(data.hostname)) {
      console.warn(`[Turnstile] Hostname mismatch: '${data.hostname}' not in ${Array.from(expectedHostnames)}`);
      return {
        success: false,
        error: 'Security verification origin hostname mismatch.',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Turnstile] Siteverify network error:', error);
    return {
      success: false,
      error: 'Security verification service temporarily unreachable. Please try again.',
    };
  }
}
