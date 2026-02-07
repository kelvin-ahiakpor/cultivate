"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Flag, Search, CheckCircle, ChevronDown, Send, X, Pencil, ExternalLink, AlertTriangle, MessageCircle, User, ArrowLeft } from "lucide-react";
import { SproutIcon } from "@/components/send-icons";

type FlagStatus = "all" | "PENDING" | "VERIFIED" | "CORRECTED";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp: string;
  confidenceScore?: number;
  isFlagged?: boolean;
}

interface FlaggedQuery {
  id: string;
  farmerName: string;
  farmerMessage: string;
  agentResponse: string;
  agentName: string;
  confidenceScore: number;
  status: "PENDING" | "VERIFIED" | "CORRECTED";
  createdAt: string;
  reviewedAt?: string;
  agronomistResponse?: string;
  verificationNotes?: string;
  conversationId: string;
}

// Sample conversations linked to flagged queries
const sampleConversations: Record<string, { title: string; messages: ChatMessage[] }> = {
  "conv-1": {
    title: "Cassava farming advice",
    messages: [
      {
        id: "m1",
        role: "USER",
        content: "Hello, I need some help with my cassava farm.",
        timestamp: "10:02 AM",
      },
      {
        id: "m2",
        role: "ASSISTANT",
        content: "Hello! I'd be happy to help with your cassava farm. What would you like to know? I can assist with planting, pest management, harvesting, soil preparation, and more.",
        timestamp: "10:02 AM",
      },
      {
        id: "m3",
        role: "USER",
        content: "I planted some new cassava stems about 3 months ago. The first month everything looked great, the stems sprouted well and leaves were coming in nicely.",
        timestamp: "10:04 AM",
      },
      {
        id: "m4",
        role: "ASSISTANT",
        content: "That sounds like a good start! Three months is when cassava really begins establishing its root system. How are the plants looking now? Are you noticing any changes in growth or leaf appearance?",
        timestamp: "10:04 AM",
      },
      {
        id: "m5",
        role: "USER",
        content: "Yes that is exactly why I am contacting you. In the second month I noticed some of the lower leaves were starting to turn a bit yellow. I thought maybe it was just normal so I didn't worry too much.",
        timestamp: "10:06 AM",
      },
      {
        id: "m6",
        role: "ASSISTANT",
        content: "Some lower leaf yellowing can be normal in cassava as the plant matures — older leaves naturally senesce (die off) as the plant directs energy to new growth. However, if the yellowing has been spreading or you're seeing it on newer leaves too, that could indicate something else. Can you tell me more about the pattern? Is it just the bottom leaves, or is it moving upward?",
        timestamp: "10:06 AM",
      },
      {
        id: "m7",
        role: "USER",
        content: "At first it was just the bottom ones yes. But now I'm seeing it on the middle leaves too. And the new leaves at the top are looking smaller than they should be.",
        timestamp: "10:08 AM",
      },
      {
        id: "m8",
        role: "ASSISTANT",
        content: "That's a more concerning pattern. When yellowing moves from lower to upper leaves and new growth appears stunted, it could suggest a few things:\n\n1. **Nitrogen deficiency** — The most common cause of progressive yellowing from bottom to top\n2. **Cassava Mosaic Disease (CMD)** — If you're seeing a mosaic-like pattern (patches of yellow and green)\n3. **Root issues** — Waterlogging or poor drainage affecting nutrient uptake\n\nCan you describe the yellowing pattern on individual leaves? Is it uniform yellow, or do you see patches and mottling? Also, what type of soil do you have, and have you applied any fertilizer?",
        timestamp: "10:09 AM",
      },
      {
        id: "m9",
        role: "USER",
        content: "I haven't applied any fertilizer. The soil is mostly sandy. And now that you mention it, some of the leaves do have those patches you described. Like yellow and green mixed together. Not uniform yellow.",
        timestamp: "10:12 AM",
      },
      {
        id: "m10",
        role: "ASSISTANT",
        content: "The mosaic pattern (yellow and green patches) on the leaves is a significant symptom. Combined with the stunted new growth, this is characteristic of **Cassava Mosaic Disease (CMD)**, which is caused by a virus transmitted by whiteflies.\n\nHere's what I'd recommend:\n\n1. **Check for whiteflies** — Look under the leaves for tiny white insects. They spread the virus from plant to plant.\n2. **Remove severely affected plants** — Plants showing strong mosaic symptoms should be uprooted and burned (not composted) to prevent spread.\n3. **Don't use cuttings from infected plants** — This is how CMD spreads most easily between seasons.\n4. **For future planting**, use CMD-resistant varieties like IFAD, Bankye Hemaa, or Ampong if available in your area.\n\nHave you noticed any small white insects on or near your plants?",
        timestamp: "10:13 AM",
      },
      {
        id: "m11",
        role: "USER",
        content: "I have seen some small white flies yes, they come around in the afternoon mostly. This is very worrying. How much of my farm could be affected?",
        timestamp: "10:16 AM",
      },
      {
        id: "m12",
        role: "ASSISTANT",
        content: "I understand your concern. The spread of CMD depends on several factors:\n\n- **Whitefly population** — If they're active, they can spread the virus to neighboring plants relatively quickly\n- **Plant spacing** — Closer plants means easier transmission\n- **Variety susceptibility** — Some local varieties are more vulnerable than others\n\nTo assess the damage:\n1. Walk through your entire field and count how many plants show symptoms (yellow mosaic, leaf curling, stunted growth)\n2. Mark the affected plants so you can track if it's spreading\n\nTypically, if caught early and managed, you can save a significant portion of your crop. The key actions right now are removing the worst-affected plants and controlling the whitefly population. How large is your cassava plot?",
        timestamp: "10:17 AM",
      },
      {
        id: "m13",
        role: "USER",
        content: "It's about 2 acres. I walked through yesterday and I would say maybe 15-20 plants are showing the yellow patches out of maybe 200 or so plants.",
        timestamp: "10:20 AM",
      },
      {
        id: "m14",
        role: "ASSISTANT",
        content: "OK, so about 7-10% of your plants are showing symptoms — that's actually quite manageable if you act now. Here's a plan:\n\n**Immediate actions:**\n1. Uproot and burn the 15-20 affected plants. Don't leave them in the field.\n2. Apply neem oil spray to the remaining healthy plants to deter whiteflies. Mix about 5ml of neem oil per litre of water and spray in the early morning or late evening.\n\n**This week:**\n3. Check for any new symptoms every 2-3 days\n4. Clear weeds around the cassava — weeds can harbour whiteflies\n\n**For sandy soil without fertilizer:**\n5. Consider applying a light dose of NPK 15-15-15 fertilizer to help the healthy plants grow stronger and resist stress\n\nWould you like me to explain any of these steps in more detail?",
        timestamp: "10:21 AM",
      },
      {
        id: "m15",
        role: "USER",
        content: "Thank you this is very helpful. One more thing — I also sprayed some chemical last week, my neighbor gave it to me. He said it works for everything. But the leaves seem to be getting worse since I sprayed. Could the spray have caused damage?",
        timestamp: "10:25 AM",
      },
      {
        id: "m16",
        role: "ASSISTANT",
        content: "That's an important detail. Using an unknown chemical can potentially cause **phytotoxicity** (chemical burn) on plants, especially if:\n\n- The concentration was too strong\n- It was applied during hot afternoon sun\n- It wasn't meant for cassava\n\nSome herbicides, in particular, can cause leaf curling and yellowing that mimics disease symptoms. Do you know the name of the chemical or can you check the container? Even a partial name would help.\n\nIn the meantime, I'd recommend:\n- **Stop applying that chemical** until we know what it is\n- **Water the plants well** to help flush any chemical residue from the soil\n- Observe whether the newest leaves (that grew after spraying) look different from the older sprayed ones\n\nThe curling and yellowing could be a combination of CMD and spray damage, which would explain why things got worse after spraying.",
        timestamp: "10:26 AM",
      },
      {
        id: "m17",
        role: "USER",
        content: "My cassava leaves are turning yellow and curling. I sprayed something last week but it's getting worse. What should I do?",
        timestamp: "10:30 AM",
        isFlagged: true,
      },
      {
        id: "m18",
        role: "ASSISTANT",
        content: "Based on the symptoms described, this could be Cassava Mosaic Disease (CMD) or a nutrient deficiency. However, I'm not confident enough to provide specific treatment advice without more information.",
        timestamp: "10:30 AM",
        confidenceScore: 0.45,
        isFlagged: true,
      },
      {
        id: "m19",
        role: "USER",
        content: "I just told you about all of this. Can you give me a clear plan to save my farm?",
        timestamp: "10:32 AM",
      },
      {
        id: "m20",
        role: "ASSISTANT",
        content: "You're right, I apologize for the confusion. Based on everything we've discussed, here's your clear action plan:\n\n**Today:**\n- Remove and burn the 15-20 affected cassava plants\n- Stop using the unknown chemical your neighbor gave you\n- Water your plants well to flush any chemical residue\n\n**This week:**\n- Prepare neem oil spray (5ml per litre of water) and apply to all remaining plants in the early morning\n- Clear weeds around your cassava plot\n- Check every 2-3 days for new symptoms\n\n**Next month:**\n- Apply NPK 15-15-15 to strengthen healthy plants\n- If you can identify the chemical you sprayed, let me know so we can assess any lasting damage\n- Source CMD-resistant varieties for your next planting season\n\nYour farm is at about 7-10% infection which is still very manageable. Acting quickly is key.",
        timestamp: "10:33 AM",
      },
    ],
  },
  "conv-2": {
    title: "Tomato fertilizer advice",
    messages: [
      {
        id: "m1",
        role: "USER",
        content: "Good morning, I want to grow tomatoes this dry season. What do I need to know?",
        timestamp: "8:15 AM",
      },
      {
        id: "m2",
        role: "ASSISTANT",
        content: "Good morning! Growing tomatoes in the dry season can actually be quite productive if you manage water well. Here are the key things to consider:\n\n1. **Variety selection** — Choose heat-tolerant varieties like Pectomech or local improved varieties\n2. **Irrigation** — You'll need consistent watering, ideally drip irrigation\n3. **Soil preparation** — Add compost or manure before transplanting\n4. **Spacing** — 60cm between plants, 90cm between rows\n\nWhat's your current setup? Do you have access to irrigation?",
        timestamp: "8:16 AM",
      },
      {
        id: "m3",
        role: "USER",
        content: "I have a small borehole for water so I can irrigate. My soil is very sandy though. People say sandy soil is not good for tomatoes. Is that true?",
        timestamp: "8:20 AM",
      },
      {
        id: "m4",
        role: "ASSISTANT",
        content: "Sandy soil has some challenges but it's definitely workable for tomatoes! Here's what you need to know:\n\n**Challenges with sandy soil:**\n- Drains water very quickly — nutrients wash away faster\n- Holds less moisture — plants may stress between waterings\n- Lower organic matter — fewer natural nutrients\n\n**How to improve it:**\n- Add plenty of organic matter (compost, manure) — aim for 2-3 wheelbarrows per bed\n- Mulch around plants to retain moisture\n- Water more frequently but in smaller amounts\n- Use fertilizer in split applications rather than all at once\n\nWith your borehole access, you have a big advantage. The key with sandy soil is feeding the plants consistently through the season rather than all at once.",
        timestamp: "8:21 AM",
      },
      {
        id: "m5",
        role: "USER",
        content: "Okay that makes sense. What about fertilizer? Someone told me to use NPK but I don't know the right ratio.",
        timestamp: "8:25 AM",
      },
      {
        id: "m6",
        role: "ASSISTANT",
        content: "Good question. NPK fertilizer is definitely what you want for tomatoes. The ratio depends on the growth stage:\n\n**At transplanting (week 1):**\n- Apply NPK 15-15-15 (balanced) at about 10g per plant\n- This supports root establishment\n\n**At flowering (weeks 4-6):**\n- Switch to NPK with higher Phosphorus and Potassium, like 10-20-20 if available\n- This promotes fruiting\n\nFor sandy soil, I'd also recommend adding Calcium (eg. agricultural lime) to prevent blossom end rot, which is common in sandy soils.\n\nHowever, the most accurate recommendation would come from a soil test. Have you had your soil tested before?",
        timestamp: "8:26 AM",
      },
      {
        id: "m7",
        role: "USER",
        content: "What is the best fertilizer ratio for tomatoes in sandy soil during the dry season?",
        timestamp: "8:30 AM",
        isFlagged: true,
      },
      {
        id: "m8",
        role: "ASSISTANT",
        content: "For tomatoes in sandy soil, a balanced NPK fertilizer is generally recommended, but specific ratios depend on soil test results which I don't have access to.",
        timestamp: "8:30 AM",
        confidenceScore: 0.52,
        isFlagged: true,
      },
      {
        id: "m9",
        role: "USER",
        content: "You just told me some ratios though. Can you repeat what you said about 15-15-15?",
        timestamp: "8:33 AM",
      },
      {
        id: "m10",
        role: "ASSISTANT",
        content: "Of course! Here's the fertilizer schedule I recommended for your tomatoes in sandy soil:\n\n**Stage 1 — At transplanting:**\n- Use NPK 15-15-15 at 10g per plant\n- Apply in a ring about 10cm from the stem\n\n**Stage 2 — At flowering (4-6 weeks later):**\n- Switch to higher P and K, like 10-20-20\n- Apply 15g per plant\n\n**Stage 3 — During fruiting:**\n- Side dress with potassium-rich fertilizer\n- Add calcium (lime) to prevent blossom end rot\n\nRemember, with sandy soil you should split applications into smaller, more frequent doses since nutrients leach quickly. Water after applying fertilizer.",
        timestamp: "8:34 AM",
      },
    ],
  },
  "conv-3": {
    title: "Maize pest identification",
    messages: [
      {
        id: "m1",
        role: "USER",
        content: "I have a question about my maize. The tassels are coming out now.",
        timestamp: "2:00 PM",
      },
      {
        id: "m2",
        role: "ASSISTANT",
        content: "Great, tasseling is an important stage for maize — it means pollination is about to happen or is already underway. What's your question about the tassels?",
        timestamp: "2:00 PM",
      },
      {
        id: "m3",
        role: "USER",
        content: "I found small black insects on my maize tassels. Are they harmful?",
        timestamp: "2:03 PM",
        isFlagged: true,
      },
      {
        id: "m4",
        role: "ASSISTANT",
        content: "These are likely aphids, which are common on maize. They can reduce yield if populations are high. Neem-based sprays can help control them.",
        timestamp: "2:03 PM",
        confidenceScore: 0.62,
        isFlagged: true,
      },
      {
        id: "m5",
        role: "USER",
        content: "How do I make the neem spray? I have neem trees near my farm.",
        timestamp: "2:06 PM",
      },
      {
        id: "m6",
        role: "ASSISTANT",
        content: "Perfect, having neem trees nearby is very useful! Here's how to make a basic neem spray:\n\n**Neem leaf extract:**\n1. Pick about 1kg of fresh neem leaves\n2. Crush or pound them\n3. Soak in 5 litres of water overnight (8-12 hours)\n4. Strain through a cloth to remove leaf pieces\n5. Add a small amount of liquid soap (1 teaspoon) — this helps the spray stick to the insects\n6. Spray on the tassels and upper leaves in the early morning or late evening\n\n**Important tips:**\n- Don't spray in direct hot sun — it can burn the leaves\n- Reapply after rain\n- Spray every 5-7 days until aphid numbers decrease\n\nIf you have neem seeds, those are even more potent. Would you like instructions for neem seed kernel extract too?",
        timestamp: "2:07 PM",
      },
    ],
  },
  "conv-4": {
    title: "Okra planting schedule",
    messages: [
      {
        id: "m1",
        role: "USER",
        content: "Hi, I want to plan my vegetable garden for this year. I'm thinking of growing okra.",
        timestamp: "9:00 AM",
      },
      {
        id: "m2",
        role: "ASSISTANT",
        content: "Hi! Okra is a great choice — it grows well in Ghana's climate and there's always good market demand. Are you planning a small home garden or a larger commercial plot?",
        timestamp: "9:01 AM",
      },
      {
        id: "m3",
        role: "USER",
        content: "It's for my family mostly but if I get extra I sell some at the market. Maybe about half an acre.",
        timestamp: "9:04 AM",
      },
      {
        id: "m4",
        role: "ASSISTANT",
        content: "Half an acre is a good size for okra — you'll definitely have enough for your family and some surplus for the market. Let's plan this out.\n\nFirst, what region are you in? This matters for timing because rainfall patterns vary across Ghana.",
        timestamp: "9:05 AM",
      },
      {
        id: "m5",
        role: "USER",
        content: "I'm in the Greater Accra region. Near Dodowa.",
        timestamp: "9:08 AM",
      },
      {
        id: "m6",
        role: "ASSISTANT",
        content: "Good to know! Greater Accra has a bimodal rainfall pattern — the major rainy season is April-July and the minor one is September-November. For Dodowa area, I'd suggest:\n\n**Best planting times:**\n- **Major season:** Plant in late March to early April\n- **Minor season:** Plant in August to early September\n\nOkra germinates quickly (4-7 days) and starts producing pods in about 50-60 days. So if you plant in early April, you'd be harvesting from June onwards.",
        timestamp: "9:09 AM",
      },
      {
        id: "m7",
        role: "USER",
        content: "When should I start planting okra this year?",
        timestamp: "9:12 AM",
        isFlagged: true,
      },
      {
        id: "m8",
        role: "ASSISTANT",
        content: "Okra can be planted year-round in Ghana, but the best time is at the start of the rainy season (March-April) for optimal germination.",
        timestamp: "9:12 AM",
        confidenceScore: 0.58,
        isFlagged: true,
      },
      {
        id: "m9",
        role: "USER",
        content: "You already told me about the Greater Accra timing. Should I soak the seeds before planting?",
        timestamp: "9:15 AM",
      },
      {
        id: "m10",
        role: "ASSISTANT",
        content: "Yes, soaking okra seeds is highly recommended! Okra seeds have a hard coat that can slow germination. Here's what to do:\n\n1. **Soak seeds in warm water** for 12-24 hours before planting\n2. This can improve germination rate from about 60% to over 85%\n3. Discard any seeds that float — they're likely not viable\n\n**Planting depth:** About 2-3cm deep\n**Spacing:** 30cm between plants, 60cm between rows\n\nFor your half-acre near Dodowa, you'd need roughly 2-3kg of seed. The Clemson Spineless and Agbagoma varieties do very well in the Greater Accra area.",
        timestamp: "9:16 AM",
      },
    ],
  },
};

