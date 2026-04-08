import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasRole, apiError } from "@/lib/api-utils";
import { downloadFile } from "@/lib/supabase-storage";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

function getContentDisposition(fileName: string, disposition: "inline" | "attachment") {
  const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, '\\"');
  const encodedFileName = encodeURIComponent(fileName);
  return `${disposition}; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
}

// GET /api/knowledge-bases/:id/download?disposition=inline|attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!hasRole(session!.user.role, "AGRONOMIST", "ADMIN")) {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;
  const dispositionParam = request.nextUrl.searchParams.get("disposition");
  const disposition = dispositionParam === "inline" ? "inline" : "attachment";

  try {
    const doc = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        organizationId: true,
      },
    });

    if (!doc) return apiError("Document not found", 404);

    if (doc.organizationId !== session!.user.organizationId) {
      return apiError("Forbidden", 403);
    }

    const fileBuffer = await downloadFile(doc.organizationId, doc.id, doc.fileName);
    const contentType = MIME_TYPES[doc.fileType.toLowerCase()] || "application/octet-stream";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": getContentDisposition(doc.fileName, disposition),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/knowledge-bases/[id]/download error:", msg);
    return apiError("Failed to download document", 500);
  }
}
