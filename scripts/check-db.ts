import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function checkDatabase() {
  try {
    console.log('Checking document_chunks table structure...\n');

    // Check table columns
    const columns = await prisma.$queryRaw<Array<{column_name: string; data_type: string; udt_name: string}>>`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'document_chunks'
      ORDER BY ordinal_position
    `;
    console.log('Columns in document_chunks:', columns);

    // Check if embedding column exists
    const embeddingCol = columns.find(c => c.column_name === 'embedding');
    console.log('\nEmbedding column:', embeddingCol || 'NOT FOUND');

    // Check confidence scores in messages
    console.log('\n\nChecking confidence scores in messages...\n');
    const messages = await prisma.message.findMany({
      where: { role: 'ASSISTANT' },
      select: {
        id: true,
        confidenceScore: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Recent assistant messages:', messages);

    const withScores = messages.filter(m => m.confidenceScore !== null);
    console.log(`\n${withScores.length}/${messages.length} messages have confidence scores`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
