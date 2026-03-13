"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sprout, Plus, ChevronDown, Leaf, Bug, CloudRain, Calendar, Settings, HelpCircle, LogOut, MessageCircle, Layers, PanelLeft, MoreHorizontal, CircleEllipsis, Download, Share, Pencil, Unlink, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { mutate as globalMutate } from "swr";
import { CabbageIcon, PaperPlaneIcon, SproutIcon } from "@/components/send-icons";
import GlassCircleButton from "@/components/glass-circle-button";
import ConversationView from "@/components/conversation-view";
import { Tooltip } from "@/components/tooltip";
import ChatsView, { mockChats } from "./views/chats-view";
import SystemsView from "./views/systems-view";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useAgents } from "@/lib/hooks/use-agents";
import { DEMO_FARMER_CONVO_MESSAGES } from "@/lib/demo-data";

interface ChatPageProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  // demoMode: uses mockChats, makes zero API requests. See BACKEND-PROGRESS.md § Phase 5.
  demoMode?: boolean;
}

export default function ChatPageClient({ user, demoMode = false }: ChatPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [isDesktop, setIsDesktop] = useState(false);

  // Track screen size for responsive behavior
  useEffect(() => {
    const check = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
    };
    check();
    // Open sidebar by default on desktop
    setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("General Farm Advisor");
  const [sendIcon, setSendIcon] = useState<"cabbage" | "plane" | "sprout">("cabbage");
  const [activeView, setActiveView] = useState<"chat" | "chats" | "systems">("chat");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Chat state
  interface ChatMessage { id: string; role: "USER" | "ASSISTANT"; content: string; }
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [conversationSystem, setConversationSystem] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [chatsViewOpen, setChatsViewOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // kept for welcome-screen scroll if needed

  // Sidebar conversation list — disabled in demo mode (zero API requests)
  const apiConversations = useConversations("", 1, 30, demoMode);
  // Unified list: demo uses mockChats shape, real uses API data normalized to same shape
  const sidebarChats = demoMode
    ? mockChats
    : apiConversations.conversations.map(c => ({ id: c.id, title: c.title, agentName: c.agentName, lastMessage: c.lastMessage, messageCount: c.messageCount, systemName: undefined as string | undefined }));

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowInstallModal(false);
  };

  const handleSignOut = async () => {
    try {
      // Use redirect: false to bypass NextAuth's server-side redirect
      await signOut({ redirect: false });
      // Manually redirect on client side to preserve network IP
      window.location.href = `${window.location.origin}/`;
    } catch {
      window.location.href = `${window.location.origin}/`;
    }
  };

  const getInitials = (name: string) => {
    return name[0]?.toUpperCase() || "U";
  };

  // Real agents from API (disabled in demo mode)
  const { agents: apiAgents } = useAgents("", 1, 10, demoMode);
  const agents = demoMode
    ? [{ id: "demo-1", name: "General Farm Advisor" }, { id: "demo-2", name: "Maize Expert" }, { id: "demo-3", name: "Pest Management" }, { id: "demo-4", name: "Irrigation Specialist" }]
    : apiAgents.map(a => ({ id: a.id, name: a.name }));

  // Auto-select first agent when agents load
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
      setSelectedAgent(agents[0].name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length]);


  // iOS Safari < 15.4 doesn't support crypto.randomUUID — use this instead
  const genId = () => crypto.randomUUID?.() ?? (Math.random().toString(36).slice(2) + Date.now().toString(36));

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming || demoMode) return;

    const agentId = selectedAgentId || agents[0]?.id;
    if (!agentId) return;

    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    // Add user message to UI immediately
    const userMsg: ChatMessage = { id: genId(), role: "USER", content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Create conversation if we don't have one
      let convId = currentConversationId;
      if (!convId) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Create conversation failed: ${res.status} ${JSON.stringify(err)}`);
        }
        // apiSuccess returns the conversation object directly (not wrapped in { data: ... })
        const data = await res.json();
        convId = data.id;
        setCurrentConversationId(convId);
      }

      // Send message — SSE stream
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Send message failed: ${res.status} ${JSON.stringify(err)}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              assistantText += event.content;
              setStreamingContent(assistantText);
            } else if (event.type === "done") {
              const assistantMsg: ChatMessage = {
                id: event.message?.id || genId(),
                role: "ASSISTANT",
                content: assistantText,
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingContent("");
              // Invalidate ALL conversation SWR keys so sidebar refreshes too
              globalMutate(key => typeof key === "string" && key.startsWith("/api/conversations"));
            } else if (event.type === "title") {
              // Strip markdown heading prefix (e.g. "# Title" → "Title") and store
              const cleanTitle = (event.title as string || "").replace(/^#+\s*/, "").trim();
              setConversationTitle(cleanTitle);
              // Refresh sidebar so it shows the new title
              globalMutate(key => typeof key === "string" && key.startsWith("/api/conversations"));
            } else if (event.type === "error") {
              // Server-sent error (e.g. billing, model failure) — show as assistant message
              setMessages(prev => [...prev, {
                id: genId(),
                role: "ASSISTANT",
                content: event.error || "Sorry, something went wrong. Please try again.",
              }]);
              setStreamingContent("");
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      console.error("Send failed:", err);
      // Show friendly error message (hide technical details from user)
      setMessages(prev => [...prev, {
        id: genId(),
        role: "ASSISTANT",
        content: "Sorry, something went wrong. Please try again."
      }]);
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
    }
  };

  // Load an existing conversation into the main chat view (used by sidebar click + ChatsView selection)
  const loadExistingConversation = async (chatId: string, chatTitle: string, systemName?: string) => {
    setCurrentConversationId(chatId);
    setConversationTitle(chatTitle || null);
    setConversationSystem(systemName || null);
    setMessages([]);
    setIsStreaming(false);
    setStreamingContent("");
    setSelectedChatId(chatId);
    setActiveView("chat");
    setHeaderMenuOpen(false);
    if (window.innerWidth < 1024) setSidebarOpen(false);

    if (demoMode) {
      // Demo: load mock messages — same set for every chat (realistic demo)
      setMessages(DEMO_FARMER_CONVO_MESSAGES.map(m => ({
        id: m.id,
        role: m.role as "USER" | "ASSISTANT",
        content: m.content,
      })));
    } else {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/conversations/${chatId}/messages`);
        const data = await res.json();
        if (data.messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            isFlagged: m.isFlagged,
            flaggedQuery: m.flaggedQuery
          })));
        }
      } catch (e) {
        console.error("Failed to load conversation messages:", e);
      } finally {
        setMessagesLoading(false);
      }
    }
  };

  const handleSidebarChatClick = (chatId: string) => {
    const chat = sidebarChats.find(c => c.id === chatId);
    // Both demo and real load into the main conversation view (single source of truth)
    loadExistingConversation(chatId, chat?.title || "", (chat as { systemName?: string })?.systemName);
  };

  const handleAllChatsClick = () => {
    setSelectedChatId(null);
    setActiveView("chats");
    // Close sidebar on mobile
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Keep selectedChatId in sync — no longer clear it so sidebar highlights the opened chat
  const handleChatOpened = () => {
    // intentionally kept empty
  };

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      {/* Mobile sidebar backdrop — always rendered for smooth fade transition */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Mobile: button to open sidebar — hidden on Chats/Systems/active chat (those views have their own glass header control) */}
      {!sidebarOpen && activeView !== "chats" && activeView !== "systems" && !currentConversationId && !isStreaming && messages.length === 0 && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-16 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center bg-[#2B2B2B] hover:bg-[#3B3B3B] rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <PanelLeft className="w-4 h-4 text-[#C2C0B6] rotate-180" />
        </button>
      )}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1C1C1C] border-r border-[#2B2B2B] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${sidebarOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)]' : '-translate-x-full shadow-none'} lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'lg:w-72' : 'lg:w-14'}`}
      >
        {/* Logo — pt-16 on mobile matches conversation header safe area for Dynamic Island alignment */}
        <div className={`p-2 pt-16 lg:pt-4 min-h-[53px] flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
              <span className={`pl-2 ${isStandalone ? "text-[1.65rem]" : "text-2xl"} lg:text-xl font-serif font-semibold text-white`}>Cultivate</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-[#141413] rounded transition-colors"
          >
            <PanelLeft className={`w-5 h-5 text-[#C2C0B6] transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 pt-3">
          <div className="space-y-0.5">
            {/* New Chat */}
            <button
              onClick={() => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setStreamingContent(""); setSelectedChatId(null); setMessagesLoading(false); setHeaderMenuOpen(false); setActiveView("chat"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chat" ? "bg-[#141413] text-white" : "text-[#C2C0B6] hover:bg-[#141413] hover:text-white"
              }`}
            >
              <div className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 bg-[#2B2B2B] rounded-full flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 standalone:w-[18px] standalone:h-[18px] lg:w-4 lg:h-4" />
              </div>
              {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>New chat</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  New chat
                </div>
              )}
            </button>

            {/* Chats */}
            <button
              onClick={() => { setSelectedChatId(null); setActiveView("chats"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chats" && !selectedChatId ? "bg-[#141413] text-white" : "text-[#C2C0B6] hover:bg-[#141413] hover:text-white"
              }`}
            >
              <MessageCircle className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 text-white flex-shrink-0" />
              {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>Chats</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Chats
                </div>
              )}
            </button>

            {/* Systems (Farmitecture Products) */}
            <button
              onClick={() => { setActiveView("systems"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "systems" ? "bg-[#141413] text-white" : "text-[#C2C0B6] hover:bg-[#141413] hover:text-white"
              }`}
            >
              <Layers className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 text-white flex-shrink-0" />
              {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>Systems</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Systems
                </div>
              )}
            </button>
          </div>

          {/* Recent Chats Section - Hidden when collapsed */}
          {sidebarOpen && (
            <div className="mt-4">
              {/* Recents label — text-sm mobile (14px), text-xs desktop (12px) */}
              <div className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-[#9C9A92] px-2 mb-1.5`}>
                Recents
              </div>
              {/* Sidebar chat items — Claude-style pattern (see sidebar-chat-patterns.md)
                  Row states: active (bg), menu-open (no row bg, only button bg), default (hover bg)
                  Text: truncate when idle → gradient fade on hover/active (via mask-image)
                  Button: hidden → visible on hover/active/menu-open, near-black bg when menu open
                  Hover zones: has-[button:hover]:bg-transparent keeps row & button independent */}
              <div className="space-y-0.5 standalone:space-y-2 lg:space-y-0.5">
                {sidebarChats.slice(0, isDesktop ? 30 : 10).map((chat) => {
                  const isActive = selectedChatId === chat.id;
                  const isMenuOpen = chatMenuId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSidebarChatClick(chat.id)}
                      className={`group flex items-stretch rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#141413]'
                          : isMenuOpen
                            ? '' /* menu open on non-active: no row bg, only button gets bg */
                            : 'hover:bg-[#141413] has-[button:hover]:bg-transparent'
                      }`}
                    >
                      {/* Text label — min-w-0 is critical for flex child truncation */}
                      <span
                        className={`flex-1 min-w-0 ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm py-1.5 pl-2 overflow-hidden whitespace-nowrap ${
                          isActive
                            ? 'text-white [mask-image:linear-gradient(to_right,black_75%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_75%,transparent_100%)]'
                            : 'text-[#C2C0B6] group-hover:text-white truncate group-hover:[text-overflow:clip] group-hover:[mask-image:linear-gradient(to_right,black_75%,transparent_100%)] group-hover:[-webkit-mask-image:linear-gradient(to_right,black_75%,transparent_100%)]'
                        }`}
                      >
                        {chat.title}
                      </span>
                      {/* Three-dot menu — self-stretch fills row height via items-stretch parent */}
                      <div className="relative flex-shrink-0 flex items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setChatMenuId(isMenuOpen ? null : chat.id); }}
                          className={`${isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isMenuOpen ? 'bg-[#0a0a0a]' : 'hover:bg-[#141413]'} transition-all px-2 self-stretch rounded-lg flex items-center`}
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#9C9A92] hover:text-white transition-colors" strokeWidth={2.5} />
                        </button>

                        {/* Dropdown: Share, Rename, [Remove from system], Delete */}
                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }} />
                            <div className="absolute right-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-1 z-50 min-w-[200px] whitespace-nowrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Share className="w-3.5 h-3.5" />
                                Share
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              {/* Conditional: only for chats linked to a Farmitecture system */}
                              {chat.systemName && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                  Remove from system
                                </button>
                              )}
                              <div className="border-t border-[#2B2B2B] my-1 mx-3" />
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
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
                  );
                })}
              </div>

              {/* All Chats link */}
              {sidebarChats.length > (isDesktop ? 30 : 10) && (
                <button
                  onClick={handleAllChatsClick}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm text-[#9C9A92] hover:text-white hover:bg-[#141413] rounded-lg transition-colors`}
                >
                  <CircleEllipsis className="w-4 h-4 flex-shrink-0" />
                  All chats
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`${isStandalone ? '' : 'border-t border-[#2B2B2B]'} p-2 ${isStandalone ? 'pb-6 pl-3' : 'pb-2'} lg:pb-2 relative ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          {/* div instead of button so the nested Download button is valid HTML */}
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`group relative flex items-center p-1.5 ${sidebarOpen ? 'w-full justify-between gap-2' : 'justify-center'} cursor-pointer`}
          >
            <div
              className={`flex items-center ${sidebarOpen ? 'gap-2' : ''} ${isStandalone && sidebarOpen ? 'w-auto max-w-[calc(100%-3rem)] px-2.5 py-1.5 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] transition-colors' : ''}`}
            >
              <div className="w-10 h-10 bg-[#85b878] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base font-medium">{getInitials(user.name)}</span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-[#C2C0B6] truncate">
                    {user.name?.split(" ")[0]}
                  </p>
                  <p className="text-xs text-[#9C9A92] truncate">
                    {user.role === "ADMIN" ? "Admin" : user.role === "AGRONOMIST" ? "Agronomist" : "Farmer"}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInstallModal(true); }}
                  className={`${isStandalone ? 'h-10 w-10 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] flex items-center justify-center' : 'p-1.5 border border-[#3B3B3B] hover:border-[#5a7048] rounded-md'} transition-colors text-[#9C9A92] hover:text-[#C2C0B6]`}
                  title="Install app"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Tooltip when collapsed */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {user.name?.split(" ")[0]}
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className={`absolute bottom-full mb-2 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-2 z-50 ${sidebarOpen ? 'left-3 right-3' : 'left-0 min-w-[200px]'}`}>
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-[#9C9A92] truncate">{user.email}</p>
                </div>
                <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors rounded">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors rounded">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </button>
                <div className="border-t border-[#2B2B2B] mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors rounded"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Conditional rendering based on active view */}
        {/* Conversation view: full-width (header spans edge-to-edge like Claude)
            Chat list view: padded with max-w-5xl container */}
        {activeView === "chats" && (
          <div className="flex-1 min-h-0 overflow-hidden w-full mx-auto max-w-5xl px-4 sm:px-8 py-8">
            <ChatsView
              onChatOpened={handleChatOpened}
              onConversationOpen={setChatsViewOpen}
              onChatSelect={(chatId, title, systemName) => {
                if (!chatId) { setSelectedChatId(null); return; }
                // Single source of truth: both demo and real load into main conversation view
                loadExistingConversation(chatId, title || "", systemName);
              }}
              onNewChat={() => { setSelectedChatId(null); setActiveView("chat"); }}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              demoMode={demoMode}
            />
          </div>
        )}

        {activeView === "systems" && (
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 min-h-0 overflow-hidden">
            <SystemsView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              onBackToChat={() => setActiveView("chat")}
              demoMode={demoMode}
            />
          </div>
        )}

        {activeView === "chat" && (
          <>
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {messages.length === 0 && !isStreaming && !currentConversationId && !messagesLoading ? (
                /* Welcome screen — centered greeting + input */
                <div className="flex-1 flex items-center justify-center">
                  <div className="max-w-3xl w-full px-6">
                    <div className="text-center mb-8">
                      <h1 className="text-4xl font-serif text-[#C2C0B6] mb-3 flex items-center justify-center gap-3">
                        <Sprout className="w-10 h-10 text-[#85b878]" />
                        Hey there, {user.name?.split(" ")[0]}
                      </h1>
                    </div>

                    {/* Input Area - Positioned close to greeting */}
                    <div className="mb-6">
                      <div className="relative bg-[#2B2B2B] rounded-2xl shadow-sm p-4">
                        <textarea
                          placeholder="How can I help you today?"
                          rows={1}
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          className="w-full px-2 py-2 focus:outline-none resize-none text-white placeholder-[#C2C0B6] bg-transparent text-sm standalone:text-base lg:text-sm"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 hover:bg-[#3B3B3B] rounded transition-colors">
                              <Plus className="w-5 h-5 text-[#C2C0B6]" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Agent Selector */}
                            <div className="relative">
                              <button
                                onClick={() => setShowAgentMenu(!showAgentMenu)}
                                className="flex items-center gap-1 text-[#C2C0B6] hover:text-white transition-colors text-sm standalone:text-base lg:text-sm"
                              >
                                <span>{selectedAgent}</span>
                                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                              {showAgentMenu && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowAgentMenu(false)} />
                                  <div className="absolute bottom-full right-0 mb-2 bg-[#2B2B2B] rounded-lg shadow-lg border border-[#3B3B3B] py-2 z-50 min-w-[200px]">
                                    {agents.map((agent) => (
                                      <button
                                        key={agent.id}
                                        onClick={() => { setSelectedAgent(agent.name); setSelectedAgentId(agent.id); setShowAgentMenu(false); setCurrentConversationId(null); setConversationTitle(null); setMessages([]); }}
                                        className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-[#3B3B3B] transition-colors ${selectedAgent === agent.name ? "text-[#85b878]" : "text-[#C2C0B6]"}`}
                                      >
                                        {agent.name}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => { handleSend(); setSendIcon(s => s === "cabbage" ? "plane" : s === "plane" ? "sprout" : "cabbage"); }}
                              disabled={isStreaming || !inputValue.trim()}
                              className="p-2 bg-[#85b878] text-white rounded-xl hover:bg-[#536d3d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {sendIcon === "cabbage" && <CabbageIcon />}
                              {sendIcon === "plane" && <PaperPlaneIcon />}
                              {sendIcon === "sprout" && <SproutIcon />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Below Input */}
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Tooltip content="Best practices for your crops">
                        <button onClick={() => setInputValue("What are the best practices for my crops?")} className="px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-[#C2C0B6]" />
                          <span className="text-sm standalone:text-base lg:text-sm text-[#C2C0B6]">Crops</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Identify and manage pests">
                        <button onClick={() => setInputValue("How do I identify and manage pests on my farm?")} className="px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                          <Bug className="w-4 h-4 text-[#C2C0B6]" />
                          <span className="text-sm standalone:text-base lg:text-sm text-[#C2C0B6]">Pests</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Plan based on weather">
                        <button onClick={() => setInputValue("How should I plan my farming around the weather?")} className="px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                          <CloudRain className="w-4 h-4 text-[#C2C0B6]" />
                          <span className="text-sm standalone:text-base lg:text-sm text-[#C2C0B6]">Weather</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="When to plant and harvest">
                        <button onClick={() => setInputValue("When should I plant and harvest my crops?")} className="px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#C2C0B6]" />
                          <span className="text-sm standalone:text-base lg:text-sm text-[#C2C0B6]">Planting</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ) : (
                /* Conversation view — rendered by shared ConversationView component */
                <ConversationView
                  title={conversationTitle || ""}
                  systemName={conversationSystem}
                  headerMenuOpen={headerMenuOpen}
                  setHeaderMenuOpen={setHeaderMenuOpen}
                  onBack={() => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setStreamingContent(""); setSelectedChatId(null); setActiveView("chat"); }}
                  onNewChat={() => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setStreamingContent(""); }}
                  messages={messages}
                  messagesLoading={messagesLoading}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  isStandalone={isStandalone}
                  inputProps={{
                    value: inputValue,
                    onChange: setInputValue,
                    onSend: handleSend,
                    onNewChat: () => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setStreamingContent(""); },
                    agents,
                    selectedAgent,
                    onAgentSelect: (id, name) => { setSelectedAgentId(id); setSelectedAgent(name); },
                    sendIcon,
                    onSendIconCycle: () => setSendIcon(s => s === "cabbage" ? "plane" : s === "plane" ? "sprout" : "cabbage"),
                    showAgentMenu,
                    setShowAgentMenu,
                    isStreaming,
                  }}
                />
              )}
            </div>

            {/* Footer Note */}
                      </>
        )}
      </div>

      {/* PWA Install Modal — outside sidebar to avoid transform containing block issues */}
      {showInstallModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowInstallModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl p-6 w-80 shadow-xl">
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#5a7048] rounded-full flex items-center justify-center mb-3">
                <Download className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white font-semibold text-base mb-1.5">Install Cultivate</h2>
              <p className="text-[#9C9A92] text-sm leading-relaxed">
                Add Cultivate to your home screen for quick access and offline support.
              </p>
              <p className="text-[#6B6B6B] text-xs mt-2 leading-relaxed">
                On iOS: tap the Share button in Safari, then &ldquo;Add to Home Screen&rdquo;.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2 text-sm text-[#9C9A92] hover:text-white transition-colors rounded-lg"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-[#5a7048] hover:bg-[#4a5d38] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
