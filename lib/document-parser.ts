/**
 * Document text extraction for the RAG pipeline.
 *
 * Supports:
 *   - PDF  → uses `pdftotext` (poppler) via child_process. Runs in a separate
 *            OS process so it never touches the Node.js heap. Zero memory overhead.
 *            Requires poppler: `brew install poppler` (Mac) / `apt install poppler-utils` (Linux/Vercel).
 *   - DOCX → uses mammoth to convert to plain text
 *   - TXT  → reads the buffer directly as UTF-8
 *
 * All functions return a single string of the full document text.
 * The chunker (lib/chunker.ts) handles splitting it into pieces.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import mammoth from "mammoth";

const execFileAsync = promisify(execFile);

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  const type = fileType.toLowerCase();

  if (type === "pdf" || type === "application/pdf") {
    return extractFromPdf(buffer);
  }

  if (
    type === "docx" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractFromDocx(buffer);
  }

  if (type === "txt" || type === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${fileType}. Supported: pdf, docx, txt`);
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // Write buffer to a temp file, run pdftotext on it, then clean up.
  // pdftotext runs in its own OS process — zero impact on Node.js heap.
  const tmpPath = join(tmpdir(), `cultivate-pdf-${Date.now()}.pdf`);
  try {
    await writeFile(tmpPath, buffer);
    // "-" as output means stdout; "-layout" preserves approximate layout
    const { stdout } = await execFileAsync("pdftotext", ["-layout", tmpPath, "-"]);
    return stdout;
  } finally {
    await unlink(tmpPath).catch(() => {}); // clean up even if extraction failed
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
