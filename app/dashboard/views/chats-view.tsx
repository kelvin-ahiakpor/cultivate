"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Search, PanelLeft, WifiOff } from "lucide-react";
import { GlassCircleButton, ConversationListSkeleton } from "@/components/cultivate-ui";
import ConversationView, { type ConversationMessage } from "@/components/conversation-view";
import { useConversations, type ConversationItem } from "@/lib/hooks/use-conversations";
import { DEMO_DASHBOARD_CHATS, DEMO_FARMER_CONVO_MESSAGES } from "@/lib/demo-data";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  saveAgroCache,
  getAgroCache,
  getConversationMessages,
  formatCacheAge,
} from "@/lib/offline-storage";

const mockChats = DEMO_DASHBOARD_CHATS;

type OpenedChat = ConversationItem;
type CachedDashboardConversation = {
  id: string;
  title: string;
  farmerName: string;
  agentName: string;
  systemName?: string;
  lastMessage: string;
  messageCount: number;
  cachedAt: number;
};

const getDemoMessages = (chatId: string): ConversationMessage[] => {
  const rawMessages =
    DEMO_FARMER_CONVO_MESSAGES[chatId] ??
    DEMO_FARMER_CONVO_MESSAGES.default;

  return rawMessages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    confidenceScore: message.confidenceScore,
    isFlagged: message.isFlagged,
    flaggedQuery: message.flaggedQuery,
  }));
};

