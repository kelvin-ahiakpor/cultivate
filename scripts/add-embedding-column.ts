import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function addEmbeddingColumn() {
  try {
    console.log('Adding embedding column to document_chunks...\n');

    // Add embedding column (1024 dimensions)
    await prisma.$executeRaw`
      ALTER TABLE document_chunks
      ADD COLUMN IF NOT EXISTS embedding vector(1024)
    `;
    console.log('✓ Added embedding column (vector 1024)');

    // Create index for fast similarity search
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
      ON document_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;
    console.log('✓ Created ivfflat index for cosine similarity');

    // Verify it was added
    const columns = await prisma.$queryRaw<Array<{column_name: string; data_type: string; udt_name: string}>>`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    `;

    if (columns.length > 0) {
      console.log('\n✅ Success! Embedding column exists:', columns[0]);
    } else {
      console.error('\n❌ Column was not created!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addEmbeddingColumn();
