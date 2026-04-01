/**
 * One-time script to fix KBs that lost agent assignments during schema migration
 * Assigns all unassigned KBs to the first available agent
 */
import "dotenv/config";
import { prisma } from "./lib/prisma";

async function fixOldKBs() {
  // Find KBs with no agent assignments
  const kbs = await prisma.knowledgeBase.findMany({
    include: {
      agents: true,
    },
  });

  const unassignedKBs = kbs.filter((kb) => kb.agents.length === 0);

  if (unassignedKBs.length === 0) {
    console.log("✅ No unassigned KBs found");
    return;
  }

  console.log(`Found ${unassignedKBs.length} unassigned KBs`);

  // Get first agent in the org
  const firstAgent = await prisma.agent.findFirst({
    where: {
      organizationId: unassignedKBs[0].organizationId,
    },
  });

  if (!firstAgent) {
    console.error("❌ No agents found in organization");
    return;
  }

  console.log(`Assigning to agent: ${firstAgent.name}`);

  // Create assignments
  for (const kb of unassignedKBs) {
    await prisma.agentKnowledgeBase.create({
      data: {
        agentId: firstAgent.id,
        knowledgeBaseId: kb.id,
        isPrimary: true,
      },
    });
    console.log(`✅ Assigned "${kb.title}" to ${firstAgent.name}`);
  }

  console.log("✅ All KBs assigned");
}

fixOldKBs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
