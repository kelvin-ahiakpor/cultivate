"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  agentName: string;
  lastMessage: string;
  messageCount: number;
  systemName?: string;
}

// Mock data - farmer's past conversations
export const mockChats: Chat[] = [
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

// Mock conversation messages for opened chat
const mockConversationMessages: ChatMessage[] = [
  { id: "m1", role: "USER", content: "Hello, I need some help with my cassava farm.", timestamp: "10:02 AM" },
  { id: "m2", role: "ASSISTANT", content: "Hello! I'd be happy to help with your cassava farm. What would you like to know? I can assist with planting, pest management, harvesting, soil preparation, and more.", timestamp: "10:02 AM" },
  { id: "m3", role: "USER", content: "I planted some new cassava stems about 3 months ago. The first month everything looked great, the stems sprouted well and leaves were coming in nicely.", timestamp: "10:04 AM" },
  { id: "m4", role: "ASSISTANT", content: "That sounds like a good start! Three months is when cassava really begins establishing its root system. How are the plants looking now? Are you noticing any changes in growth or leaf appearance?", timestamp: "10:04 AM" },
  { id: "m5", role: "USER", content: "Yes that is exactly why I am contacting you. In the second month I noticed some of the lower leaves were starting to turn a bit yellow. I thought maybe it was just normal so I didn't worry too much.", timestamp: "10:06 AM" },
  { id: "m6", role: "ASSISTANT", content: "Some lower leaf yellowing can be normal in cassava as the plant matures — older leaves naturally senesce (die off) as the plant directs energy to new growth. However, if the yellowing has been spreading or you're seeing it on newer leaves too, that could indicate something else. Can you tell me more about the pattern? Is it just the bottom leaves, or is it moving upward?", timestamp: "10:06 AM" },
  { id: "m7", role: "USER", content: "At first it was just the bottom ones yes. But now I'm seeing it on the middle leaves too. And the new leaves at the top are looking smaller than they should be.", timestamp: "10:08 AM" },
  { id: "m8", role: "ASSISTANT", content: "That's a more concerning pattern. When yellowing moves from lower to upper leaves and new growth appears stunted, it could suggest a few things:\n\n1. **Nitrogen deficiency** — The most common cause of progressive yellowing from bottom to top\n2. **Cassava Mosaic Disease (CMD)** — If you're seeing a mosaic-like pattern (patches of yellow and green)\n3. **Root issues** — Waterlogging or poor drainage affecting nutrient uptake\n\nCan you describe the yellowing pattern on individual leaves? Is it uniform yellow, or do you see patches and mottling? Also, what type of soil do you have, and have you applied any fertilizer?", timestamp: "10:09 AM" },
];

interface ChatsViewProps {
  onChatSelect?: (chatId: string | null) => void;
  initialChatId?: string | null;
  onChatOpened?: () => void;
}

export default function ChatsView({ onChatSelect, initialChatId, onChatOpened }: ChatsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openedChat, setOpenedChat] = useState<Chat | null>(null);
  const itemsPerPage = 30;

  // Open/close chat from sidebar click
  useEffect(() => {
    if (initialChatId) {
      const chat = mockChats.find(c => c.id === initialChatId);
      if (chat) {
        setOpenedChat(chat);
        onChatOpened?.();
      }
    } else {
      setOpenedChat(null);
    }
  }, [initialChatId, onChatOpened]);

  const filteredChats = mockChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.agentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredChats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChats = filteredChats.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Conversation view when a chat is opened
  if (openedChat) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Conversation Header */}
        <div className="flex-shrink-0 bg-[#1E1E1E] border-b border-[#2B2B2B] px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setOpenedChat(null); onChatSelect?.(null); }}
              className="p-1.5 hover:bg-[#2B2B2B] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#C2C0B6]" />
            </button>
            <div>
              <h2 className="text-sm text-white">{openedChat.title}</h2>
              <p className="text-xs text-[#9C9A92]">{openedChat.agentName}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar scrollbar-outset">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {mockConversationMessages.map((message) => (
              <div key={message.id}>
                {message.role === "USER" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[75%] bg-[#2B2B2B] rounded-2xl px-4 py-3">
                      <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[#C2C0B6] leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat list view
  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-[#1E1E1E] z-10 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Chats</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockChats.length} conversations with Cultivate</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 w-[98.5%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search your chats..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>

        {/* Count */}
        <div className="px-1">
          <p className="text-sm text-[#9C9A92]">
            {filteredChats.length} {filteredChats.length === 1 ? 'conversation' : 'conversations'}
            {searchQuery && (
              <span className="text-[#6B6B6B]"> &middot; filtered from {mockChats.length} total</span>
            )}
          </p>
        </div>
      </div>

      {/* PART 2: Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6 thin-scrollbar scrollbar-outset">
        <div className="divide-y divide-[#3B3B3B] mr-3">
          {paginatedChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => { setOpenedChat(chat); onChatSelect?.(chat.id); }}
              className="px-4 py-4 hover:bg-[#2B2B2B]/40 transition-colors cursor-pointer"
            >
              <p className="text-sm text-white">{chat.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-[#6B6B6B]">Last message {chat.lastMessage}</p>
                <p className="text-xs text-[#9C9A92]">{chat.agentName}</p>
              </div>
            </div>
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="p-8 text-center">
            <MessageCircle className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
            <p className="text-sm text-[#6B6B6B]">
              {searchQuery
                ? "No conversations match your search."
                : "No conversations yet. Start a new chat!"}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredChats.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 pt-4 pb-0 mt-2">
            <div className="text-sm text-[#9C9A92]">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredChats.length)} of {filteredChats.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#85b878] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#3B3B3B] disabled:hover:text-[#C2C0B6]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <div className="flex items-center gap-1 px-3">
                <span className="text-sm text-white">Page {currentPage}</span>
                <span className="text-sm text-[#6B6B6B]">of {totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#85b878] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#3B3B3B] disabled:hover:text-[#C2C0B6]"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
