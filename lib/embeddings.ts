/**
 * Embedding generation via Voyage AI 3.5-lite.
 *
 * Voyage 3.5-lite specs:
 *   - $0.02 / 1M tokens (same as OpenAI text-embedding-3-small)
 *   - 512 dimensions (vs OpenAI's 1536 — cheaper pgvector storage)
 *   - 32K token context window (vs OpenAI's 8K)
 *   - +6.34% better retrieval quality than OpenAI's large model
 *
 * Requires env var: VOYAGE_API_KEY
 *
 * Voyage API docs: https://docs.voyageai.com/reference/embeddings-api
 */

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-lite"; // 512 dimensions

/**
 * Generate embeddings for one or more text strings.
 * Returns an array of 512-dimensional vectors (one per input).
 *
 * Example:
 *   const vectors = await embed(["Maize requires full sun", "Apply NPK fertilizer"]);
 *   // vectors[0] = [0.023, -0.156, 0.089, ...] (512 numbers)
 *   // vectors[1] = [0.011, -0.203, 0.045, ...] (512 numbers)
 */
export async function embed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VOYAGE_API_KEY environment variable");
  }

  // Voyage supports batching up to 128 texts at once
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      input_type: "document", // Use "query" when searching, "document" when indexing
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Generate a single embedding for a search query.
 * Uses input_type: "query" for better retrieval (Voyage optimizes differently for queries vs documents).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VOYAGE_API_KEY environment variable");
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [text],
      input_type: "query", // Optimized for search queries
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
