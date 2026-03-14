"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Search, ChevronLeft, ChevronRight, Plus, PanelLeft, Loader2 } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import ConversationView from "@/components/conversation-view";
import { useConversations } from "@/lib/hooks/use-conversations";
import { DEMO_FARMER_CHATS, DEMO_FARMER_CONVO_MESSAGES } from "@/lib/demo-data";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  agentName: string;
  lastMessage: string;
  messageCount: number;
  systemName?: string;
}

// Demo mock data — sourced from lib/demo-data.ts
export const mockChats: Chat[] = DEMO_FARMER_CHATS as Chat[];

// Helper to get mock conversation messages for a specific chat ID
const getMockConversationMessages = (chatId: string): ChatMessage[] => {
  const messages = DEMO_FARMER_CONVO_MESSAGES[chatId] || DEMO_FARMER_CONVO_MESSAGES["default"];
  return messages as ChatMessage[];
};

interface ChatsViewProps {
  onChatSelect?: (chatId: string | null, title?: string, systemName?: string) => void;
  initialChatId?: string | null;
  onChatOpened?: () => void;
  onConversationOpen?: (isOpen: boolean) => void;
  onNewChat?: () => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  demoMode?: boolean;
}

export default function ChatsView({ onChatSelect, initialChatId, onChatOpened, onConversationOpen, onNewChat, sidebarOpen = true, setSidebarOpen, demoMode = false }: ChatsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openedChat, setOpenedChat] = useState<Chat | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  // Real messages for the opened conversation (real mode only)
  const [realMessages, setRealMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const itemsPerPage = 30;

  // SWR — disabled in demo mode
  const apiConversations = useConversations(searchQuery, currentPage, itemsPerPage, demoMode);

  // Unified chat list — strip markdown heading prefix from titles
  const allChats: Chat[] = demoMode
    ? mockChats
    : apiConversations.conversations.map(c => ({
        id: c.id,
        title: c.title.replace(/^#+\s*/, ""),
        agentName: c.agentName,
        lastMessage: c.lastMessage,
        messageCount: c.messageCount,
      }));

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

  // Notify parent when conversation open state changes (so parent can remove padding)
  useEffect(() => {
    onConversationOpen?.(!!openedChat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedChat]);


  useEffect(() => {
    if (initialChatId) {
      const chat = allChats.find(c => c.id === initialChatId);
      if (chat) {
        setOpenedChat(chat);
        onChatOpened?.();
        if (!demoMode) {
          setMessagesLoading(true);
          setRealMessages([]);
          fetch(`/api/conversations/${initialChatId}/messages`)
            .then(r => r.json())
            .then(data => {
              const msgs = (data?.messages ?? []).map((m: { id: string; role: string; content: string; createdAt: string }) => ({
                id: m.id,
                role: m.role as "USER" | "ASSISTANT",
                content: m.content,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }));
              setRealMessages(msgs);
            })
            .catch(() => setRealMessages([]))
            .finally(() => setMessagesLoading(false));
        }
      }
    } else {
      setOpenedChat(null);
      setRealMessages([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId, onChatOpened]);

  const filteredChats = demoMode
    ? mockChats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.agentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allChats;

  // Pagination
  // For demo: paginate client-side. For real: API handles it.
  const totalPages = demoMode
    ? Math.ceil(filteredChats.length / itemsPerPage)
    : apiConversations.totalPages ?? 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChats = demoMode ? filteredChats.slice(startIndex, endIndex) : filteredChats;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Conversation view when a chat is opened
  if (openedChat) {
    return (
      <ConversationView
        title={openedChat.title}
        systemName={openedChat.systemName}
        headerMenuOpen={headerMenuOpen}
        setHeaderMenuOpen={setHeaderMenuOpen}
        onBack={() => { setOpenedChat(null); onChatSelect?.(null); }}
        onNewChat={() => { setOpenedChat(null); onNewChat?.(); }}
        messages={demoMode ? getMockConversationMessages(openedChat.id) : realMessages}
        messagesLoading={messagesLoading}
        isStandalone={isStandalone}
        demoAgentLabel={openedChat.agentName}
      />
    );
  }

  // Chat list view
  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-cultivate-bg-main z-10 pb-4 pt-8 lg:pt-0">
        {/* Mobile header — glass button absolute left, title centered */}
        <div className="relative flex items-center justify-center mb-6 lg:hidden">
          {!sidebarOpen && setSidebarOpen && (
            <div className="absolute left-0">
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <PanelLeft className="w-5 h-5 text-white rotate-180" />
              </GlassCircleButton>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Chats</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{mockChats.length} conversations with Cultivate</p>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Chats</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{mockChats.length} conversations with Cultivate</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 w-[98.5%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
          <input
            type="text"
            placeholder="Search your chats..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm standalone:text-base lg:text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>

        {/* Count */}
        <div className="px-1">
          <p className="text-sm standalone:text-base lg:text-sm text-cultivate-text-secondary">
            {filteredChats.length} {filteredChats.length === 1 ? 'conversation' : 'conversations'}
            {searchQuery && (
              <span className="text-cultivate-text-tertiary"> &middot; filtered from {demoMode ? mockChats.length : (apiConversations.total || 0)} total</span>
            )}
          </p>
        </div>
      </div>

      {/* PART 2: Scrollable Chat List */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto pb-6 thin-scrollbar scrollbar-outset">
          <div className="mr-3">
            {!demoMode && apiConversations.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-cultivate-text-secondary animate-spin" />
              </div>
            ) : paginatedChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="w-8 h-8 text-[#3B3B3B] mb-3" />
                <p className="text-sm text-cultivate-text-tertiary">No conversations yet</p>
              </div>
            ) : (
              <>
              {paginatedChats.map((chat, index) => (
                <div
                  key={chat.id}
                  onClick={() => { setOpenedChat(chat); onChatSelect?.(chat.id, chat.title, chat.systemName); }}
                  className={`pl-1.5 pr-1.5 py-2.5 hover:bg-cultivate-bg-elevated/40 transition-colors cursor-pointer ${
                    index < paginatedChats.length - 1
                      ? `border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`
                      : ''
                  }`}
                >
                  <p className="text-sm standalone:text-base lg:text-sm text-white">{chat.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs standalone:text-sm lg:text-xs text-cultivate-text-tertiary">{isStandalone ? chat.lastMessage : `Last message ${chat.lastMessage}`}</p>
                    <p className="text-xs standalone:text-sm lg:text-xs text-cultivate-text-secondary">{chat.agentName}</p>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredChats.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2 border-t border-cultivate-border-element">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className={`px-3 py-1.5 ${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-tertiary`}>
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

        {isStandalone && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-8 bg-gradient-to-t from-[#1E1E1E]/70 via-[#1E1E1E]/40 to-transparent" />
        )}
      </div>
    </div>
  );
}
