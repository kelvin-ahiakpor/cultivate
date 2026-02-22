/**
 * Supabase Storage integration for knowledge base documents.
 *
 * Files are uploaded to a "knowledge-documents" bucket in Supabase Storage.
 * Path format: {organizationId}/{knowledgeBaseId}/{fileName}
 * This gives us org-level isolation in the file system.
 *
 * Requires these env vars:
 *   NEXT_PUBLIC_SUPABASE_URL — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only, bypasses RLS)
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "knowledge-documents";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key);
}

/**
 * Upload a file to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  knowledgeBaseId: string
): Promise<string> {
  const supabase = getClient();
  const path = `${organizationId}/${knowledgeBaseId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true, // Overwrite if same name exists (for document updates)
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get the public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  organizationId: string,
  knowledgeBaseId: string,
  fileName: string
): Promise<void> {
  const supabase = getClient();
  const path = `${organizationId}/${knowledgeBaseId}/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error(`Failed to delete file ${path}:`, error.message);
    // Don't throw — file deletion failure shouldn't block DB cleanup
  }
}

/**
 * Download a file from Supabase Storage (for reprocessing).
 */
export async function downloadFile(
  organizationId: string,
  knowledgeBaseId: string,
  fileName: string
): Promise<Buffer> {
  const supabase = getClient();
  const path = `${organizationId}/${knowledgeBaseId}/${fileName}`;

  const { data, error } = await supabase.storage.from(BUCKET).download(path);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
