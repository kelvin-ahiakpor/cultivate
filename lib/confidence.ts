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

    // FUTURE ENHANCEMENT: Weight by chunk relevance scores from vector search
    // const chunkBonus = Math.min(0.25, input.knowledgeChunksUsed * 0.05);
    // score += chunkBonus;
    // This would give higher confidence when more relevant chunks are found.
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

  // FUTURE ENHANCEMENT: Check for softer uncertainty markers
  // const uncertaintyMarkers = ["might", "maybe", "possibly", "could be", "perhaps"];
  // const uncertaintyCount = uncertaintyMarkers.filter(m => lowerResponse.includes(m)).length;
  // if (uncertaintyCount > 2) score -= 0.1;

  // FUTURE ENHANCEMENT: Bonus for well-structured responses
  // const hasListOrSteps = /\n[-•*]\s|^\d+\./m.test(input.response);
  // if (hasListOrSteps) score += 0.05;
  // Responses with bullet points or numbered steps tend to be more confident/complete.

  // OTHER METHODS: Semantic entropy (requires logprobs from Claude API)
  // This measures how much the model "hesitates" between different token choices.
  // Low entropy = model is certain, high entropy = model is guessing.
  // Implementation would require: max_tokens_to_sample with logprobs in API call.

  // OTHER METHODS: LLM-as-a-judge verification
  // Send the response + knowledge chunks to a second LLM call asking:
  // "Is this response factually supported by the provided context?"
  // This catches hallucinations that heuristics miss, but costs 2x API calls.

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
