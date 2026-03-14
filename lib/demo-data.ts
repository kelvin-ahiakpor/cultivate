/**
 * demo-data.ts
 * Single source of truth for all mock/demo data.
 * Only imported by views that support demoMode — never used in production paths.
 *
 * Exports:
 *   DEMO_AGENTS             — agents-view (dashboard)
 *   DEMO_KNOWLEDGE          — knowledge-view (dashboard)
 *   DEMO_FLAGGED            — flagged-view (dashboard)
 *   DEMO_FLAGGED_CONVOS     — conversation threads shown in flagged-view panel
 *   DEMO_DASHBOARD_CHATS    — chats-view (dashboard, agronomist sees all farmers)
 *   DEMO_FARMER_CHATS       — chats-view (farmer sidebar)
 *   DEMO_FARMER_CONVO_MESSAGES — messages shown when farmer opens a chat in demo
 *   DEMO_SYSTEMS            — systems-view (farmer)
 */

export interface DemoChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp: string;
  confidenceScore?: number;
  isFlagged?: boolean;
  flaggedQuery?: {
    id: string;
    status?: "PENDING" | "VERIFIED" | "CORRECTED";
    farmerReason?: string | null;
    farmerUpdates?: string | null;
    agronomistResponse?: string | null;
    verificationNotes?: string | null;
  };
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export const DEMO_AGENTS = [
  { id: "1", name: "General Farm Advisor", systemPrompt: "You are a knowledgeable agricultural advisor specializing in farming practices in Ghana...", responseStyle: "Friendly and educational", confidenceThreshold: 0.7, isActive: true, conversations: 24, knowledgeBases: 3, version: 1, agronomistId: "demo", organizationId: "demo", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), flaggedQueries: 2 },
  { id: "2", name: "Maize Expert", systemPrompt: "You specialize in maize cultivation, covering planting schedules, pest management...", responseStyle: "Detailed and technical", confidenceThreshold: 0.8, isActive: true, conversations: 12, knowledgeBases: 2, version: 1, agronomistId: "demo", organizationId: "demo", createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(), flaggedQueries: 1 },
  { id: "3", name: "Cocoa Specialist", systemPrompt: "You are an expert in cocoa farming in Ghana, covering nursery management, fermentation, drying...", responseStyle: null, confidenceThreshold: 0.7, isActive: true, conversations: 18, knowledgeBases: 4, version: 2, agronomistId: "demo", organizationId: "demo", createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(), flaggedQueries: 0 },
];

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export const DEMO_KNOWLEDGE = [
  { id: "1", title: "Maize Farming Best Practices", fileName: "maize-guide-2025.pdf", fileType: "PDF", chunkCount: 42, agentName: "General Farm Advisor", uploadedAt: "Jan 28, 2026", referencedInChats: 124 },
  { id: "2", title: "Pest Identification Guide - West Africa", fileName: "pest-id-guide.pdf", fileType: "PDF", chunkCount: 78, agentName: "Pest Management", uploadedAt: "Jan 25, 2026", referencedInChats: 89 },
  { id: "3", title: "Irrigation Scheduling Manual", fileName: "irrigation-manual.docx", fileType: "DOCX", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Jan 20, 2026", referencedInChats: 56 },
  { id: "4", title: "Soil Health & Fertilizer Guide", fileName: "soil-health.pdf", fileType: "PDF", chunkCount: 56, agentName: "Maize Expert", uploadedAt: "Jan 15, 2026", referencedInChats: 203 },
  { id: "5", title: "Cassava Disease Management", fileName: "cassava-diseases.pdf", fileType: "PDF", chunkCount: 64, agentName: "Pest Management", uploadedAt: "Jan 14, 2026", referencedInChats: 72 },
  { id: "6", title: "Tomato Cultivation Guide", fileName: "tomato-guide.pdf", fileType: "PDF", chunkCount: 48, agentName: "General Farm Advisor", uploadedAt: "Jan 12, 2026", referencedInChats: 34 },
  { id: "7", title: "Integrated Pest Management Strategies", fileName: "ipm-strategies.pdf", fileType: "PDF", chunkCount: 92, agentName: "Pest Management", uploadedAt: "Jan 10, 2026", referencedInChats: 167 },
  { id: "8", title: "Maize Hybrid Varieties Guide", fileName: "maize-hybrids.pdf", fileType: "PDF", chunkCount: 38, agentName: "Maize Expert", uploadedAt: "Jan 8, 2026", referencedInChats: 91 },
  { id: "9", title: "Water Conservation Techniques", fileName: "water-conservation.docx", fileType: "DOCX", chunkCount: 27, agentName: "General Farm Advisor", uploadedAt: "Jan 6, 2026", referencedInChats: 45 },
  { id: "10", title: "Organic Fertilizer Production", fileName: "organic-fert.pdf", fileType: "PDF", chunkCount: 44, agentName: "General Farm Advisor", uploadedAt: "Jan 5, 2026", referencedInChats: 78 },
  { id: "11", title: "Post-Harvest Handling Guide", fileName: "post-harvest.pdf", fileType: "PDF", chunkCount: 53, agentName: "General Farm Advisor", uploadedAt: "Jan 3, 2026", referencedInChats: 102 },
  { id: "12", title: "Armyworm Control Strategies", fileName: "armyworm-control.pdf", fileType: "PDF", chunkCount: 35, agentName: "Pest Management", uploadedAt: "Dec 30, 2025", referencedInChats: 88 },
  { id: "13", title: "Rice Production Manual", fileName: "rice-production.pdf", fileType: "PDF", chunkCount: 71, agentName: "General Farm Advisor", uploadedAt: "Dec 28, 2025", referencedInChats: 143 },
  { id: "14", title: "Seed Selection and Storage", fileName: "seed-guide.pdf", fileType: "PDF", chunkCount: 29, agentName: "Maize Expert", uploadedAt: "Dec 26, 2025", referencedInChats: 67 },
  { id: "15", title: "Crop Rotation Best Practices", fileName: "crop-rotation.pdf", fileType: "PDF", chunkCount: 41, agentName: "General Farm Advisor", uploadedAt: "Dec 24, 2025", referencedInChats: 112 },
  { id: "16", title: "Greenhouse Management Guide", fileName: "greenhouse.pdf", fileType: "PDF", chunkCount: 58, agentName: "General Farm Advisor", uploadedAt: "Dec 22, 2025", referencedInChats: 54 },
  { id: "17", title: "Fall Armyworm Identification", fileName: "faw-id.pdf", fileType: "PDF", chunkCount: 33, agentName: "Pest Management", uploadedAt: "Dec 20, 2025", referencedInChats: 134 },
  { id: "18", title: "Maize Weeding Techniques", fileName: "maize-weeding.pdf", fileType: "PDF", chunkCount: 24, agentName: "Maize Expert", uploadedAt: "Dec 18, 2025", referencedInChats: 76 },
  { id: "19", title: "Cocoa Farming in Ghana", fileName: "cocoa-guide.pdf", fileType: "PDF", chunkCount: 67, agentName: "General Farm Advisor", uploadedAt: "Dec 16, 2025", referencedInChats: 189 },
  { id: "20", title: "Poultry Integration on Farms", fileName: "poultry-integration.pdf", fileType: "PDF", chunkCount: 45, agentName: "General Farm Advisor", uploadedAt: "Dec 14, 2025", referencedInChats: 62 },
  { id: "21", title: "Soil pH Management", fileName: "soil-ph.pdf", fileType: "PDF", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Dec 12, 2025", referencedInChats: 95 },
  { id: "22", title: "Biological Pest Control Methods", fileName: "bio-pest-control.pdf", fileType: "PDF", chunkCount: 54, agentName: "Pest Management", uploadedAt: "Dec 10, 2025", referencedInChats: 121 },
  { id: "23", title: "Maize Storage and Preservation", fileName: "maize-storage.pdf", fileType: "PDF", chunkCount: 37, agentName: "Maize Expert", uploadedAt: "Dec 8, 2025", referencedInChats: 108 },
  { id: "24", title: "Okra Production Guide", fileName: "okra-guide.pdf", fileType: "PDF", chunkCount: 28, agentName: "General Farm Advisor", uploadedAt: "Dec 6, 2025", referencedInChats: 43 },
  { id: "25", title: "Compost Making Techniques", fileName: "compost.pdf", fileType: "PDF", chunkCount: 22, agentName: "General Farm Advisor", uploadedAt: "Dec 4, 2025", referencedInChats: 81 },
  { id: "26", title: "Aphid Control Strategies", fileName: "aphid-control.pdf", fileType: "PDF", chunkCount: 26, agentName: "Pest Management", uploadedAt: "Dec 2, 2025", referencedInChats: 73 },
  { id: "27", title: "Soybean Cultivation Manual", fileName: "soybean.pdf", fileType: "PDF", chunkCount: 49, agentName: "General Farm Advisor", uploadedAt: "Nov 30, 2025", referencedInChats: 97 },
  { id: "28", title: "Maize Planting Density Guide", fileName: "planting-density.pdf", fileType: "PDF", chunkCount: 19, agentName: "Maize Expert", uploadedAt: "Nov 28, 2025", referencedInChats: 84 },
  { id: "29", title: "Drip Irrigation Setup", fileName: "drip-irrigation.pdf", fileType: "PDF", chunkCount: 43, agentName: "General Farm Advisor", uploadedAt: "Nov 26, 2025", referencedInChats: 69 },
  { id: "30", title: "Locust Swarm Management", fileName: "locust-management.pdf", fileType: "PDF", chunkCount: 36, agentName: "Pest Management", uploadedAt: "Nov 24, 2025", referencedInChats: 38 },
  { id: "31", title: "Yam Production Techniques", fileName: "yam-production.pdf", fileType: "PDF", chunkCount: 52, agentName: "General Farm Advisor", uploadedAt: "Nov 22, 2025", referencedInChats: 116 },
  { id: "32", title: "Maize Fertilizer Application Schedule", fileName: "maize-fertilizer.pdf", fileType: "PDF", chunkCount: 34, agentName: "Maize Expert", uploadedAt: "Nov 20, 2025", referencedInChats: 152 },
  { id: "33", title: "Banana Farming Guide", fileName: "banana-guide.pdf", fileType: "PDF", chunkCount: 61, agentName: "General Farm Advisor", uploadedAt: "Nov 18, 2025", referencedInChats: 87 },
  { id: "34", title: "Whitefly Control Methods", fileName: "whitefly-control.pdf", fileType: "PDF", chunkCount: 29, agentName: "Pest Management", uploadedAt: "Nov 16, 2025", referencedInChats: 61 },
  { id: "35", title: "Groundnut Cultivation", fileName: "groundnut.pdf", fileType: "PDF", chunkCount: 47, agentName: "General Farm Advisor", uploadedAt: "Nov 14, 2025", referencedInChats: 94 },
  { id: "36", title: "Maize Harvesting Guidelines", fileName: "maize-harvest.pdf", fileType: "PDF", chunkCount: 25, agentName: "Maize Expert", uploadedAt: "Nov 12, 2025", referencedInChats: 128 },
  { id: "37", title: "Pepper Farming Best Practices", fileName: "pepper-guide.pdf", fileType: "PDF", chunkCount: 39, agentName: "General Farm Advisor", uploadedAt: "Nov 10, 2025", referencedInChats: 71 },
  { id: "38", title: "Integrated Nutrient Management", fileName: "nutrient-mgmt.pdf", fileType: "PDF", chunkCount: 55, agentName: "General Farm Advisor", uploadedAt: "Nov 8, 2025", referencedInChats: 139 },
  { id: "39", title: "Stem Borer Management", fileName: "stem-borer.pdf", fileType: "PDF", chunkCount: 32, agentName: "Pest Management", uploadedAt: "Nov 6, 2025", referencedInChats: 92 },
  { id: "40", title: "Maize Drought Tolerance", fileName: "drought-tolerance.pdf", fileType: "PDF", chunkCount: 41, agentName: "Maize Expert", uploadedAt: "Nov 4, 2025", referencedInChats: 156 },
  { id: "41", title: "Plantain Production Manual", fileName: "plantain.pdf", fileType: "PDF", chunkCount: 58, agentName: "General Farm Advisor", uploadedAt: "Nov 2, 2025", referencedInChats: 103 },
  { id: "42", title: "Garden Egg Cultivation", fileName: "garden-egg.pdf", fileType: "PDF", chunkCount: 27, agentName: "General Farm Advisor", uploadedAt: "Oct 31, 2025", referencedInChats: 49 },
  { id: "43", title: "Grasshopper Control Guide", fileName: "grasshopper.pdf", fileType: "PDF", chunkCount: 23, agentName: "Pest Management", uploadedAt: "Oct 29, 2025", referencedInChats: 57 },
  { id: "44", title: "Maize Market Price Analysis", fileName: "price-analysis.pdf", fileType: "PDF", chunkCount: 44, agentName: "Maize Expert", uploadedAt: "Oct 27, 2025", referencedInChats: 214 },
  { id: "45", title: "Cowpea Production Guide", fileName: "cowpea.pdf", fileType: "PDF", chunkCount: 36, agentName: "General Farm Advisor", uploadedAt: "Oct 25, 2025", referencedInChats: 68 },
];

// ─── Flagged query conversation threads ───────────────────────────────────────

export const DEMO_FLAGGED_CONVOS: Record<string, { title: string; messages: DemoChatMessage[] }> = {
  "conv-1": {
    title: "Cassava farming advice",
    messages: [
      { id: "m1", role: "USER", content: "Hello, I need some help with my cassava farm.", timestamp: "10:02 AM" },
      { id: "m2", role: "ASSISTANT", content: "Hello! I'd be happy to help with your cassava farm. What would you like to know? I can assist with planting, pest management, harvesting, soil preparation, and more.", timestamp: "10:02 AM" },
      { id: "m5", role: "USER", content: "In the second month I noticed some of the lower leaves were starting to turn a bit yellow.", timestamp: "10:06 AM" },
      { id: "m6", role: "ASSISTANT", content: "Some lower leaf yellowing can be normal in cassava as the plant matures — older leaves naturally senesce (die off). However, if the yellowing has been spreading or you're seeing it on newer leaves too, that could indicate something else. Is it just the bottom leaves, or is it moving upward?", timestamp: "10:06 AM" },
      { id: "m7", role: "USER", content: "At first it was just the bottom ones. But now I'm seeing it on the middle leaves too. And the new leaves at the top are looking smaller than they should be.", timestamp: "10:08 AM" },
      { id: "m8", role: "ASSISTANT", content: "That's a more concerning pattern. When yellowing moves from lower to upper leaves and new growth appears stunted, it could suggest:\n\n1. **Nitrogen deficiency** — most common cause\n2. **Cassava Mosaic Disease (CMD)** — if you see mosaic-like patches of yellow and green\n3. **Root issues** — waterlogging affecting nutrient uptake\n\nCan you describe the yellowing pattern? Is it uniform yellow, or do you see patches and mottling?", timestamp: "10:09 AM" },
      { id: "m17", role: "USER", content: "My cassava leaves are turning yellow and curling. I sprayed something last week but it's getting worse. What should I do?", timestamp: "10:30 AM", isFlagged: true },
      { id: "m18", role: "ASSISTANT", content: "Based on the symptoms described, this could be Cassava Mosaic Disease (CMD) or a nutrient deficiency. However, I'm not confident enough to provide specific treatment advice without more information.", timestamp: "10:30 AM", confidenceScore: 0.45, isFlagged: true },
    ],
  },
  "conv-2": {
    title: "Tomato fertilizer advice",
    messages: [
      { id: "m1", role: "USER", content: "Good morning, I want to grow tomatoes this dry season. What do I need to know?", timestamp: "8:15 AM" },
      { id: "m2", role: "ASSISTANT", content: "Good morning! Growing tomatoes in the dry season can be productive if you manage water well. Key things: choose heat-tolerant varieties, use consistent irrigation, prepare soil with compost, and space plants 60cm apart.", timestamp: "8:16 AM" },
      { id: "m3", role: "USER", content: "My soil is very sandy. Is that okay for tomatoes?", timestamp: "8:20 AM" },
      { id: "m4", role: "ASSISTANT", content: "Sandy soil has challenges but is workable. Add compost/manure (2-3 wheelbarrows per bed), mulch around plants, and water more frequently in smaller amounts. With your borehole access, you have a big advantage.", timestamp: "8:21 AM" },
      { id: "m7", role: "USER", content: "What is the best fertilizer ratio for tomatoes in sandy soil during the dry season?", timestamp: "8:30 AM", isFlagged: true },
      { id: "m8", role: "ASSISTANT", content: "For tomatoes in sandy soil, a balanced NPK fertilizer is generally recommended, but specific ratios depend on soil test results which I don't have access to.", timestamp: "8:30 AM", confidenceScore: 0.52, isFlagged: true },
    ],
  },
  "conv-3": {
    title: "Maize pest identification",
    messages: [
      { id: "m1", role: "USER", content: "I have a question about my maize. The tassels are coming out now.", timestamp: "2:00 PM" },
      { id: "m2", role: "ASSISTANT", content: "Great, tasseling is an important stage for maize — it means pollination is about to happen. What's your question?", timestamp: "2:00 PM" },
      { id: "m3", role: "USER", content: "I found small black insects on my maize tassels. Are they harmful?", timestamp: "2:03 PM", isFlagged: true },
      { id: "m4", role: "ASSISTANT", content: "These are likely aphids, which are common on maize. They can reduce yield if populations are high. Neem-based sprays can help control them.", timestamp: "2:03 PM", confidenceScore: 0.62, isFlagged: true },
      { id: "m5", role: "USER", content: "How do I make the neem spray? I have neem trees near my farm.", timestamp: "2:06 PM" },
      { id: "m6", role: "ASSISTANT", content: "Pound 1kg of fresh neem leaves, soak in 5 litres of water overnight, strain, add 1 teaspoon liquid soap. Spray early morning or late evening. Reapply after rain every 5-7 days.", timestamp: "2:07 PM" },
    ],
  },
  "conv-4": {
    title: "Okra planting schedule",
    messages: [
      { id: "m1", role: "USER", content: "Hi, I want to plan my vegetable garden. I'm in Greater Accra near Dodowa.", timestamp: "9:00 AM" },
      { id: "m2", role: "ASSISTANT", content: "Great! For Greater Accra, best planting times are late March–early April (major season) or August–September (minor season). Okra germinates in 4-7 days and starts producing pods in 50-60 days.", timestamp: "9:05 AM" },
      { id: "m7", role: "USER", content: "When should I start planting okra this year?", timestamp: "9:12 AM", isFlagged: true },
      { id: "m8", role: "ASSISTANT", content: "Okra can be planted year-round in Ghana, but the best time is at the start of the rainy season (March-April) for optimal germination.", timestamp: "9:12 AM", confidenceScore: 0.58, isFlagged: true },
    ],
  },
};

// ─── Flagged Queries list ─────────────────────────────────────────────────────

export const DEMO_FLAGGED = [
  {
    id: "1",
    farmerName: "Kwame Asante",
    farmerMessage: "My cassava leaves are turning yellow and curling. I sprayed something last week but it's getting worse. What should I do?",
    agentResponse: "Based on the symptoms described, this could be Cassava Mosaic Disease (CMD) or a nutrient deficiency. However, I'm not confident enough to provide specific treatment advice without more information.",
    agentName: "General Farm Advisor",
    confidenceScore: 0.45,
    status: "PENDING",
    createdAt: "2 hours ago",
    conversationId: "conv-1",
    farmerReason: "[2026-03-14T10:15:00.000Z] The agent didn't give me specific steps to take. I need to know what to spray.",
    farmerUpdates: "[2026-03-14T11:30:00.000Z] Also, my neighbor said it could be whiteflies, not mosaic disease. I'm confused now.\n\n[2026-03-14T12:05:00.000Z] Urgent! The yellowing is spreading to more plants. Please help!"
  },
  {
    id: "2",
    farmerName: "Ama Mensah",
    farmerMessage: "What is the best fertilizer ratio for tomatoes in sandy soil during the dry season?",
    agentResponse: "For tomatoes in sandy soil, a balanced NPK fertilizer is generally recommended, but specific ratios depend on soil test results which I don't have access to.",
    agentName: "General Farm Advisor",
    confidenceScore: 0.52,
    status: "PENDING",
    createdAt: "5 hours ago",
    conversationId: "conv-2",
    farmerReason: "[2026-03-14T07:20:00.000Z] Too vague. I need actual numbers like 15-15-15 or 20-10-10. Can't afford soil testing right now."
  },
  {
    id: "3",
    farmerName: "Yaw Boateng",
    farmerMessage: "I found small black insects on my maize tassels. Are they harmful?",
    agentResponse: "These are likely aphids, which are common on maize. They can reduce yield if populations are high. Neem-based sprays can help control them.",
    agentName: "Pest Management",
    confidenceScore: 0.62,
    status: "VERIFIED",
    createdAt: "1 day ago",
    reviewedAt: "12 hours ago",
    verificationNotes: "Agent correctly identified aphids. Response is appropriate for the farmer's level of understanding. Neem spray recommendation is sound organic approach.",
    conversationId: "conv-3",
    farmerReason: "[2026-03-13T14:25:00.000Z] Just checking if this is correct before I buy neem oil. Want to make sure it's really aphids."
  },
  {
    id: "4",
    farmerName: "Efua Owusu",
    farmerMessage: "When should I start planting okra this year?",
    agentResponse: "Okra can be planted year-round in Ghana, but the best time is at the start of the rainy season (March-April) for optimal germination.",
    agronomistResponse: "For the **Greater Accra region specifically**, early **March** planting gives best yields (just before the rains). Here's the recommended timeline:\n\n- **Soil prep**: Late February\n- **Planting**: First week of March\n- **Germination**: 5-7 days\n- **First harvest**: 50-60 days (late April)\n\n**Pro tip**: Soak seeds in water overnight before planting to improve germination rates from 60% to 85%+. The agent's general advice is correct but lacks regional specificity and the soaking technique.",
    agentName: "General Farm Advisor",
    confidenceScore: 0.58,
    status: "CORRECTED",
    createdAt: "3 days ago",
    reviewedAt: "2 days ago",
    conversationId: "conv-4",
    farmerReason: "[2026-03-11T09:10:00.000Z] This seems too general. I'm in Dodowa, Greater Accra. Does the timing change for my area?",
    farmerUpdates: "[2026-03-11T15:45:00.000Z] Also, should I do anything to the seeds before planting?"
  },
  { id: "5", farmerName: "Kofi Adjei", farmerMessage: "How much water does my rice paddy need per day during the vegetative stage?", agentResponse: "Rice paddies generally need standing water of about 5-10cm during the vegetative stage. However, specific water requirements depend on soil type and weather conditions.", agentName: "General Farm Advisor", confidenceScore: 0.48, status: "PENDING", createdAt: "4 hours ago", conversationId: "conv-1" },
  { id: "6", farmerName: "Abena Darkwa", farmerMessage: "My cocoa pods have brown patches and some are turning black. Is this black pod disease?", agentResponse: "Brown and black patches on cocoa pods could indicate Phytophthora pod rot (black pod disease). I would recommend consulting an agronomist for proper diagnosis.", agentName: "General Farm Advisor", confidenceScore: 0.41, status: "PENDING", createdAt: "6 hours ago", conversationId: "conv-2" },
  { id: "7", farmerName: "Kweku Mensah", farmerMessage: "How do I select the best plantain suckers for replanting?", agentResponse: "Choose sword suckers (narrow leaves, pointed tips) rather than water suckers. Sword suckers are more vigorous and produce better yields.", agentName: "General Farm Advisor", confidenceScore: 0.64, status: "VERIFIED", createdAt: "2 days ago", reviewedAt: "1 day ago", verificationNotes: "Correct advice. Sword suckers are indeed preferred over water suckers for plantain propagation in Ghana.", conversationId: "conv-3" },
  { id: "8", farmerName: "Akua Boateng", farmerMessage: "Small white insects are eating my garden eggs. What organic spray can I use?", agentResponse: "White insects on garden eggs are likely whiteflies. You can try using a soap solution spray, but I recommend getting professional advice for organic pest control options.", agronomistResponse: "These are whiteflies. Mix 2 tablespoons of liquid soap with 4 litres of water and spray undersides of leaves early morning. Neem oil (5ml/L) is also very effective. Spray every 5 days for 3 weeks.", agentName: "Pest Management", confidenceScore: 0.55, status: "CORRECTED", createdAt: "4 days ago", reviewedAt: "3 days ago", conversationId: "conv-4" },
  { id: "9", farmerName: "Nana Osei", farmerMessage: "What is the recommended spacing for groundnut planting in the Northern Region?", agentResponse: "Groundnut spacing varies by variety, but a common recommendation is 40-50cm between rows. I'm not fully confident about region-specific spacing for Northern Ghana.", agentName: "General Farm Advisor", confidenceScore: 0.50, status: "PENDING", createdAt: "1 day ago", conversationId: "conv-1" },
  { id: "10", farmerName: "Esi Appiah", farmerMessage: "My pepper leaves are curling and have tiny green insects underneath. What should I do?", agentResponse: "Leaf curling with small green insects underneath suggests aphid infestation. Neem-based sprays can help, and removing heavily infested leaves may slow the spread.", agentName: "Pest Management", confidenceScore: 0.68, status: "VERIFIED", createdAt: "5 days ago", reviewedAt: "4 days ago", verificationNotes: "Agent correctly identified aphids. The advice about neem spray and leaf removal is sound for small-scale pepper farming.", conversationId: "conv-2" },
  { id: "11", farmerName: "Yaw Frimpong", farmerMessage: "My coconut palm leaves are turning yellow from the bottom. Is this lethal yellowing disease?", agentResponse: "Yellowing of lower coconut palm fronds could be caused by several factors including nutrient deficiency or disease. Without seeing the palm, I cannot confirm lethal yellowing.", agronomistResponse: "Lower frond yellowing in coconut palms in Ghana is often magnesium deficiency rather than lethal yellowing. Apply Epsom salt (magnesium sulfate) at 500g per palm around the drip line.", agentName: "General Farm Advisor", confidenceScore: 0.38, status: "CORRECTED", createdAt: "1 week ago", reviewedAt: "5 days ago", conversationId: "conv-3" },
  { id: "12", farmerName: "Adwoa Sarpong", farmerMessage: "I see small holes in my sweet potato vines and the tubers have tunnels inside. What pest is this?", agentResponse: "Damage to sweet potato vines and tubers with tunneling is likely caused by sweet potato weevils. These are a major pest of sweet potatoes in West Africa.", agentName: "Pest Management", confidenceScore: 0.60, status: "PENDING", createdAt: "8 hours ago", conversationId: "conv-4" },
];

// ─── Dashboard Chats (agronomist sees all farmers) ────────────────────────────

export const DEMO_DASHBOARD_CHATS = [
  { id: "1", title: "Help with maize planting schedule", farmerName: "Kwame Asante", agentName: "Maize Expert", lastMessage: "28 minutes ago", messageCount: 12 },
  { id: "2", title: "Tomato leaf curl disease identification", farmerName: "Ama Mensah", agentName: "Pest Management", lastMessage: "2 hours ago", messageCount: 8 },
  { id: "3", title: "Best fertilizer for cocoa seedlings", farmerName: "Yaw Boateng", agentName: "Cocoa Specialist", lastMessage: "3 hours ago", messageCount: 15 },
  { id: "4", title: "Irrigation timing for dry season vegetables", farmerName: "Abena Darkwa", agentName: "General Farm Advisor", lastMessage: "5 hours ago", messageCount: 6 },
  { id: "5", title: "Armyworm outbreak on my maize farm", farmerName: "Kofi Mensah", agentName: "Pest Management", lastMessage: "6 hours ago", messageCount: 22 },
  { id: "6", title: "Soil testing and pH adjustment", farmerName: "Akua Owusu", agentName: "Soil & Fertilizer Guide", lastMessage: "8 hours ago", messageCount: 9 },
  { id: "7", title: "Cassava mosaic disease symptoms", farmerName: "Kwesi Appiah", agentName: "Pest Management", lastMessage: "12 hours ago", messageCount: 4 },
  { id: "8", title: "Spacing recommendations for pepper", farmerName: "Ama Serwaa", agentName: "General Farm Advisor", lastMessage: "1 day ago", messageCount: 7 },
  { id: "9", title: "Post-harvest storage for maize", farmerName: "Yaw Frimpong", agentName: "Maize Expert", lastMessage: "1 day ago", messageCount: 11 },
  { id: "10", title: "Organic pest control methods", farmerName: "Adwoa Nyarko", agentName: "Pest Management", lastMessage: "1 day ago", messageCount: 18 },
  { id: "11", title: "When to apply NPK on cocoa", farmerName: "Kwame Osei", agentName: "Cocoa Specialist", lastMessage: "2 days ago", messageCount: 5 },
  { id: "12", title: "Drip irrigation setup for tomatoes", farmerName: "Efua Mensah", agentName: "Irrigation Advisor", lastMessage: "2 days ago", messageCount: 13 },
  { id: "13", title: "Maize hybrid varieties for northern Ghana", farmerName: "Ibrahim Alhassan", agentName: "Maize Expert", lastMessage: "2 days ago", messageCount: 9 },
  { id: "14", title: "Controlling aphids on cabbage", farmerName: "Fatima Mohammed", agentName: "Pest Management", lastMessage: "3 days ago", messageCount: 6 },
  { id: "15", title: "Composting techniques for small farms", farmerName: "Esi Asante", agentName: "General Farm Advisor", lastMessage: "3 days ago", messageCount: 10 },
  { id: "16", title: "Cocoa pod borer management", farmerName: "Nana Agyei", agentName: "Cocoa Specialist", lastMessage: "3 days ago", messageCount: 14 },
  { id: "17", title: "Rice paddy water management", farmerName: "Abass Yakubu", agentName: "Irrigation Advisor", lastMessage: "4 days ago", messageCount: 8 },
  { id: "18", title: "Okra planting density question", farmerName: "Grace Tetteh", agentName: "General Farm Advisor", lastMessage: "4 days ago", messageCount: 3 },
  { id: "19", title: "Neem oil for organic pest control", farmerName: "Kweku Dadzie", agentName: "Pest Management", lastMessage: "5 days ago", messageCount: 7 },
  { id: "20", title: "Maize stalk borer prevention", farmerName: "Adwoa Poku", agentName: "Maize Expert", lastMessage: "5 days ago", messageCount: 16 },
  { id: "21", title: "Soil amendment for acidic soils", farmerName: "Samuel Tawiah", agentName: "Soil & Fertilizer Guide", lastMessage: "5 days ago", messageCount: 11 },
  { id: "22", title: "Yam minisett propagation technique", farmerName: "Afia Konadu", agentName: "General Farm Advisor", lastMessage: "6 days ago", messageCount: 9 },
  { id: "23", title: "Groundnut aflatoxin prevention", farmerName: "Mustapha Issah", agentName: "General Farm Advisor", lastMessage: "6 days ago", messageCount: 5 },
  { id: "24", title: "Cocoa fermentation best practices", farmerName: "Yaa Asantewaa", agentName: "Cocoa Specialist", lastMessage: "1 week ago", messageCount: 20 },
  { id: "25", title: "Banana bunchy top virus identification", farmerName: "Kofi Adu", agentName: "Pest Management", lastMessage: "1 week ago", messageCount: 4 },
  { id: "26", title: "Cover cropping for soil fertility", farmerName: "Ama Boakye", agentName: "Soil & Fertilizer Guide", lastMessage: "1 week ago", messageCount: 8 },
  { id: "27", title: "Pepper anthracnose treatment", farmerName: "Emmanuel Ansah", agentName: "Pest Management", lastMessage: "1 week ago", messageCount: 6 },
  { id: "28", title: "Maize drying and grading standards", farmerName: "Akosua Mensah", agentName: "Maize Expert", lastMessage: "2 weeks ago", messageCount: 12 },
  { id: "29", title: "Poultry manure as organic fertilizer", farmerName: "Joseph Amoah", agentName: "Soil & Fertilizer Guide", lastMessage: "2 weeks ago", messageCount: 7 },
  { id: "30", title: "Plantain weevil borer control", farmerName: "Vida Antwi", agentName: "Pest Management", lastMessage: "2 weeks ago", messageCount: 10 },
  { id: "31", title: "Soybean inoculation for better yields", farmerName: "Abdul-Razak Wumpini", agentName: "General Farm Advisor", lastMessage: "2 weeks ago", messageCount: 5 },
  { id: "32", title: "Greenhouse tomato cultivation", farmerName: "Mercy Adjei", agentName: "General Farm Advisor", lastMessage: "3 weeks ago", messageCount: 15 },
  { id: "33", title: "Maize streak virus resistant varieties", farmerName: "Daniel Kwarteng", agentName: "Maize Expert", lastMessage: "3 weeks ago", messageCount: 8 },
  { id: "34", title: "Citrus greening disease management", farmerName: "Beatrice Quaye", agentName: "Pest Management", lastMessage: "3 weeks ago", messageCount: 11 },
  { id: "35", title: "Mushroom cultivation on cocoa farms", farmerName: "Francis Kumi", agentName: "Cocoa Specialist", lastMessage: "3 weeks ago", messageCount: 6 },
];

// ─── Farmer Chats (own conversations only) ────────────────────────────────────

export const DEMO_FARMER_CHATS = [
  { id: "1", title: "Hydroponic NFT nutrient solution levels", agentName: "General Farm Advisor", lastMessage: "15 minutes ago", messageCount: 5, systemName: "Hydroponic NFT System - Medium" },
  { id: "2", title: "Drip irrigation schedule for dry season", agentName: "Irrigation Advisor", lastMessage: "1 hour ago", messageCount: 9, systemName: "Drip Irrigation Kit - 0.5 Acre" },
  { id: "3", title: "Greenhouse ventilation not working", agentName: "General Farm Advisor", lastMessage: "2 hours ago", messageCount: 7, systemName: "Greenhouse Structure - 100sqm" },
  { id: "4", title: "Help with maize planting schedule", agentName: "Maize Expert", lastMessage: "3 hours ago", messageCount: 12 },
  { id: "5", title: "Tomato leaf curl disease identification", agentName: "Pest Management", lastMessage: "4 hours ago", messageCount: 8 },
  { id: "6", title: "Best fertilizer for cocoa seedlings", agentName: "Cocoa Specialist", lastMessage: "5 hours ago", messageCount: 15 },
  { id: "7", title: "Irrigation timing for dry season vegetables", agentName: "General Farm Advisor", lastMessage: "6 hours ago", messageCount: 6 },
  { id: "8", title: "Armyworm outbreak on my maize farm", agentName: "Pest Management", lastMessage: "7 hours ago", messageCount: 22 },
  { id: "9", title: "Soil testing and pH adjustment", agentName: "Soil & Fertilizer Guide", lastMessage: "8 hours ago", messageCount: 9 },
  { id: "10", title: "Cassava mosaic disease symptoms", agentName: "Pest Management", lastMessage: "12 hours ago", messageCount: 4 },
  { id: "11", title: "Spacing recommendations for pepper", agentName: "General Farm Advisor", lastMessage: "1 day ago", messageCount: 7 },
  { id: "12", title: "Post-harvest storage for maize", agentName: "Maize Expert", lastMessage: "1 day ago", messageCount: 11 },
  { id: "13", title: "Organic pest control methods", agentName: "Pest Management", lastMessage: "1 day ago", messageCount: 18 },
  { id: "14", title: "When to apply NPK on cocoa", agentName: "Cocoa Specialist", lastMessage: "2 days ago", messageCount: 5 },
  { id: "15", title: "Drip irrigation setup for tomatoes", agentName: "Irrigation Advisor", lastMessage: "2 days ago", messageCount: 13 },
  { id: "16", title: "Maize hybrid varieties for northern Ghana", agentName: "Maize Expert", lastMessage: "2 days ago", messageCount: 9 },
  { id: "17", title: "Controlling aphids on cabbage", agentName: "Pest Management", lastMessage: "3 days ago", messageCount: 6 },
  { id: "18", title: "Composting techniques for small farms", agentName: "General Farm Advisor", lastMessage: "3 days ago", messageCount: 10 },
  { id: "19", title: "Cocoa pod borer management", agentName: "Cocoa Specialist", lastMessage: "3 days ago", messageCount: 14 },
  { id: "20", title: "Rice paddy water management", agentName: "Irrigation Advisor", lastMessage: "4 days ago", messageCount: 8 },
  { id: "21", title: "Okra planting density question", agentName: "General Farm Advisor", lastMessage: "4 days ago", messageCount: 3 },
  { id: "22", title: "Neem oil for organic pest control", agentName: "Pest Management", lastMessage: "5 days ago", messageCount: 7 },
  { id: "23", title: "Maize stalk borer prevention", agentName: "Maize Expert", lastMessage: "5 days ago", messageCount: 16 },
  { id: "24", title: "Soil amendment for acidic soils", agentName: "Soil & Fertilizer Guide", lastMessage: "5 days ago", messageCount: 11 },
  { id: "25", title: "Yam minisett propagation technique", agentName: "General Farm Advisor", lastMessage: "6 days ago", messageCount: 9 },
  { id: "26", title: "Groundnut aflatoxin prevention", agentName: "General Farm Advisor", lastMessage: "6 days ago", messageCount: 5 },
  { id: "27", title: "Cocoa fermentation best practices", agentName: "Cocoa Specialist", lastMessage: "1 week ago", messageCount: 20 },
  { id: "28", title: "Banana bunchy top virus identification", agentName: "Pest Management", lastMessage: "1 week ago", messageCount: 4 },
  { id: "29", title: "Cover cropping for soil fertility", agentName: "Soil & Fertilizer Guide", lastMessage: "1 week ago", messageCount: 8 },
  { id: "30", title: "Pepper anthracnose treatment", agentName: "Pest Management", lastMessage: "1 week ago", messageCount: 6 },
  { id: "31", title: "Maize drying and grading standards", agentName: "Maize Expert", lastMessage: "2 weeks ago", messageCount: 12 },
  { id: "32", title: "Poultry manure as organic fertilizer", agentName: "Soil & Fertilizer Guide", lastMessage: "2 weeks ago", messageCount: 7 },
  { id: "33", title: "Plantain weevil borer control", agentName: "Pest Management", lastMessage: "2 weeks ago", messageCount: 10 },
  { id: "34", title: "Soybean inoculation for better yields", agentName: "General Farm Advisor", lastMessage: "2 weeks ago", messageCount: 5 },
  { id: "35", title: "Greenhouse tomato cultivation", agentName: "General Farm Advisor", lastMessage: "3 weeks ago", messageCount: 15 },
  { id: "36", title: "Maize streak virus resistant varieties", agentName: "Maize Expert", lastMessage: "3 weeks ago", messageCount: 8 },
  { id: "37", title: "Citrus greening disease management", agentName: "Pest Management", lastMessage: "3 weeks ago", messageCount: 11 },
  { id: "38", title: "Mushroom cultivation on cocoa farms", agentName: "Cocoa Specialist", lastMessage: "3 weeks ago", messageCount: 6 },
];

// Messages shown when a farmer opens a chat in demo mode (keyed by chat ID)
export const DEMO_FARMER_CONVO_MESSAGES: Record<string, DemoChatMessage[]> = {
  // Chat 1: Hydroponic NFT — VERIFIED with verification notes
  "1": [
    { id: "m1", role: "USER", content: "Good morning! My NFT system EC reading is at 2.8. Is that too high for lettuce?", timestamp: "9:15 AM" },
    { id: "m2", role: "ASSISTANT", content: "Good morning! For lettuce in NFT, the ideal EC is typically between 1.2-2.0 mS/cm. An EC of 2.8 is quite high and could stress your plants. I'd recommend diluting your nutrient solution gradually to bring it down to the 1.5-1.8 range.", timestamp: "9:16 AM", confidenceScore: 0.92 },
    { id: "m3", role: "USER", content: "Okay got it. Should I just add water directly or drain some and refill?", timestamp: "9:18 AM" },
    { id: "m4", role: "ASSISTANT", content: "The best approach is to partially drain (about 30-40%) and refill with fresh water. This way you avoid shocking the plants with a sudden change. Monitor the EC as you add water, and stop when you reach your target range.", timestamp: "9:19 AM", confidenceScore: 0.88 },
    { id: "m5", role: "USER", content: "Perfect. One more thing — my pH keeps drifting up to 7.2 even after I adjust it. What's causing that?", timestamp: "9:22 AM" },
    {
      id: "m6",
      role: "ASSISTANT",
      content: "pH drift upward is common in NFT systems and usually caused by:\n\n1. **Nutrient uptake imbalance** — plants absorb more hydrogen ions than hydroxide\n2. **Hard water** — high alkalinity in your water source\n3. **Algae growth** — photosynthesis raises pH during the day\n\nFor lettuce, target pH 5.5-6.5. Use pH Down (phosphoric acid) to adjust, and check twice daily until it stabilizes.",
      timestamp: "9:23 AM",
      confidenceScore: 0.68,
      isFlagged: true,
      flaggedQuery: {
        id: "fq-demo-1",
        status: "VERIFIED",
        farmerReason: "[2026-03-13T09:25:00.000Z] The pH advice seems generic. I need to know if this is specific to my Farmitecture NFT system.",
        farmerUpdates: "[2026-03-13T14:30:00.000Z] Actually never mind, I checked the manual and this matches what it says. Good advice!",
        verificationNotes: "Correct advice. pH drift is normal in NFT systems, especially with hard water. The 5.5-6.5 range is standard for lettuce cultivation."
      }
    },
    { id: "m7", role: "USER", content: "Thank you! I'll try adjusting it now and keep monitoring.", timestamp: "9:25 AM" },
  ],

  // Chat 2: Drip Irrigation — CORRECTED with agronomist response
  "2": [
    { id: "m1", role: "USER", content: "Hi, I just installed my drip irrigation kit. How often should I run it during the dry season?", timestamp: "2:10 PM" },
    { id: "m2", role: "ASSISTANT", content: "Great question! For the dry season, frequency depends on your crop and soil type. For vegetables in sandy soil, aim for 2-3 times daily for 15-20 minutes. For clay soil, once daily for 30-45 minutes is usually enough.", timestamp: "2:11 PM", confidenceScore: 0.85 },
    { id: "m3", role: "USER", content: "I'm growing tomatoes and peppers in loamy soil. What would you recommend?", timestamp: "2:13 PM" },
    {
      id: "m4",
      role: "ASSISTANT",
      content: "For tomatoes and peppers in loamy soil during the dry season, water once every 2-3 days for about 45 minutes to 1 hour. This should provide enough moisture without waterlogging.",
      timestamp: "2:14 PM",
      confidenceScore: 0.55,
      isFlagged: true,
      flaggedQuery: {
        id: "fq-demo-2",
        status: "CORRECTED",
        farmerReason: "[2026-03-12T14:15:00.000Z] This doesn't sound right. I read that tomatoes need daily watering in the dry season, not every 2-3 days.",
        agronomistResponse: "The farmer is correct. For **tomatoes during the dry season**, daily watering is essential, especially during fruiting. The correct schedule for loamy soil would be:\n\n- **Vegetative stage**: Once daily, early morning, 30-40 minutes\n- **Flowering & fruiting**: Twice daily (morning + late afternoon), 20-30 minutes each\n- **Peppers**: Once daily, 25-35 minutes (less water than tomatoes)\n\nMonitor soil moisture at 15cm depth — it should feel slightly moist but not saturated. Adjust timing based on plant response and weather conditions."
      }
    },
    { id: "m5", role: "USER", content: "Hmm, let me check that. I thought tomatoes needed more frequent watering...", timestamp: "2:16 PM" },
  ],

  // Chat 3: Greenhouse ventilation — PENDING with multiple flag updates
  "3": [
    { id: "m1", role: "USER", content: "My greenhouse is getting too hot during the day — sometimes hitting 42°C. The vents are open but it's not helping much.", timestamp: "11:05 AM" },
    { id: "m2", role: "ASSISTANT", content: "42°C is definitely too hot for most crops! Even with vents open, greenhouses can overheat in Ghana's climate. Have you considered adding shade cloth? A 40-50% shade net can reduce temperatures by 5-8°C without blocking too much light.", timestamp: "11:06 AM", confidenceScore: 0.90 },
    { id: "m3", role: "USER", content: "I haven't tried shade cloth yet. Would that affect my tomato yields?", timestamp: "11:08 AM" },
    {
      id: "m4",
      role: "ASSISTANT",
      content: "Shade cloth at 40-50% won't significantly reduce tomato yields if your greenhouse is already getting excessive heat. In fact, it can improve yields by preventing heat stress, blossom drop, and sunscald on fruits.",
      timestamp: "11:09 AM",
      confidenceScore: 0.63,
      isFlagged: true,
      flaggedQuery: {
        id: "fq-demo-3",
        status: "PENDING",
        farmerReason: "[2026-03-14T11:12:00.000Z] I'm not sure this is right. My neighbor uses 70% shade and his tomatoes are doing fine.",
        farmerUpdates: "[2026-03-14T11:45:00.000Z] Also, wouldn't reducing light affect photosynthesis and reduce yields anyway?\n\n[2026-03-14T13:20:00.000Z] I tried looking this up but I'm getting conflicting information. Need expert clarification please!"
      }
    },
    { id: "m5", role: "USER", content: "Okay I'll look into getting shade cloth. Any other tips for cooling?", timestamp: "11:12 AM" },
    { id: "m6", role: "ASSISTANT", content: "Yes! Other cooling strategies:\n\n1. **Misting/fogging** — evaporative cooling can drop temps by 3-5°C\n2. **Whitewash** — temporary lime wash on roof during hottest months\n3. **Improved cross-ventilation** — add side vents if you only have roof vents\n4. **Mulching** — keeps root zone cool even if air temp is high\n\nCombining 2-3 of these methods works best!", timestamp: "11:13 AM", confidenceScore: 0.87 },
  ],

  // Default fallback for other chats
  "default": [
    { id: "m1", role: "USER", content: "Hello, I need some help with my farm.", timestamp: "10:02 AM" },
    { id: "m2", role: "ASSISTANT", content: "Hello! I'd be happy to help. What would you like to know?", timestamp: "10:02 AM" },
  ],
};

// ─── Farmer Systems ───────────────────────────────────────────────────────────

export const DEMO_SYSTEMS = [
  { id: "sys-1", name: "Hydroponic NFT System - Medium", type: "Hydroponic System", purchaseDate: "2025-11-15", status: "ACTIVE" as const, description: "Nutrient Film Technique (NFT) hydroponic setup for leafy greens", specifications: { size: "4m x 1.2m", capacity: "60 plant sites", material: "Food-grade PVC pipes" }, installationDate: "2025-11-20", warrantyUntil: "2026-11-15" },
  { id: "sys-2", name: "Drip Irrigation Kit - 0.5 Acre", type: "Irrigation System", purchaseDate: "2026-01-10", status: "ACTIVE" as const, description: "Complete drip irrigation system with timer and filters", specifications: { capacity: "0.5 acre coverage", material: "UV-resistant polyethylene tubing" }, installationDate: "2026-01-15", warrantyUntil: "2027-01-10" },
  { id: "sys-3", name: "Vertical Garden Tower", type: "Vertical Farming", purchaseDate: "2026-02-01", status: "PENDING_SETUP" as const, description: "Stackable modular vertical garden for herbs and small vegetables", specifications: { size: "1.5m height", capacity: "40 plant pockets", material: "Recycled plastic modules" } },
  { id: "sys-4", name: "Greenhouse Structure - 100sqm", type: "Greenhouse", purchaseDate: "2025-09-20", status: "ACTIVE" as const, description: "UV-treated polyethylene greenhouse with ventilation", specifications: { size: "10m x 10m x 3m", material: "Galvanized steel frame, 200-micron PE cover" }, installationDate: "2025-10-05", warrantyUntil: "2027-09-20" },
  { id: "sys-5", name: "Solar Water Pump - 1HP", type: "Water Pump", purchaseDate: "2025-12-10", status: "ACTIVE" as const, description: "Solar-powered submersible pump for irrigation", specifications: { capacity: "30,000 liters/day", material: "Stainless steel impeller" }, installationDate: "2025-12-15", warrantyUntil: "2027-12-10" },
];
