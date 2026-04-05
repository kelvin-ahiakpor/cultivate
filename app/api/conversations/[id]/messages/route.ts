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

// Raise Vercel's function timeout for this route — Claude SSE streams can exceed the 10s default
export const maxDuration = 60;
import { prisma, recoverFromDatabaseError } from "@/lib/prisma";
import { requireAuth, hasRole, apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { chatStream, mastraStream, generateTitle } from "@/lib/claude";
import { scoreConfidence, shouldFlag } from "@/lib/confidence";
import { calculateCost } from "@/lib/cost";
import { retrieveContext } from "@/lib/mastra-rag"; // NOW USES MASTRA RAG
import { uploadChatImage } from "@/lib/supabase-storage";

const MAX_IMAGE_ATTACHMENTS = 3;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            attachmentType: true,
            width: true,
            height: true,
          },
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
    return await handleApiError("GET /api/conversations/[id]/messages", err, "Failed to fetch messages");
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

    const contentType = request.headers.get("content-type") || "";

    let content = "";
    let imageFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawContent = formData.get("content");
      content = typeof rawContent === "string" ? rawContent : "";
      imageFiles = formData
        .getAll("images")
        .filter((value): value is File => value instanceof File && value.size > 0);
    } else {
      const body = await request.json();
      content = typeof body.content === "string" ? body.content : "";
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length === 0 && imageFiles.length === 0) {
      return apiError("Message content or at least one image is required", 400);
    }

    if (imageFiles.length > MAX_IMAGE_ATTACHMENTS) {
      return apiError(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images per message`, 400);
    }

    for (const image of imageFiles) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(image.type)) {
        return apiError("Only JPG, PNG, and WebP images are supported", 400);
      }
    }

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

    const uploadedAttachments: Array<{ fileName: string; fileUrl: string; mimeType: string; attachmentType: "IMAGE" }> = [];

    try {
      if (imageFiles.length > 0) {
        console.log(`[Conversation ${id}] Step 1.5: Uploading ${imageFiles.length} image attachment(s)...`);
        for (const [index, image] of imageFiles.entries()) {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileUrl = await uploadChatImage(
            buffer,
            image.name,
            image.type,
            conversation.agent.organizationId,
            userMessage.id,
            index
          );

          await prisma.messageAttachment.create({
            data: {
              messageId: userMessage.id,
              fileName: image.name,
              fileUrl,
              mimeType: image.type,
              attachmentType: "IMAGE",
            },
          });

          uploadedAttachments.push({
            fileName: image.name,
            fileUrl,
            mimeType: image.type,
            attachmentType: "IMAGE",
          });
        }
      }
    } catch (attachmentError) {
      await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => undefined);
      throw attachmentError;
    }

    // 2. Load conversation history (last 20 messages for context)
    console.log(`[Conversation ${id}] Step 2: Loading conversation history...`);
    const history = await prisma.message.findMany({
      where: { conversationId: id, id: { not: userMessage.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        role: true,
        content: true,
        attachments: {
          select: {
            fileUrl: true,
            mimeType: true,
          },
        },
      },
    });

    const conversationHistory = history
      .reverse()
      .map((msg) => ({
        role: msg.role.toLowerCase() as "user" | "assistant",
        content: msg.content,
        attachments: msg.attachments,
      }));

    // 3. Check if this is the first message (for auto-title)
    const isFirstMessage = conversationHistory.length === 0;
    console.log(`[Conversation ${id}] Step 3: Loaded ${conversationHistory.length} messages from history`);

    // 4. Retrieve relevant knowledge context via RAG
    //    Embeds the farmer's question, searches Mastra vector store for similar chunks,
    //    and formats them as context for Claude's system prompt.
    let rag = { hasContext: false, chunks: [] as Awaited<ReturnType<typeof retrieveContext>>["chunks"], context: "" };
    if (trimmedContent.length > 0) {
      console.log(`[Conversation ${id}] Step 4: Retrieving RAG context for query...`);
      rag = await retrieveContext(trimmedContent, conversation.agent.id, conversation.agent.organizationId);
      if (rag.hasContext) {
        console.log(`[Conversation ${id}] ✅ Found ${rag.chunks.length} relevant chunks from knowledge bases`);
      } else {
        console.log(`[Conversation ${id}] No RAG context found (agent has no knowledge or no relevant chunks)`);
      }
    } else {
      console.log(`[Conversation ${id}] Step 4: Skipping RAG retrieval for image-only message`);
    }

    // 4.5. Fetch user's location from database (for weather tool)
    const farmer = await prisma.user.findUnique({
      where: { id: user.id },
      select: { location: true, gpsCoordinates: true },
    });

    // 5. Stream Claude response via SSE (using Mastra agent with weather tool)
    console.log(`[Conversation ${id}] Step 5: Starting Mastra agent stream...`);
    const streamInput = {
      systemPrompt: conversation.agent.systemPrompt,
      responseStyle: conversation.agent.responseStyle,
      conversationHistory,
      userMessage: trimmedContent,
      userImages: uploadedAttachments,
      knowledgeContext: rag.hasContext ? rag.context : undefined,
    };

    const { stream, getUsage } = uploadedAttachments.length > 0
      ? await chatStream(streamInput)
      : await mastraStream({
          ...streamInput,
          // User context - location from settings for weather tool
          userLocation: farmer?.location || undefined,
          userName: user.name,
        });

    let fullResponse = "";

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send user message event first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "user_message",
              message: {
                ...userMessage,
                attachments: uploadedAttachments,
              },
            })}\n\n`)
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
            const title = trimmedContent.length > 0 ? await generateTitle(trimmedContent) : "Image consultation";
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
    const databaseBusy = await recoverFromDatabaseError(err);

    // Save error message to DB so conversation history is complete
    // This catches errors that happen BEFORE streaming starts (e.g., RAG failures)
    try {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isBillingError = errorMessage.includes("credit balance") || errorMessage.includes("billing");
      const userFacingError = isBillingError
        ? "The AI service is temporarily unavailable due to billing limits. Please contact support."
        : databaseBusy
          ? "Database is busy right now. Please retry in a moment."
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

    return apiError(
      databaseBusy ? "Database is busy right now. Please retry in a moment." : "Failed to send message",
      databaseBusy ? 503 : 500
    );
  }
}