// Mock data
const initialFlagged: FlaggedQuery[] = [
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
    verificationNotes: "Agent correctly identified aphids. Response is appropriate for the farmer's level of understanding.",
    conversationId: "conv-3",
  },
  {
    id: "4",
    farmerName: "Efua Owusu",
    farmerMessage: "When should I start planting okra this year?",
    agentResponse: "Okra can be planted year-round in Ghana, but the best time is at the start of the rainy season (March-April) for optimal germination.",
    agronomistResponse: "In the Greater Accra region specifically, early March planting gives best yields. Soak seeds overnight before planting for better germination rates. The agent's general advice is correct but lacks regional specificity.",
    agentName: "General Farm Advisor",
    confidenceScore: 0.58,
    status: "CORRECTED",
    createdAt: "3 days ago",
    reviewedAt: "2 days ago",
    conversationId: "conv-4",
  },
];

const DEFAULT_PANEL_WIDTH = 576; // max-w-xl equivalent
const MIN_PANEL_WIDTH = 400;

export default function FlaggedView({ sidebarOpen = true }: { sidebarOpen?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FlagStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [queries, setQueries] = useState<FlaggedQuery[]>(initialFlagged);

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingQueryId, setVerifyingQueryId] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");

  // Edit correction modal state
  const [showEditCorrectionModal, setShowEditCorrectionModal] = useState(false);
  const [editingCorrectionId, setEditingCorrectionId] = useState<string | null>(null);
  const [editCorrectionText, setEditCorrectionText] = useState("");

  // Revoke confirmation modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingQueryId, setRevokingQueryId] = useState<string | null>(null);
  const [revokeType, setRevokeType] = useState<"verification" | "correction">("verification");

  // Chat panel state
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelQuery, setChatPanelQuery] = useState<FlaggedQuery | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const flaggedMessageRef = useRef<HTMLDivElement>(null);

  // Sidebar width: w-72 = 288px when open, w-14 = 56px when collapsed
  const sidebarWidth = sidebarOpen ? 288 : 56;
  const maxPanelWidth = typeof window !== "undefined" ? window.innerWidth - sidebarWidth : 1200;

  // --- Resize handlers ---
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), window.innerWidth - sidebarWidth);
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, sidebarWidth]);

  // Reset panel width when sidebar toggles (respect new max)
  useEffect(() => {
    const max = typeof window !== "undefined" ? window.innerWidth - sidebarWidth : 1200;
    if (panelWidth > max) setPanelWidth(max);
  }, [sidebarWidth, panelWidth]);

  const filteredQueries = queries.filter(q => {
    const matchesSearch = q.farmerMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.farmerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = queries.filter(q => q.status === "PENDING").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-[#e8c8ab]/20 text-[#e8c8ab]";
      case "VERIFIED": return "bg-[#85b878]/20 text-[#85b878]";
      case "CORRECTED": return "bg-[#608e96]/20 text-[#608e96]";
      default: return "bg-[#3B3B3B] text-[#6B6B6B]";
    }
  };

  // --- Verification handlers ---
  const handleOpenVerifyModal = (queryId: string) => {
    setVerifyingQueryId(queryId);
    // Pre-populate with whatever the user typed in the correction textarea
    setVerifyNotes(responseText);
    setShowVerifyModal(true);
  };

  const handleConfirmVerification = () => {
    if (!verifyingQueryId) return;
    setQueries(prev => prev.map(q =>
      q.id === verifyingQueryId
        ? { ...q, status: "VERIFIED" as const, verificationNotes: verifyNotes || undefined, reviewedAt: "Just now" }
        : q
    ));
    setShowVerifyModal(false);
    setVerifyingQueryId(null);
    setVerifyNotes("");
    setResponseText("");
  };

  const handleEditVerification = (queryId: string) => {
    const query = queries.find(q => q.id === queryId);
    if (!query) return;
    setVerifyingQueryId(queryId);
    setVerifyNotes(query.verificationNotes || "");
    setShowVerifyModal(true);
  };

  // --- Correction handlers ---
  const handleSendCorrection = (queryId: string) => {
    if (!responseText.trim()) return;
    setQueries(prev => prev.map(q =>
      q.id === queryId
        ? { ...q, status: "CORRECTED" as const, agronomistResponse: responseText, reviewedAt: "Just now" }
        : q
    ));
    setResponseText("");
  };

  const handleEditCorrection = (queryId: string) => {
    const query = queries.find(q => q.id === queryId);
    if (!query) return;
    setEditingCorrectionId(queryId);
    setEditCorrectionText(query.agronomistResponse || "");
    setShowEditCorrectionModal(true);
  };

  const handleSaveEditedCorrection = () => {
    if (!editingCorrectionId || !editCorrectionText.trim()) return;
    setQueries(prev => prev.map(q =>
      q.id === editingCorrectionId
        ? { ...q, agronomistResponse: editCorrectionText, reviewedAt: "Just now" }
        : q
    ));
    setShowEditCorrectionModal(false);
    setEditingCorrectionId(null);
    setEditCorrectionText("");
  };

  // --- Revoke handlers ---
  const handleOpenRevokeModal = (queryId: string, type: "verification" | "correction") => {
    setRevokingQueryId(queryId);
    setRevokeType(type);
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = () => {
    if (!revokingQueryId) return;
    setQueries(prev => prev.map(q =>
      q.id === revokingQueryId
        ? {
          ...q,
          status: "PENDING" as const,
          verificationNotes: undefined,
          agronomistResponse: undefined,
          reviewedAt: undefined,
        }
        : q
    ));
    setShowRevokeModal(false);
    setRevokingQueryId(null);
  };

  // --- Chat panel handlers ---
  const handleOpenChatPanel = (query: FlaggedQuery) => {
    setChatPanelQuery(query);
    setChatPanelOpen(true);
  };

  // Scroll to flagged message when panel opens
  useEffect(() => {
    if (chatPanelOpen && flaggedMessageRef.current) {
      // Small delay to let the panel render
      const timer = setTimeout(() => {
        flaggedMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chatPanelOpen]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-[#C2C0B6]">Flagged Queries</h1>
        <p className="text-sm text-[#9C9A92] mt-1">
          {pendingCount} pending review
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>
        <div className="flex gap-1 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg p-1">
          {(["all", "PENDING", "VERIFIED", "CORRECTED"] as FlagStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-[#3B3B3B] text-white'
                  : 'text-[#6B6B6B] hover:text-[#C2C0B6]'
              }`}
            >
              {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Flagged Query Cards */}
      <div className="space-y-3">
        {filteredQueries.map((query) => (
          <div
            key={query.id}
            className="bg-[#2B2B2B] rounded-xl border border-[#3B3B3B] overflow-hidden"
          >
            {/* Query Header */}
            <button
              onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
              className="w-full p-4 text-left flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-white">{query.farmerName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(query.status)}`}>
                    {query.status.charAt(0) + query.status.slice(1).toLowerCase()}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3B3B3B] text-[#9C9A92]">
                    {(query.confidenceScore * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-[#C2C0B6] line-clamp-1">{query.farmerMessage}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-[#6B6B6B]">{query.agentName}</span>
                  <span className="text-xs text-[#6B6B6B]">{query.createdAt}</span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#6B6B6B] flex-shrink-0 mt-1 transition-transform ${expandedId === query.id ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Content */}
            {expandedId === query.id && (
              <div className="px-4 pb-4 border-t border-[#3B3B3B] pt-4 space-y-4">
                {/* Farmer's Question */}
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1.5">Farmer&apos;s Question</p>
                  <div className="bg-[#1E1E1E] rounded-lg p-3">
                    <p className="text-sm text-[#C2C0B6]">{query.farmerMessage}</p>
                  </div>
                </div>

                {/* Agent's Response */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <p className="text-xs text-[#6B6B6B]">Agent&apos;s Response</p>
                    {query.status === "VERIFIED" && (
                      <CheckCircle className="w-3.5 h-3.5 text-[#85b878]" />
                    )}
                    {query.status === "CORRECTED" && (
                      <X className="w-3.5 h-3.5 text-[#e8c8ab]" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    query.status === "VERIFIED"
                      ? "bg-[#85b878]/5 border border-[#85b878]/20"
                      : query.status === "CORRECTED"
                        ? "bg-[#e8c8ab]/5 border border-[#e8c8ab]/10"
                        : "bg-[#1E1E1E]"
                  }`}>
                    <p className="text-sm text-[#C2C0B6]">{query.agentResponse}</p>
                  </div>
                </div>

                {/* Verified — show verification notes */}
                {query.status === "VERIFIED" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[#85b878]">Your Review</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditVerification(query.id)}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Edit verification"
                        >
                          <Pencil className="w-3 h-3 text-[#9C9A92] hover:text-white" />
                        </button>
                        <button
                          onClick={() => handleOpenRevokeModal(query.id, "verification")}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Revoke verification"
                        >
                          <X className="w-3.5 h-3.5 text-[#9C9A92] hover:text-[#e8c8ab]" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#85b878]/5 border border-[#85b878]/20 rounded-lg p-3">
                      <p className="text-sm text-[#C2C0B6]">
                        {query.verificationNotes || "Verified — no additional notes."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Corrected — show agronomist's correction */}
                {query.status === "CORRECTED" && query.agronomistResponse && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[#608e96]">Your Correction</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditCorrection(query.id)}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Edit correction"
                        >
                          <Pencil className="w-3 h-3 text-[#9C9A92] hover:text-white" />
                        </button>
                        <button
                          onClick={() => handleOpenRevokeModal(query.id, "correction")}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Remove correction"
                        >
                          <X className="w-3.5 h-3.5 text-[#9C9A92] hover:text-[#e8c8ab]" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#608e96]/5 border border-[#608e96]/20 rounded-lg p-3">
                      <p className="text-sm text-[#C2C0B6]">{query.agronomistResponse}</p>
                    </div>
                  </div>
                )}

                {/* Action bar for non-pending (view chat) */}
                {query.status !== "PENDING" && (
                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => handleOpenChatPanel(query)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9C9A92] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#C2C0B6] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Full Chat
                    </button>
                  </div>
                )}

                {/* Response Input (for pending) */}
                {query.status === "PENDING" && (
                  <div>
                    <p className="text-xs text-[#9C9A92] mb-1.5">Your Response</p>
                    <textarea
                      rows={3}
                      placeholder="Provide your expert response or correction..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => handleOpenChatPanel(query)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9C9A92] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#C2C0B6] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Full Chat
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenVerifyModal(query.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#85b878] transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Mark as Verified
                        </button>
                        <button
                          onClick={() => handleSendCorrection(query.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#85b878] text-white rounded-lg hover:bg-[#536d3d] transition-colors text-xs"
                        >
                          <Send className="w-3 h-3" />
                          Send Correction
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredQueries.length === 0 && (
        <div className="bg-[#2B2B2B] rounded-xl p-8 text-center">
          <Flag className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
          <p className="text-sm text-[#6B6B6B]">
            {searchQuery || statusFilter !== "all" ? "No queries match your filters." : "No flagged queries. Your agents are doing great!"}
          </p>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowVerifyModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-[#85b878]" />
                <h2 className="text-lg font-medium text-white">Verify Agent Response</h2>
              </div>

              <p className="text-sm text-[#9C9A92] mb-4">
                Confirming that the agent&apos;s response is accurate. Add any supporting notes below.
              </p>

              <div>
                <label className="block text-sm text-[#9C9A92] mb-1.5">Notes (optional)</label>
                <textarea
                  rows={4}
                  placeholder="Any additional context or notes supporting this verification..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowVerifyModal(false); setVerifyingQueryId(null); }}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmVerification}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#85b878] text-white rounded-lg hover:bg-[#536d3d] transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Verification
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Correction Modal */}
      {showEditCorrectionModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowEditCorrectionModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <Pencil className="w-5 h-5 text-[#608e96]" />
                <h2 className="text-lg font-medium text-white">Edit Correction</h2>
              </div>

              <div>
                <label className="block text-sm text-[#9C9A92] mb-1.5">Your correction</label>
                <textarea
                  rows={5}
                  value={editCorrectionText}
                  onChange={(e) => setEditCorrectionText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowEditCorrectionModal(false); setEditingCorrectionId(null); }}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedCorrection}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#608e96] text-white rounded-lg hover:bg-[#608e96]/80 transition-colors text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowRevokeModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-[#e8c8ab]" />
                <h2 className="text-lg font-medium text-white">
                  {revokeType === "verification" ? "Revoke Verification" : "Remove Correction"}
                </h2>
              </div>

              <p className="text-sm text-[#9C9A92] mb-2">
                {revokeType === "verification"
                  ? "Are you sure you want to revoke your verification? This will move the query back to pending review."
                  : "Are you sure you want to remove your correction? This will move the query back to pending review."
                }
              </p>
              <p className="text-xs text-[#6B6B6B]">
                This action can be undone by re-reviewing the query.
              </p>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowRevokeModal(false); setRevokingQueryId(null); }}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRevoke}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#e8c8ab] text-[#1C1C1C] rounded-lg hover:bg-[#e8c8ab]/80 transition-colors text-sm font-medium"
                >
                  {revokeType === "verification" ? "Revoke" : "Remove"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chat Panel — Slide-out from right */}
      {chatPanelOpen && chatPanelQuery && (() => {
        const conversation = sampleConversations[chatPanelQuery.conversationId];
        if (!conversation) return null;

        return (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setChatPanelOpen(false)}
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#1C1C1C] border-l border-[#2B2B2B] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B2B2B]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChatPanelOpen(false)}
                    className="p-1.5 hover:bg-[#2B2B2B] rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#C2C0B6]" />
                  </button>
                  <div>
                    <h2 className="text-sm font-medium text-white">{conversation.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#9C9A92]">{chatPanelQuery.farmerName}</span>
                      <span className="text-xs text-[#6B6B6B]">&middot;</span>
                      <span className="text-xs text-[#9C9A92]">{chatPanelQuery.agentName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(chatPanelQuery.status)}`}>
                    {chatPanelQuery.status.charAt(0) + chatPanelQuery.status.slice(1).toLowerCase()}
                  </span>
                  <button
                    onClick={() => setChatPanelOpen(false)}
                    className="p-1.5 hover:bg-[#2B2B2B] rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-[#9C9A92]" />
                  </button>
                </div>
              </div>

              {/* Flagged message indicator */}
              <div className="px-5 py-2 bg-[#e8c8ab]/5 border-b border-[#e8c8ab]/10 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-[#e8c8ab]" />
                <span className="text-xs text-[#e8c8ab]">
                  Flagged message highlighted below &middot; {(chatPanelQuery.confidenceScore * 100).toFixed(0)}% confidence
                </span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {conversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={msg.isFlagged ? flaggedMessageRef : undefined}
                    className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${msg.isFlagged ? "relative" : ""}`}>
                      {/* Flagged indicator ring */}
                      {msg.isFlagged && (
                        <div className="absolute -left-2 -top-2 -right-2 -bottom-2 rounded-2xl border-2 border-[#e8c8ab]/30 pointer-events-none" />
                      )}

                      {/* Avatar + bubble */}
                      <div className={`flex gap-2.5 ${msg.role === "USER" ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          msg.role === "USER" ? "bg-[#608e96]" : "bg-[#85b878]"
                        }`}>
                          {msg.role === "USER" ? (
                            <User className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <div className="text-white scale-75"><SproutIcon /></div>
                          )}
                        </div>

                        {/* Message bubble */}
                        <div className={`rounded-2xl px-3.5 py-2.5 ${
                          msg.role === "USER"
                            ? "bg-[#2B2B2B] text-[#C2C0B6]"
                            : msg.isFlagged
                              ? "bg-[#e8c8ab]/5 border border-[#e8c8ab]/20 text-[#C2C0B6]"
                              : "bg-[#1E1E1E] text-[#C2C0B6]"
                        }`}>
                          <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center gap-2 mt-1.5 ${msg.role === "USER" ? "justify-end" : "justify-start"}`}>
                            <span className="text-[10px] text-[#6B6B6B]">{msg.timestamp}</span>
                            {msg.confidenceScore !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                msg.confidenceScore < 0.7
                                  ? "bg-[#e8c8ab]/20 text-[#e8c8ab]"
                                  : "bg-[#85b878]/20 text-[#85b878]"
                              }`}>
                                {(msg.confidenceScore * 100).toFixed(0)}%
                              </span>
                            )}
                            {msg.isFlagged && (
                              <Flag className="w-3 h-3 text-[#e8c8ab]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Agronomist correction shown at bottom of chat if corrected */}
                {chatPanelQuery.status === "CORRECTED" && chatPanelQuery.agronomistResponse && (
                  <div className="border-t border-[#3B3B3B] pt-4 mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#608e96]" />
                      <span className="text-xs text-[#608e96] font-medium">Agronomist Correction</span>
                    </div>
                    <div className="bg-[#608e96]/5 border border-[#608e96]/20 rounded-xl px-3.5 py-2.5">
                      <p className="text-sm text-[#C2C0B6] leading-relaxed">{chatPanelQuery.agronomistResponse}</p>
                    </div>
                  </div>
                )}

                {/* Verification notes shown at bottom if verified */}
                {chatPanelQuery.status === "VERIFIED" && chatPanelQuery.verificationNotes && (
                  <div className="border-t border-[#3B3B3B] pt-4 mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#85b878]" />
                      <span className="text-xs text-[#85b878] font-medium">Agronomist Verification</span>
                    </div>
                    <div className="bg-[#85b878]/5 border border-[#85b878]/20 rounded-xl px-3.5 py-2.5">
                      <p className="text-sm text-[#C2C0B6] leading-relaxed">{chatPanelQuery.verificationNotes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="px-5 py-3 border-t border-[#2B2B2B] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  <span className="text-xs text-[#6B6B6B]">{conversation.messages.length} messages</span>
                </div>
                <button
                  onClick={() => setChatPanelOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#C2C0B6] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
