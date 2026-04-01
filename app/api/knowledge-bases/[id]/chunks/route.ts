/**
 * GET /api/knowledge-bases/[id]/chunks
 *
 * Retrieve chunk previews for a knowledge base document
 * Returns first 10 chunks with content, token count, and chunk index
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PgVector } from "@mastra/pg";

const EMBEDDING_DIMENSION = 1024;

// Initialize Mastra PgVector
const vectorStore = new PgVector({
  id: "cultivate-vectors",
  connectionString: process.env.DATABASE_URL!,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const organizationId = session.user.organizationId;
    const indexName = `org_${organizationId}`;

    // Query vector store for chunks belonging to this knowledge base
    // Use a dummy query vector (all zeros) to get all chunks, then filter by KB ID
    const results = await vectorStore.query({
      indexName,
      queryVector: Array(EMBEDDING_DIMENSION).fill(0),
      topK: 10, // Get first 10 chunks for preview
      filter: { knowledgeBaseId: id },
    });

    // Format chunks for display
    const chunks = results.map((result, index) => ({
      chunkIndex: result.metadata?.chunkIndex ?? index,
      content: result.metadata?.content ?? "No content available",
      tokenCount: result.metadata?.tokenCount ?? 0,
      id: result.id,
    }));

    // Sort by chunk index to maintain document order
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    return NextResponse.json({
      knowledgeBaseId: id,
      chunks,
      total: chunks.length,
    });
  } catch (error: any) {
    console.error("Error fetching chunks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve chunks", details: error.message },
      { status: 500 }
    );
  }
}
