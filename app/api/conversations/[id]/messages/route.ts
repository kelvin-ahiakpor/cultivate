/**
 * Messages API — the core chat endpoint.
 *
 * GET  — List messages in a conversation (cursor-based pagination for infinite scroll)
 * POST — Send a farmer message + get a streaming Claude AI response
 *
 * The POST endpoint is the heart of Cultivate. Here's what happens:
 *
 *   Farmer types "My maize leaves are turning yellow"
 *     → Save user message to DB
 *     → Load last 20 messages as conversation context
 *     → Load agent config (systemPrompt, responseStyle, threshold)
 *     → Retrieve relevant knowledge chunks via RAG (Voyage embedding → pgvector search)
 *     → Stream Claude's response token-by-token via SSE (with knowledge context injected)
 *     → Save assistant message to DB (with source references)
 *     → Track token usage + cost in ApiUsage table
 *     → Score confidence (if enabled) → flag if below agent's threshold
 *     → Auto-generate conversation title from first message (uses cheap Haiku model)
 *
 * The response is a Server-Sent Events stream with these event types:
 *   { type: "user_message" }  — confirms the user's message was saved
 *   { type: "text" }          — each token from Claude as it generates
 *   { type: "title" }         — auto-generated conversation title (first message only)
 *   { type: "done" }          — stream complete, includes final message + usage stats
 *   { type: "error" }         — something went wrong mid-stream
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess } from "@/lib/api-utils";
import { mastraStream, generateTitle } from "@/lib/claude"; // Phase 6: Using Mastra agent with weather tool
import { scoreConfidence, shouldFlag } from "@/lib/confidence";
import { calculateCost } from "@/lib/cost";
import { retrieveContext } from "@/lib/mastra-rag"; // NOW USES MASTRA RAG

// GET /api/conversations/:id/messages — List messages (cursor-based pagination)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before"); // cursor: message ID

  const user = session!.user;

  try {
    // Verify conversation access
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { agent: { select: { organizationId: true } } },
    });

    if (!conversation) return apiError("Conversation not found", 404);

    if (user.role === "FARMER" && conversation.farmerId !== user.id) {
      return apiError("Forbidden", 403);
    }

    if (user.role !== "FARMER" && conversation.agent.organizationId !== user.organizationId) {
      return apiError("Forbidden", 403);
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(before && { createdAt: { lt: (await prisma.message.findUnique({ where: { id: before } }))?.createdAt } }),
      },
      select: {
        id: true,
        role: true,
        content: true,
        confidenceScore: true,
        sourcesCited: true,
        createdAt: true,
        conversationId: true,
        senderId: true,
        sender: { select: { id: true, name: true, role: true } },
        flaggedQuery: {
          select: {
            id: true,
            status: true,
            farmerReason: true,
            farmerUpdates: true,
            agronomistResponse: true,
            verificationNotes: true,
          }
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    // Transform to include isFlagged boolean
    const messagesWithFlags = messages.map(msg => ({
      ...msg,
      isFlagged: !!msg.flaggedQuery,
    }));

    return apiSuccess({
      messages: messagesWithFlags,
      hasMore: messages.length === limit,
    });
  } catch (err) {
    console.error("GET /api/conversations/[id]/messages error:", err);
    return apiError("Failed to fetch messages", 500);
  }
}

// POST /api/conversations/:id/messages — Send a message + get AI response (streaming)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "FARMER", "ADMIN")) {
    return apiError("Only farmers can send messages", 403);
  }

  const { id } = await params;
  const user = session!.user;

  try {
    // Verify conversation exists and user owns it
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            systemPrompt: true,
            responseStyle: true,
            confidenceThreshold: true,
            organizationId: true,
            agronomistId: true,
          },
        },
      },
    });

    if (!conversation) return apiError("Conversation not found", 404);

    if (conversation.farmerId !== user.id && user.role !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    if (conversation.agent.organizationId !== user.organizationId) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return apiError("Message content is required", 400);
    }

    const trimmedContent = content.trim();

    // 1. Save user message
    console.log(`[Conversation ${id}] Step 1: Saving user message...`);
    const userMessage = await prisma.message.create({
      data: {
        content: trimmedContent,
        role: "USER",
        conversationId: id,
        senderId: user.id,
      },
    });

    // 2. Load conversation history (last 20 messages for context)
    console.log(`[Conversation ${id}] Step 2: Loading conversation history...`);
    const history = await prisma.message.findMany({
      where: { conversationId: id, id: { not: userMessage.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { role: true, content: true },
    });

    const conversationHistory = history
      .reverse()
      .map((msg) => ({
        role: msg.role.toLowerCase() as "user" | "assistant",
        content: msg.content,
      }));

    // 3. Check if this is the first message (for auto-title)
    const isFirstMessage = conversationHistory.length === 0;
    console.log(`[Conversation ${id}] Step 3: Loaded ${conversationHistory.length} messages from history`);

    // 4. Retrieve relevant knowledge context via RAG
    //    Embeds the farmer's question, searches Mastra vector store for similar chunks,
    //    and formats them as context for Claude's system prompt.
    console.log(`[Conversation ${id}] Step 4: Retrieving RAG context for query...`);
    const rag = await retrieveContext(trimmedContent, conversation.agent.id, conversation.agent.organizationId);
    if (rag.hasContext) {
      console.log(`[Conversation ${id}] ✅ Found ${rag.chunks.length} relevant chunks from knowledge bases`);
    } else {
      console.log(`[Conversation ${id}] No RAG context found (agent has no knowledge or no relevant chunks)`);
    }

    // 5. Stream Claude response via SSE (using Mastra agent with weather tool)
    console.log(`[Conversation ${id}] Step 5: Starting Mastra agent stream...`);
    const { stream, getUsage } = await mastraStream({
      systemPrompt: conversation.agent.systemPrompt,
      responseStyle: conversation.agent.responseStyle,
      conversationHistory,
      userMessage: trimmedContent,
      knowledgeContext: rag.hasContext ? rag.context : undefined,
      // User context (Phase 6.2: location field to be added to User model)
      userLocation: undefined, // TODO: user.location when Phase 6.2 is complete
      userName: user.name,
    });

    let fullResponse = "";

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send user message event first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "user_message", message: userMessage })}\n\n`)
          );

          // Stream assistant response chunks
          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`)
            );
          }

          // 6. Get token usage (with fallback if stream failed)
          const usage = await getUsage();
          const inputTokens = usage?.inputTokens || 0;
          const outputTokens = usage?.outputTokens || 0;

          // 7. Score confidence (returns null if disabled)
          const confidenceScore = scoreConfidence({
            response: fullResponse,
            hasKnowledgeContext: rag.hasContext,
            knowledgeChunksUsed: rag.chunks.length,
            conversationHistoryLength: conversationHistory.length,
          });

          // 8. Save assistant message (with source references from RAG)
          const assistantMessage = await prisma.message.create({
            data: {
              content: fullResponse,
              role: "ASSISTANT",
              confidenceScore,
              sourcesCited: rag.chunks.map((c) => c.knowledgeBaseId),
              conversationId: id,
              senderId: user.id, // Sender is the user who triggered the response
            },
          });

          // 9. Track API usage
          await prisma.apiUsage.create({
            data: {
              inputTokens,
              outputTokens,
              totalCost: calculateCost(inputTokens, outputTokens),
              endpoint: "chat",
              model: "claude-sonnet-4-5-20250929",
              organizationId: conversation.agent.organizationId,
              messageId: assistantMessage.id,
            },
          });

          // 10. Flag if confidence is below threshold
          if (shouldFlag(confidenceScore, conversation.agent.confidenceThreshold)) {
            await prisma.flaggedQuery.create({
              data: {
                messageId: assistantMessage.id,
                agentId: conversation.agent.id,
                agronomistId: conversation.agent.agronomistId,
              },
            });
          }

          // 11. Update conversation timestamp
          await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
          });

          // 12. Auto-generate title if first message OR if title generation failed before
          const needsTitle = !conversation.title;
          if (needsTitle) {
            const title = await generateTitle(trimmedContent);
            await prisma.conversation.update({
              where: { id },
              data: { title },
            });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "title", title })}\n\n`)
            );
          }

          // Send done event with full assistant message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                message: assistantMessage,
                usage: {
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  cost: calculateCost(usage.inputTokens, usage.outputTokens),
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (streamError) {
          console.error("Stream error:", streamError);

          // If streaming fails, try to save whatever we have
          if (fullResponse.length > 0) {
            await prisma.message.create({
              data: {
                content: fullResponse,
                role: "ASSISTANT",
                conversationId: id,
                senderId: user.id,
              },
            });
          }

          // Surface billing/quota errors as a readable message
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          const isBillingError = errMsg.includes("credit balance") || errMsg.includes("billing");
          const userFacingError = isBillingError
            ? "The AI service is temporarily unavailable due to billing limits. Please contact support."
            : "Sorry, an error occurred while generating the response";

          // Store error message in DB so conversation history is complete when user returns
          await prisma.message.create({
            data: {
              content: userFacingError,
              role: "ASSISTANT",
              conversationId: id,
              senderId: user.id,
            },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: userFacingError })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("POST /api/conversations/[id]/messages error:", err);

    // Save error message to DB so conversation history is complete
    // This catches errors that happen BEFORE streaming starts (e.g., RAG failures)
    try {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isBillingError = errorMessage.includes("credit balance") || errorMessage.includes("billing");
      const userFacingError = isBillingError
        ? "The AI service is temporarily unavailable due to billing limits. Please contact support."
        : "Sorry, something went wrong. Please try again.";

      await prisma.message.create({
        data: {
          content: userFacingError,
          role: "ASSISTANT",
          conversationId: id,
          senderId: user.id,
        },
      });
    } catch (saveErr) {
      console.error("Failed to save error message to DB:", saveErr);
      // Don't throw - we still want to return the API error
    }

    return apiError("Failed to send message", 500);
  }
}
