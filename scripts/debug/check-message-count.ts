import { prisma } from '../../lib/prisma';

async function checkMessages() {
  const count = await prisma.message.count();
  console.log('Total messages in DB:', count);

  const userCounts = await prisma.message.groupBy({
    by: ['senderId'],
    _count: true,
    orderBy: { _count: { senderId: 'desc' } },
    take: 5
  });

  console.log('\nTop 5 users by message count:');
  for (const user of userCounts) {
    const userInfo = await prisma.user.findUnique({
      where: { id: user.senderId },
      select: { name: true, email: true }
    });
    console.log(`- ${userInfo?.name} (${userInfo?.email}): ${user._count} messages`);
  }

  await prisma.$disconnect();
}

checkMessages();
