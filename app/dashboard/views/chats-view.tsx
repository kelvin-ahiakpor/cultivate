"use client";

import { useState } from "react";
import { MessageCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";

// Mock data - farmer conversations
const mockChats = [
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

export default function ChatsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const filteredChats = mockChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-[#1E1E1E] z-10 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Chats</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockChats.length} farmer conversations</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 w-[98.5%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search conversations..."
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
              className="px-4 py-4 hover:bg-[#2B2B2B]/40 transition-colors cursor-pointer"
            >
              <p className="text-sm text-white">{chat.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-[#6B6B6B]">Last message {chat.lastMessage}</p>
                <p className="text-xs text-[#9C9A92]">{chat.agentName} &middot; {chat.farmerName}</p>
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
                : "No conversations yet."}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredChats.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-t border-[#3B3B3B] mt-2">
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
