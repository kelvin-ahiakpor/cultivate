/**
 * Migration script: Re-process existing knowledge bases with Mastra PgVector
 *
 * This script re-embeds all knowledge bases after migrating from manual pgvector to @mastra/pg.
 * It downloads each KB from Supabase Storage and re-processes it using the new pipeline.
 *
 * Usage: npx tsx lib/workers/migrate-existing-kbs.ts
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { downloadFile } from "@/lib/supabase-storage";
import { processAndStoreDocument, deleteChunks } from "@/lib/mastra-rag";

async function migrateKnowledgeBases() {
  console.log("🚀 Starting knowledge base migration...\n");

  try {
    // 1. Fetch all knowledge bases
    const kbs = await prisma.knowledgeBase.findMany({
      select: {
        id: true,
        fileName: true,
        fileType: true,
        organizationId: true,
        chunkCount: true,
      },
      orderBy: { uploadedAt: "asc" },
    });

    if (kbs.length === 0) {
      console.log("✅ No knowledge bases found. Nothing to migrate.");
      return;
    }

    console.log(`📚 Found ${kbs.length} knowledge base(s) to migrate:\n`);
    kbs.forEach((kb, i) => {
      console.log(`${i + 1}. ${kb.fileName} (${kb.fileType}) - ${kb.chunkCount} chunks`);
    });
    console.log();

    // 2. Process each knowledge base
    let successCount = 0;
    let errorCount = 0;

    for (const kb of kbs) {
      console.log(`\n📄 Processing: ${kb.fileName}`);
      console.log(`   ID: ${kb.id}`);
      console.log(`   Type: ${kb.fileType}`);
      console.log(`   Organization: ${kb.organizationId}`);

      try {
        // Step 1: Delete old embeddings (if any exist in Mastra PgVector)
        console.log(`   🗑️  Deleting old embeddings...`);
        try {
          await deleteChunks(kb.id, kb.organizationId);
          console.log(`   ✅ Old embeddings deleted`);
        } catch (deleteError: any) {
          // Ignore "table does not exist" errors - expected during migration from old system
          if (deleteError.message?.includes("does not exist")) {
            console.log(`   ℹ️  No old embeddings to delete (table doesn't exist yet)`);
          } else {
            throw deleteError;
          }
        }

        // Step 2: Download file from Supabase Storage
        console.log(`   ⬇️  Downloading from Supabase Storage...`);
        const buffer = await downloadFile(kb.organizationId, kb.id, kb.fileName);

        // Step 3: Re-process and store with Mastra
        console.log(`   🔄 Re-processing with Mastra pipeline...`);
        const chunkCount = await processAndStoreDocument(
          buffer,
          kb.fileType,
          kb.id,
          kb.organizationId,
          kb.fileName
        );

        // Step 4: Update chunk count in database
        console.log(`   💾 Updating chunk count in database...`);
        await prisma.knowledgeBase.update({
          where: { id: kb.id },
          data: { chunkCount },
        });

        console.log(`   ✅ Success! ${chunkCount} chunks created`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error processing ${kb.fileName}:`, error);
        errorCount++;
      }
    }

    // 3. Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 Migration Summary:");
    console.log(`   Total: ${kbs.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`${"=".repeat(60)}\n`);

    if (errorCount === 0) {
      console.log("🎉 Migration completed successfully!");
    } else {
      console.log("⚠️  Migration completed with errors. Please review the logs above.");
    }
  } catch (error) {
    console.error("💥 Fatal error during migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateKnowledgeBases();
