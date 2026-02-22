/**
 * Text chunking for the RAG pipeline.
 *
 * Splits documents into overlapping chunks for embedding and retrieval.
 * Book principle: "500-1000 tokens per chunk, 100 token overlap."
 *
 * Strategy: recursive character splitting.
 * We try to split on paragraph breaks first, then sentences, then words.
 * This preserves semantic coherence within chunks.
 *
 * Overlap ensures that context at chunk boundaries isn't lost.
 * Example with 3 chunks and 100-char overlap:
 *   Chunk 1: "...the maize plant grows to 2m. It requires full sunlight..."
 *   Chunk 2: "...requires full sunlight and well-drained soil. Spacing should be..."
 *   Chunk 3: "...Spacing should be 75cm between rows. Apply fertilizer..."
 *   The overlapping text ("requires full sunlight...") appears in both chunks 1 and 2.
 */

export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

// Rough token estimate: ~4 characters per token (works for English text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into overlapping chunks.
 *
 * @param text - Full document text
 * @param maxTokens - Max tokens per chunk (default: 500)
 * @param overlapTokens - Overlap between chunks (default: 100)
 */
export function chunkText(
  text: string,
  maxTokens = 500,
  overlapTokens = 100
): Chunk[] {
  // Convert token targets to character counts
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  // Clean up the text: normalize whitespace, remove excessive blank lines
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length === 0) return [];

  // If the whole document fits in one chunk, return it as-is
  if (cleaned.length <= maxChars) {
    return [{ content: cleaned, chunkIndex: 0, tokenCount: estimateTokens(cleaned) }];
  }

  const chunks: Chunk[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + maxChars;

    // Don't go past the end of the text
    if (end >= cleaned.length) {
      end = cleaned.length;
    } else {
      // Try to break at a natural boundary (paragraph > sentence > word)
      const breakPoint = findBreakPoint(cleaned, start, end);
      if (breakPoint > start) {
        end = breakPoint;
      }
    }

    const content = cleaned.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        chunkIndex: chunks.length,
        tokenCount: estimateTokens(content),
      });
    }

    // Move forward, but overlap with the previous chunk
    start = end - overlapChars;

    // Safety: ensure we always make progress
    if (start <= (chunks.length > 1 ? end - maxChars : 0)) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Find the best natural break point within a range of text.
 * Prefers paragraph breaks > sentence ends > word boundaries.
 */
function findBreakPoint(text: string, start: number, end: number): number {
  const searchRegion = text.slice(start, end);

  // Try paragraph break (double newline)
  const lastParagraph = searchRegion.lastIndexOf("\n\n");
  if (lastParagraph > searchRegion.length * 0.3) {
    return start + lastParagraph + 2;
  }

  // Try sentence break (. or ! or ? followed by space or newline)
  const sentenceBreak = searchRegion.search(/[.!?]\s[A-Z][^]*$/);
  if (sentenceBreak > searchRegion.length * 0.3) {
    return start + sentenceBreak + 2;
  }

  // Try single newline
  const lastNewline = searchRegion.lastIndexOf("\n");
  if (lastNewline > searchRegion.length * 0.3) {
    return start + lastNewline + 1;
  }

  // Fall back to word boundary (space)
  const lastSpace = searchRegion.lastIndexOf(" ");
  if (lastSpace > searchRegion.length * 0.3) {
    return start + lastSpace + 1;
  }

  // No good break point found — just cut at maxChars
  return end;
}
