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
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const KNOWLEDGE_BUCKET = "knowledge-documents";
const CHAT_IMAGE_BUCKET = "chat-images";

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return "bin";
  }

  return fileName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function getStoragePath(
  organizationId: string,
  knowledgeBaseId: string,
  fileName: string
): string {
  const extension = getFileExtension(fileName);
  return `${organizationId}/${knowledgeBaseId}/source.${extension}`;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key);
}

/**
 * Ensure the storage bucket exists — creates it if missing.
 * Called before first upload so the bucket is always ready.
 */
async function ensureBucket(
  supabase: SupabaseClient,
  bucketName: string,
  allowedMimeTypes: string[],
  fileSizeLimit: number
) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: { name: string }) => b.name === bucketName);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true, // public URLs work without auth
      allowedMimeTypes,
      fileSizeLimit,
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`Failed to create storage bucket: ${error.message}`);
    }
  }
}

/**
 * Upload a file to Supabase Storage.
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  knowledgeBaseId: string
): Promise<string> {
  const supabase = getClient();
  await ensureBucket(
    supabase,
    KNOWLEDGE_BUCKET,
    ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
    52428800
  );
  const path = getStoragePath(organizationId, knowledgeBaseId, fileName);

  const { error } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true, // Overwrite if same name exists (for document updates)
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get the public URL
  const { data } = supabase.storage.from(KNOWLEDGE_BUCKET).getPublicUrl(path);
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
  const path = getStoragePath(organizationId, knowledgeBaseId, fileName);

  const { error } = await supabase.storage.from(KNOWLEDGE_BUCKET).remove([path]);

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
  const path = getStoragePath(organizationId, knowledgeBaseId, fileName);

  const { data, error } = await supabase.storage.from(KNOWLEDGE_BUCKET).download(path);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getChatImagePath(
  organizationId: string,
  messageId: string,
  fileName: string,
  index: number
): string {
  const extension = getFileExtension(fileName);
  return `${organizationId}/messages/${messageId}/image-${index + 1}.${extension}`;
}

export async function uploadChatImage(
  file: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  messageId: string,
  index: number
): Promise<string> {
  const supabase = getClient();
  await ensureBucket(
    supabase,
    CHAT_IMAGE_BUCKET,
    ["image/jpeg", "image/png", "image/webp"],
    10485760
  );

  const path = getChatImagePath(organizationId, messageId, fileName, index);

  const { error } = await supabase.storage
    .from(CHAT_IMAGE_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload chat image: ${error.message}`);
  }

  const { data } = supabase.storage.from(CHAT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
