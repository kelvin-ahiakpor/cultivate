/**
 * Document text extraction for the RAG pipeline.
 *
 * Supports:
 *   - PDF  → uses pdf-parse to extract text from all pages
 *   - DOCX → uses mammoth to convert to plain text
 *   - TXT  → reads the buffer directly as UTF-8
 *
 * All functions return a single string of the full document text.
 * The chunker (lib/chunker.ts) handles splitting it into pieces.
 */
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extract text from a file buffer based on its type.
 *
 * Example:
 *   const buffer = await downloadFile(...);
 *   const text = await extractText(buffer, "application/pdf");
 *   // text = "Chapter 1: Maize Farming in Ghana\n\nMaize is the most..."
 */
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
  // pdf-parse v3 uses a class-based API:
  //   new PDFParse({ data, verbosity }) → .load() → .getText()
  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
