/**
 * Confidence scoring module — decoupled and optional.
 *
 * Set ENABLE_CONFIDENCE_SCORING=true in .env to activate.
 * When disabled, all functions return null and no flagging occurs.
 *
 * Current approach: heuristic scoring (Option B from the plan).
 * Can be swapped for Claude self-assessment or eval-based scoring later.
 */

const ENABLED = process.env.ENABLE_CONFIDENCE_SCORING === "true";

interface ConfidenceInput {
  response: string;
  hasKnowledgeContext: boolean;
  knowledgeChunksUsed: number;
  conversationHistoryLength: number;
}

/**
 * Score confidence of an AI response. Returns null if scoring is disabled.
 */
export function scoreConfidence(input: ConfidenceInput): number | null {
  if (!ENABLED) return null;

  let score = 0.5; // Base score

  // Has relevant knowledge chunks from RAG
  if (input.hasKnowledgeContext && input.knowledgeChunksUsed > 0) {
    score += 0.2;
  }

  // Conversation has context (not a cold start)
  if (input.conversationHistoryLength > 2) {
    score += 0.1;
  }

  // Response is a reasonable length (not too short, not hedging excessively)
  if (input.response.length > 100 && input.response.length < 3000) {
    score += 0.1;
  }

  // Penalize hedging language
  const hedgingPhrases = [
    "i'm not sure",
    "i don't know",
    "i cannot",
    "i'm unable",
    "outside my expertise",
    "consult a professional",
    "i don't have enough information",
  ];

  const lowerResponse = input.response.toLowerCase();
  const hedgingCount = hedgingPhrases.filter((phrase) => lowerResponse.includes(phrase)).length;

  if (hedgingCount === 0) {
    score += 0.1;
  } else if (hedgingCount >= 2) {
    score -= 0.15;
  }

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, parseFloat(score.toFixed(2))));
}

/**
 * Check if a response should be flagged based on confidence.
 * Returns false if scoring is disabled (nothing gets flagged).
 */
export function shouldFlag(confidenceScore: number | null, threshold: number): boolean {
  if (confidenceScore === null) return false;
  return confidenceScore < threshold;
}