export default function ChatsView({
  sidebarOpen,
  setSidebarOpen,
  demoMode,
  initialChatId = null,
  onChatSelect,
  listResetKey = 0,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  demoMode?: boolean;
  initialChatId?: string | null;
  onChatSelect?: (chatId: string | null) => void;
  listResetKey?: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isStandalone, setIsStandalone] = useState(false);
  const [openedChat, setOpenedChat] = useState<OpenedChat | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [offlineChats, setOfflineChats] = useState<CachedDashboardConversation[]>([]);
  const [offlineCachedAt, setOfflineCachedAt] = useState<number | null>(null);
  const itemsPerPage = 30;

  const isOnline = useOnlineStatus();
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

  // Write-through: cache conversations when online data loads
  useEffect(() => {
    if (demoMode || !isOnline || !apiData.conversations.length) return;

    const toCache: CachedDashboardConversation[] = apiData.conversations.map((c) => ({
      id: c.id,
      title: c.title,
      farmerName: c.farmerName,
      agentName: c.agentName,
      systemName: c.systemName,
      lastMessage: c.lastMessage,
      messageCount: c.messageCount,
      cachedAt: Date.now(),
    }));

    void saveAgroCache<CachedDashboardConversation[]>("agro_conversations", toCache);
  }, [demoMode, isOnline, apiData.conversations]);

  // Read-back: load from IndexedDB when offline
  useEffect(() => {
    if (demoMode || isOnline) return;

    void (async () => {
      const cached = await getAgroCache<CachedDashboardConversation[]>("agro_conversations");
      if (cached) {
        setOfflineChats(cached.data);
        setOfflineCachedAt(cached.cachedAt);
      }
    })();
  }, [demoMode, isOnline]);

  const sourceChats: ConversationItem[] = demoMode
    ? mockChats
    : isOnline
    ? apiData.conversations
    : offlineChats.map((c) => ({
        id: c.id,
        title: c.title,
        farmerName: c.farmerName,
        agentName: c.agentName,
        systemName: c.systemName,
        lastMessage: c.lastMessage,
        messageCount: c.messageCount,
      }));

  const filteredChats = demoMode
    ? sourceChats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.agentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : isOnline
    ? apiData.conversations
    : offlineChats
        .filter(c =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.agentName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((c) => ({
          id: c.id,
          title: c.title,
          farmerName: c.farmerName,
          agentName: c.agentName,
          systemName: c.systemName,
          lastMessage: c.lastMessage,
          messageCount: c.messageCount,
        }));

  const totalPages = demoMode
    ? Math.ceil(filteredChats.length / itemsPerPage)
    : isOnline
    ? apiData.totalPages
    : Math.ceil(filteredChats.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedChats = demoMode
    ? filteredChats.slice(startIndex, endIndex)
    : isOnline
    ? filteredChats
    : filteredChats.slice(startIndex, endIndex);

  const totalCount = demoMode
    ? mockChats.length
    : isOnline
    ? apiData.total
    : offlineChats.length;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleOpenChat = async (chat: OpenedChat) => {
    setOpenedChat(chat);
    setHeaderMenuOpen(false);
    onChatSelect?.(chat.id);

    if (demoMode) {
      setConversationMessages(getDemoMessages(chat.id));
      setMessagesLoading(false);
      return;
    }

    // Offline: load from IndexedDB
    if (!navigator.onLine) {
      setMessagesLoading(true);
      setConversationMessages([]);
      const cached = await getConversationMessages(chat.id);
      setConversationMessages(cached ?? []);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    setConversationMessages([]);

    try {
      const response = await fetch(`/api/conversations/${chat.id}/messages`);
      const data = await response.json();

      const normalizedMessages: ConversationMessage[] = (data?.messages ?? []).map((message: {
        id: string;
        role: "USER" | "ASSISTANT";
        content: string;
        attachments?: ConversationMessage["attachments"];
        confidenceScore?: number;
        isFlagged?: boolean;
        flaggedQuery?: ConversationMessage["flaggedQuery"];
      }) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        attachments: message.attachments,
        confidenceScore: message.confidenceScore,
        isFlagged: message.isFlagged,
        flaggedQuery: message.flaggedQuery,
      }));

      setConversationMessages(normalizedMessages);
    } catch {
      setConversationMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (!initialChatId) return;

    const targetChat = filteredChats.find((chat) => chat.id === initialChatId);
    if (!targetChat) return;

    if (openedChat?.id === targetChat.id) return;

    void handleOpenChat(targetChat);
  }, [initialChatId, filteredChats, openedChat]);

  useEffect(() => {
    setOpenedChat(null);
    setConversationMessages([]);
    setMessagesLoading(false);
    setHeaderMenuOpen(false);
  }, [listResetKey]);

  if (openedChat) {
    return (
      <ConversationView
        title={openedChat.title}
        subtitle={`${openedChat.agentName} · ${openedChat.farmerName}`}
        footerMeta={`${openedChat.agentName} · ${openedChat.farmerName}`}
        headerMenuOpen={headerMenuOpen}
        setHeaderMenuOpen={setHeaderMenuOpen}
        onBack={() => {
          setOpenedChat(null);
          setConversationMessages([]);
          setMessagesLoading(false);
          setHeaderMenuOpen(false);
          onChatSelect?.(null);
        }}
        onNewChat={() => {}}
        messages={conversationMessages}
        messagesLoading={messagesLoading}
        isStandalone={isStandalone}
        demoAgentLabel={openedChat.agentName}
        showSubtitleInHeader={false}
        showComposer={false}
        showNewChatButton={false}
        showMessageActions={false}
        highlightFlaggedMessages
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      <div className="flex-shrink-0 bg-cultivate-bg-main z-10 pb-4 pt-8 lg:pt-0">
        <div className="relative flex items-center justify-center mb-6 lg:hidden">
          {!sidebarOpen && (
            <div className="absolute left-0">
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <PanelLeft className="w-5 h-5 text-white rotate-180" />
              </GlassCircleButton>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-serif text-cultivate-text-primary flex items-center gap-2 justify-center">
              Chats
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} farmer conversations</p>
            {!isOnline && offlineCachedAt && (
              <p className="text-xs text-cultivate-text-tertiary mt-0.5">
                ● Last updated {formatCacheAge(offlineCachedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary flex items-center gap-2">
              Chats
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} farmer conversations</p>
            {!isOnline && offlineCachedAt && (
              <p className="text-xs text-cultivate-text-tertiary mt-0.5">
                ● Last updated {formatCacheAge(offlineCachedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg ${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-green-light`}
          />
        </div>

        <div className="mb-1 px-1">
          <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-secondary`}>
            Showing {filteredChats.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredChats.length)} of {filteredChats.length} {filteredChats.length === 1 ? "chat" : "chats"}
            {searchQuery && (
              <span className="text-cultivate-text-tertiary"> &middot; filtered from {totalCount} total</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-6 thin-scrollbar scrollbar-outset">
        {!demoMode && isOnline && apiData.isLoading && (
          <div>
            <ConversationListSkeleton count={6} />
          </div>
        )}

        {(!apiData.isLoading || demoMode || !isOnline) && (
          <div>
            {paginatedChats.map((chat, index) => (
              <div
                key={chat.id}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleOpenChat(chat)}
                className="cursor-pointer"
              >
                <div className="pl-1.5 pr-1.5 py-2.5 hover:bg-cultivate-bg-hover rounded-lg transition-colors">
                  <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-white truncate`}>{chat.title}</p>
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <p className={`min-w-0 flex-1 ${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary truncate`}>
                      {isStandalone ? chat.lastMessage : `Last message ${chat.lastMessage}`}
                    </p>
                    <p className={`min-w-0 max-w-[45%] ${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-secondary truncate text-right`}>
                      {isStandalone ? chat.farmerName : `${chat.agentName} · ${chat.farmerName}`}
                    </p>
                  </div>
                </div>
                {index < paginatedChats.length - 1 && (
                  <div className={`border-b border-cultivate-border-element transition-opacity ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element ${
                    hoveredIndex === index || hoveredIndex === index + 1 ? "opacity-0" : "opacity-100"
                  }`} />
                )}
              </div>
            ))}
          </div>
        )}

        {(!apiData.isLoading || demoMode || !isOnline) && filteredChats.length === 0 && (
          <div className="p-8 text-center">
            <MessageCircle className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
            <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-tertiary`}>
              {searchQuery ? "No conversations match your search." : (!isOnline ? "No cached conversations." : "No conversations yet.")}
            </p>
          </div>
        )}

        {filteredChats.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2 border-t border-cultivate-border-element">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-cultivate-border-element hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-cultivate-text-tertiary">
              {startIndex + 1}–{Math.min(endIndex, filteredChats.length)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-cultivate-border-element hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
