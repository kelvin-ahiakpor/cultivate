"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Search, ChevronLeft, ChevronRight, Plus, ChevronDown, Share, Pencil, Trash2, Unlink, Box, PanelLeft, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CabbageIcon } from "@/components/send-icons";
import GlassCircleButton from "@/components/glass-circle-button";
import { useConversations } from "@/lib/hooks/use-conversations";
import { DEMO_FARMER_CHATS, DEMO_FARMER_CONVO_MESSAGES } from "@/lib/demo-data";

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

// Demo mock data — sourced from lib/demo-data.ts
export const mockChats: Chat[] = DEMO_FARMER_CHATS as Chat[];

// Mock conversation messages for opened chat — sourced from lib/demo-data.ts
const mockConversationMessages: ChatMessage[] = DEMO_FARMER_CONVO_MESSAGES as ChatMessage[];

interface ChatsViewProps {
  onChatSelect?: (chatId: string | null) => void;
  initialChatId?: string | null;
  onChatOpened?: () => void;
  onNewChat?: () => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  demoMode?: boolean;
}

export default function ChatsView({ onChatSelect, initialChatId, onChatOpened, onNewChat, sidebarOpen = true, setSidebarOpen, demoMode = false }: ChatsViewProps) {
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

  // Open/close chat from sidebar click — fetch real messages when not in demo mode
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
      <div className="flex flex-col h-full overflow-hidden">
        {/* Conversation Header
          Mobile: back button | chat title + system pill | new chat button (Claude-style)
            Desktop: breadcrumb — system name / chat title pill with chevron dropdown */}
        <div className="flex-shrink-0 bg-[#1E1E1E] pt-16 lg:pt-3 pb-3 px-3 lg:pl-4 lg:pr-3">
            {/* Mobile header — back | chat title (+ system pill) | new chat
              Back: glass circle (replaces sidebar nav button — they're mutually exclusive)
              New chat: mirrors sidebar's circle button but with green Plus */}
          <div className="lg:hidden flex items-center justify-between">
            {/* Back — glass morphism circle (see components/glass-circle-button.tsx) */}
            <GlassCircleButton
              onClick={() => { setOpenedChat(null); onChatSelect?.(null); }}
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </GlassCircleButton>
            <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1 mx-3">
              <span className="text-sm standalone:text-base lg:text-sm font-medium text-white truncate">{openedChat.title}</span>
              {openedChat.systemName && (
                <div className="inline-flex items-center gap-1 bg-[#2B2B2B] rounded-full px-2.5 py-0.5">
                  <Box className="w-3 h-3 text-[#9C9A92]" />
                  <span className="text-xs text-[#9C9A92] truncate max-w-[180px]">{openedChat.systemName}</span>
                </div>
              )}
            </div>
            {/* New chat — mirrors sidebar New Chat circle, green Plus */}
            <button
              onClick={() => { onNewChat?.(); }}
              className="w-11 h-11 bg-[#2B2B2B] hover:bg-[#3B3B3B] rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Plus className="w-5 h-5 text-[#85b878]" />
            </button>
          </div>

          {/* Desktop header — breadcrumb (hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-1">
            {openedChat.systemName && (
              <>
                <span className="text-sm text-[#C2C0B6] hover:text-white truncate cursor-pointer transition-colors">{openedChat.systemName}</span>
                <span className="text-sm text-[#6B6B6B] flex-shrink-0">/</span>
              </>
            )}
            {/* Chat title + chevron — independent hover zones */}
            <div className={`inline-flex items-stretch rounded-lg overflow-hidden cursor-pointer relative ${
              headerMenuOpen ? 'bg-[#141413]' : 'hover:bg-[#141413]'
            }`}>
              <span className="text-sm text-[#C2C0B6] truncate py-1 pl-2 pr-1 hover:bg-[#0a0a0a] transition-colors">{openedChat.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(!headerMenuOpen); }}
                className={`${headerMenuOpen ? 'bg-[#0a0a0a]' : 'hover:bg-[#0a0a0a]'} transition-all px-1.5 self-stretch flex items-center`}
              >
                <ChevronDown className="w-3.5 h-3.5 text-[#9C9A92] hover:text-white transition-colors" />
              </button>

              {/* Dropdown: Share, Rename, [Remove from system], Delete */}
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-1 z-50 min-w-[200px] whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <Share className="w-3.5 h-3.5" />
                      Share
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Rename
                    </button>
                    {openedChat.systemName && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        Remove from system
                      </button>
                    )}
                    <div className="border-t border-[#2B2B2B] my-1 mx-3" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#141413] hover:text-red-300 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable area — messages + input in one container (Claude-style integrated layout) */}
        <div className="flex-1 min-h-0 relative">
        <div className="h-full overflow-y-auto thin-scrollbar scrollbar-outset">
          <div className="max-w-3xl standalone:max-w-4xl mx-auto flex flex-col min-h-full">
            {/* Messages — slightly narrower than input bar.
              Standalone gets extra bottom room because footer overlays message area there only. */}
            <div className={`flex-1 px-8 standalone:px-2 lg:px-8 pt-6 ${isStandalone ? "pb-16" : "pb-6"} space-y-6`}>
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#6B6B6B] animate-spin" />
                </div>
              ) : (demoMode ? mockConversationMessages : realMessages).map((message) => (
                <div key={message.id}>
                  {message.role === "USER" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[75%] bg-[#2B2B2B] rounded-2xl px-4 py-3">
                        <p className="text-sm standalone:text-base lg:text-sm text-white whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none text-[#C2C0B6] leading-relaxed prose-p:my-1 prose-headings:text-[#C2C0B6] prose-headings:font-semibold prose-h2:text-sm prose-h3:text-sm prose-strong:text-[#C2C0B6] prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              {/* Disclaimer location split:
                  - standalone: in-flow (Claude-like)
                  - web/desktop: fixed under input */}
              {isStandalone && (
                <div className="pt-2">
                  <p className="text-sm text-[#C2C0B6] text-right leading-snug max-w-[250px] ml-auto">
                    AI can make mistakes.
                    <br />
                    Please verify important information.
                  </p>
                </div>
              )}
            </div>

            {/* Reply Input — sticky to bottom, wider than messages.
              Overlay/wash effect is intentionally standalone-only. */}
            <div className={`sticky bottom-0 ${isStandalone ? "relative z-30 -mt-10 bg-transparent pb-4 pt-0" : "bg-[#1E1E1E] pb-2"}`}>
              {isStandalone && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1E1E1E]/70 via-[#1E1E1E]/40 to-transparent backdrop-blur-[0.5px]" />
              )}
              <div className={`${isStandalone ? "relative z-10 " : ""}mx-3.5 ${isStandalone ? "mb-3" : "mb-1"}`}>
                <div className="bg-[#2B2B2B] rounded-[20px] p-3.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.15),0_0_0.0625rem_rgba(0,0,0,0.15)]">
                  <textarea
                    placeholder="Reply..."
                    rows={1}
                    className="w-full px-2 py-1 focus:outline-none resize-none text-white placeholder-[#6B6B6B] bg-transparent text-sm standalone:text-base lg:text-sm"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-[#3B3B3B] rounded transition-colors">
                        <Plus className="w-5 h-5 text-[#C2C0B6]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm standalone:text-base lg:text-sm text-[#9C9A92]">{openedChat.agentName}</span>
                      <button className="p-2 bg-[#85b878] text-white rounded-xl hover:bg-[#536d3d] transition-colors">
                        <CabbageIcon />
                      </button>
                    </div>
                  </div>
                </div>
                {!isStandalone && (
                  <p className="mt-2 text-sm text-[#9C9A92] text-center leading-snug">
                    AI can make mistakes. Please verify important information.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Chat list view
  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-[#1E1E1E] z-10 pb-4 pt-8 lg:pt-0">
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
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Chats</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockChats.length} conversations with Cultivate</p>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
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
            className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm standalone:text-base lg:text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>

        {/* Count */}
        <div className="px-1">
          <p className="text-sm standalone:text-base lg:text-sm text-[#9C9A92]">
            {filteredChats.length} {filteredChats.length === 1 ? 'conversation' : 'conversations'}
            {searchQuery && (
              <span className="text-[#6B6B6B]"> &middot; filtered from {demoMode ? mockChats.length : (apiConversations.total || 0)} total</span>
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
                <Loader2 className="w-5 h-5 text-[#9C9A92] animate-spin" />
              </div>
            ) : paginatedChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="w-8 h-8 text-[#3B3B3B] mb-3" />
                <p className="text-sm text-[#6B6B6B]">No conversations yet</p>
              </div>
            ) : (
              <>
              {paginatedChats.map((chat, index) => (
                <div
                  key={chat.id}
                  onClick={() => { setOpenedChat(chat); onChatSelect?.(chat.id); }}
                  className={`pl-1.5 pr-1.5 py-2.5 hover:bg-[#2B2B2B]/40 transition-colors cursor-pointer ${
                    index < paginatedChats.length - 1
                      ? `border-b border-[#3B3B3B] ${isStandalone ? "border-none" : ""} lg:border-b lg:border-[#3B3B3B]`
                      : ''
                  }`}
                >
                  <p className="text-sm standalone:text-base lg:text-sm text-white">{chat.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs standalone:text-sm lg:text-xs text-[#6B6B6B]">{isStandalone ? chat.lastMessage : `Last message ${chat.lastMessage}`}</p>
                    <p className="text-xs standalone:text-sm lg:text-xs text-[#9C9A92]">{chat.agentName}</p>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredChats.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2 border-t border-[#3B3B3B]">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm text-[#9C9A92] bg-[#2B2B2B] border border-[#3B3B3B] rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className={`px-3 py-1.5 ${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-[#6B6B6B]`}>
                {startIndex + 1}–{Math.min(endIndex, filteredChats.length)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm text-[#9C9A92] bg-[#2B2B2B] border border-[#3B3B3B] rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
