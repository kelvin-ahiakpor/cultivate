/**
 * Claude API cost calculation.
 *
 * Claude Sonnet 4.5 pricing (as of Feb 2026):
 *   Input:  $3.00 / 1M tokens
 *   Output: $15.00 / 1M tokens
 *
 * Claude Haiku 4.5 pricing:
 *   Input:  $0.80 / 1M tokens
 *   Output: $4.00 / 1M tokens
 */

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
};

/**
 * Calculate cost in USD for a Claude API call.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model = "claude-sonnet-4-5-20250929"
): number {
  const pricing = PRICING[model] || PRICING["claude-sonnet-4-5-20250929"];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
}
