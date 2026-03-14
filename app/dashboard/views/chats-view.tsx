"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Search, PanelLeft, Loader2 } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import { useConversations } from "@/lib/hooks/use-conversations";
import { DEMO_DASHBOARD_CHATS } from "@/lib/demo-data";

// Mock data for demo mode — sourced from lib/demo-data.ts
const mockChats = DEMO_DASHBOARD_CHATS;

export default function ChatsView({
  sidebarOpen,
  setSidebarOpen,
  // demoMode: uses mockChats local data, makes zero API requests. See BACKEND-PROGRESS.md § Phase 5.
  demoMode,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  demoMode?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isStandalone, setIsStandalone] = useState(false);
  const itemsPerPage = 30;

  // SWR hook — null key in demo mode → zero requests
  const apiData = useConversations(searchQuery, currentPage, itemsPerPage, demoMode);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () => {
      const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setIsStandalone(mediaQuery.matches || iosStandalone);
    };

    checkStandalone();
    mediaQuery.addEventListener("change", checkStandalone);
    return () => mediaQuery.removeEventListener("change", checkStandalone);
  }, []);

  // Demo: filter + paginate mockChats locally. Real: API already filtered + paginated.
  const filteredChats = demoMode
    ? mockChats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.agentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : apiData.conversations;

  const totalPages = demoMode ? Math.ceil(filteredChats.length / itemsPerPage) : apiData.totalPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChats = demoMode ? filteredChats.slice(startIndex, endIndex) : filteredChats;
  const totalCount = demoMode ? mockChats.length : apiData.total;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-cultivate-bg-main z-10 pb-4 pt-8 lg:pt-0">
        {/* Mobile header — glass button absolute left, title centered */}
        <div className="relative flex items-center justify-center mb-6 lg:hidden">
          {!sidebarOpen && (
            <div className="absolute left-0">
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <PanelLeft className="w-5 h-5 text-white rotate-180" />
              </GlassCircleButton>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Chats</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} farmer conversations</p>
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Chats</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} farmer conversations</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 w-[98.5%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg ${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]`}
          />
        </div>

        {/* Showing range */}
        <div className="mb-1 px-1">
          <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-secondary`}>
            Showing {filteredChats.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredChats.length)} of {filteredChats.length} {filteredChats.length === 1 ? 'chat' : 'chats'}
            {searchQuery && (
              <span className="text-cultivate-text-tertiary"> &middot; filtered from {totalCount} total</span>
            )}
          </p>
        </div>
      </div>

      {/* PART 2: Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6 thin-scrollbar scrollbar-outset">
        {/* Loading skeleton — only shown in real mode while SWR is fetching */}
        {!demoMode && apiData.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-cultivate-text-tertiary animate-spin" />
          </div>
        )}

        {(!apiData.isLoading || demoMode) && (
          <div className="mr-3">
            {paginatedChats.map((chat, index) => (
            <div
              key={chat.id}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="pl-1.5 pr-1.5 py-2.5 hover:bg-cultivate-bg-hover rounded-lg transition-colors cursor-pointer">
                <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-white`}>{chat.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary`}>{isStandalone ? chat.lastMessage : `Last message ${chat.lastMessage}`}</p>
                  <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-secondary`}>{isStandalone ? chat.farmerName : `${chat.agentName} · ${chat.farmerName}`}</p>
                </div>
              </div>
              {index < paginatedChats.length - 1 && (
                <div className={`border-b border-cultivate-border-element transition-opacity ${
                  hoveredIndex === index || hoveredIndex === index + 1 ? "opacity-0" : "opacity-100"
                }`} />
              )}
            </div>
          ))}
          </div>
        )}

        {(!apiData.isLoading || demoMode) && filteredChats.length === 0 && (
          <div className="p-8 text-center">
            <MessageCircle className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
            <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-tertiary`}>
              {searchQuery
                ? "No conversations match your search."
                : "No conversations yet."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredChats.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2 border-t border-cultivate-border-element">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-cultivate-text-tertiary">
              {startIndex + 1}–{Math.min(endIndex, filteredChats.length)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
