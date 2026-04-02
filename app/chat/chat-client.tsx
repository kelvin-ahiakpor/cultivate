"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sprout, Plus, ChevronDown, Leaf, Bug, CloudRain, Calendar, Settings, HelpCircle, LogOut, MessageCircle, Layers, PanelLeft, MoreHorizontal, CircleEllipsis, Download, Share, Pencil, Unlink, Trash2, Globe, AudioLines, Mic, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { mutate as globalMutate } from "swr";
import { CabbageIcon, PaperPlaneIcon, SproutIcon } from "@/components/send-icons";
import GlassCircleButton from "@/components/glass-circle-button";
import ConversationView from "@/components/conversation-view";
import { Tooltip } from "@/components/tooltip";
import ChatsView, { mockChats } from "./views/chats-view";
import SystemsView from "./views/systems-view";
import SettingsView from "./views/settings-view";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useAgents } from "@/lib/hooks/use-agents";
import { DEMO_FARMER_CONVO_MESSAGES } from "@/lib/demo-data";
import { translateToEnglish, translateFromEnglish, LANGUAGES, type SupportedLanguage } from "@/lib/translation";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { AnimatedDots } from "@/components/wave-icon";

interface ChatPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    location?: string | null;
    gpsCoordinates?: string | null;
  };
  // demoMode: uses mockChats, makes zero API requests. See BACKEND-PROGRESS.md § Phase 5.
  demoMode?: boolean;
  initialView?: "chat" | "chats" | "systems" | "settings";
  initialConversationId?: string | null;
}

export default function ChatPageClient({ user, demoMode = false, initialView = "chat", initialConversationId = null }: ChatPageProps) {
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
  const [activeView, setActiveView] = useState<"chat" | "chats" | "systems" | "settings">(initialView);

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Voice input state
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "listening" | "error">("idle");
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition({
    lang: selectedLanguage === 'en' ? 'en-US' : selectedLanguage === 'tw' ? 'tw-GH' : 'ee-GH',
    continuous: true,
  });

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Rename/Delete modals
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Chat state
  interface ChatMessage {
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
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
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [conversationSystem, setConversationSystem] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(!!initialConversationId);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [chatsViewOpen, setChatsViewOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // kept for welcome-screen scroll if needed
  const chatDropdownRef = useRef<HTMLDivElement>(null);

  // Sidebar conversation list — disabled in demo mode (zero API requests)
  const apiConversations = useConversations("", 1, 30, demoMode);
  // Unified list: demo uses mockChats shape, real uses API data normalized to same shape
  const sidebarChats = demoMode
    ? mockChats
    : apiConversations.conversations.map(c => ({ id: c.id, title: c.title, agentName: c.agentName, lastMessage: c.lastMessage, messageCount: c.messageCount, systemName: undefined as string | undefined }));

  // Load language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cultivate-language') as SupportedLanguage;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      setSelectedLanguage(saved);
    }
  }, []);

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('cultivate-language', selectedLanguage);
  }, [selectedLanguage]);

  // Sync active view + conversation ID to URL so refresh restores state
  useEffect(() => {
    if (demoMode) return;
    const params = new URLSearchParams();
    if (activeView === "chat" && currentConversationId) {
      params.set("c", currentConversationId);
    } else if (activeView !== "chat") {
      params.set("view", activeView);
    }
    const query = params.toString();
    window.history.replaceState(null, "", "/chat" + (query ? "?" + query : ""));
  }, [activeView, currentConversationId, demoMode]);

  // Close the chat item dropdown when clicking anywhere outside it
  useEffect(() => {
    if (!chatMenuId) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(e.target as Node)) {
        setChatMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [chatMenuId]);

  // On mount: if a conversation ID was in the URL, restore it (fetch title + messages in parallel)
  useEffect(() => {
    if (!initialConversationId || demoMode) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/conversations/${initialConversationId}`).then(r => r.json()),
      fetch(`/api/conversations/${initialConversationId}/messages`).then(r => r.json()),
    ]).then(([convData, msgData]) => {
      if (cancelled) return;
      setConversationTitle(convData?.title || null);
      setConversationSystem(convData?.agent?.name || null);
      setSelectedChatId(initialConversationId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (msgData?.messages) setMessages(msgData.messages.map((m: any) => ({
        id: m.id,
        role: m.role as "USER" | "ASSISTANT",
        content: m.content,
        confidenceScore: m.confidenceScore,
        isFlagged: m.isFlagged,
        flaggedQuery: m.flaggedQuery,
      })));
    }).catch(() => {
      if (cancelled) return;
      // Conversation gone — reset to clean state
      setCurrentConversationId(null);
      window.history.replaceState(null, "", "/chat");
    }).finally(() => {
      if (!cancelled) setMessagesLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle voice button click
  const handleVoiceClick = async () => {
    if (voiceState === "listening") {
      stopListening();
      setVoiceState("idle");
    } else if (voiceState === "idle") {
      startListening();
      setVoiceState("connecting");
      setTimeout(() => setVoiceState("listening"), 300);
    } else if (voiceState === "connecting") {
      stopListening();
      setVoiceState("idle");
    } else if (voiceState === "error") {
      resetTranscript();
      setVoiceState("idle");
    }
  };

  // Update input value when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Auto-stop listening when transcript stops updating
  useEffect(() => {
    if (!isListening && voiceState === "listening") {
      setVoiceState("idle");
    }
  }, [isListening, voiceState]);

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

    // Translate user message to English if needed
    const { translatedText: englishText } = await translateToEnglish(text, selectedLanguage);

    // Add user message to UI immediately (show original text, not translated)
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

      // Send message — SSE stream (send English text to backend)
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: englishText }),
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
              // Translate assistant response to user's language
              const translatedContent = await translateFromEnglish(assistantText, selectedLanguage);

              const assistantMsg: ChatMessage = {
                id: event.message?.id || genId(),
                role: "ASSISTANT",
                content: translatedContent,
                confidenceScore: event.message?.confidenceScore,
                isFlagged: event.message?.isFlagged,
                flaggedQuery: event.message?.flaggedQuery,
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
    setIsStreaming(false);
    setStreamingContent("");
    setSelectedChatId(chatId);
    setActiveView("chat");
    setHeaderMenuOpen(false);
    if (window.innerWidth < 1024) setSidebarOpen(false);

    // Set loading state FIRST (before clearing messages) to prevent flash
    setMessagesLoading(true);

    if (demoMode) {
      // Demo: load mock messages for this specific chat (or default)
      const chatMessages = DEMO_FARMER_CONVO_MESSAGES[chatId] || DEMO_FARMER_CONVO_MESSAGES["default"];
      setMessages(chatMessages.map(m => ({
        id: m.id,
        role: m.role as "USER" | "ASSISTANT",
        content: m.content,
        confidenceScore: m.confidenceScore,
        isFlagged: m.isFlagged,
        flaggedQuery: m.flaggedQuery,
      })));
      setMessagesLoading(false);
    } else {
      try {
        const res = await fetch(`/api/conversations/${chatId}/messages`);
        const data = await res.json();
        if (data.messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            confidenceScore: m.confidenceScore,
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

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setConversationTitle(null);
    setConversationSystem(null);
    setStreamingContent("");
    setActiveView("chat");
  };

  const handleRenameClick = (chatId: string) => {
    const chat = sidebarChats.find(c => c.id === chatId);
    setRenameTargetId(chatId);
    setRenameValue(chat?.title || "");
    setShowRenameModal(true);
    setChatMenuId(null);
  };

  const handleRenameSubmit = async () => {
    if (demoMode || !renameTargetId || !renameValue.trim()) return;
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/conversations/${renameTargetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      // Refresh sidebar
      apiConversations.mutate();
      // Update current conversation title if this is the active one
      if (currentConversationId === renameTargetId) {
        setConversationTitle(renameValue.trim());
      }
      setShowRenameModal(false);
      setRenameTargetId(null);
      setRenameValue("");
    } catch (e) {
      notify.error("Failed to rename conversation");
      console.error(e);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteClick = (chatId: string) => {
    setDeleteTargetId(chatId);
    setShowDeleteModal(true);
    setChatMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (demoMode || !deleteTargetId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/conversations/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      // Refresh sidebar
      apiConversations.mutate();
      // If we deleted the currently open conversation, clear the view
      if (currentConversationId === deleteTargetId) {
        setCurrentConversationId(null);
        setConversationTitle(null);
        setConversationSystem(null);
        setMessages([]);
        setActiveView("chat");
      }
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    } catch (e) {
      notify.error("Failed to delete conversation");
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-cultivate-bg-main">
      {/* Mobile sidebar backdrop — always rendered for smooth fade transition */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Mobile: button to open sidebar — hidden on Chats/Systems/active chat (those views have their own glass header control) */}
      {!sidebarOpen && activeView !== "chats" && activeView !== "systems" && !currentConversationId && !isStreaming && messages.length === 0 && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-16 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center bg-cultivate-bg-elevated hover:bg-[#3B3B3B] rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <PanelLeft className="w-4 h-4 text-cultivate-text-primary rotate-180" />
        </button>
      )}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-cultivate-bg-sidebar border-r border-cultivate-border-subtle flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${sidebarOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)]' : '-translate-x-full shadow-none'} lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'lg:w-72' : 'lg:w-14'}`}
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
            className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
          >
            <PanelLeft className={`w-5 h-5 text-cultivate-text-primary transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 pt-3">
          <div className="space-y-0.5">
            {/* New Chat */}
            <button
              onClick={() => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setStreamingContent(""); setSelectedChatId(null); setMessagesLoading(false); setHeaderMenuOpen(false); setActiveView("chat"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chat" ? "bg-cultivate-bg-hover text-white" : "text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white"
              }`}
            >
              <div className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 bg-cultivate-bg-elevated rounded-full flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 standalone:w-[18px] standalone:h-[18px] lg:w-4 lg:h-4" />
              </div>
              {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>New chat</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  New chat
                </div>
              )}
            </button>

            {/* Chats */}
            <button
              onClick={() => { setSelectedChatId(null); setActiveView("chats"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chats" && !selectedChatId ? "bg-cultivate-bg-hover text-white" : "text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white"
              }`}
            >
              <MessageCircle className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 text-white flex-shrink-0" />
              {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>Chats</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Chats
                </div>
              )}
            </button>

            {/* Systems (Farmitecture Products) */}
            <button
              onClick={() => { setActiveView("systems"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "systems" ? "bg-cultivate-bg-hover text-white" : "text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white"
              }`}
            >
              <Layers className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 text-white flex-shrink-0" />
              {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>Systems</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Systems
                </div>
              )}
            </button>
          </div>

          {/* Recent Chats Section - Hidden when collapsed */}
          {sidebarOpen && (
            <div className="mt-4">
              {/* Recents label — text-sm mobile (14px), text-xs desktop (12px) */}
              <div className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-secondary px-2 mb-1.5`}>
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
                          ? 'bg-cultivate-bg-hover'
                          : isMenuOpen
                            ? '' /* menu open on non-active: no row bg, only button gets bg */
                            : 'hover:bg-cultivate-bg-hover has-[button:hover]:bg-transparent'
                      }`}
                    >
                      {/* Text label — min-w-0 is critical for flex child truncation */}
                      <span
                        className={`flex-1 min-w-0 ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm py-1.5 pl-2 pr-1 overflow-hidden whitespace-nowrap ${
                          isActive
                            ? 'text-white [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]'
                            : 'text-cultivate-text-primary group-hover:text-white truncate group-hover:[text-overflow:clip] group-hover:[mask-image:linear-gradient(to_right,black_85%,transparent_100%)] group-hover:[-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]'
                        }`}
                      >
                        {chat.title}
                      </span>
                      {/* Three-dot menu — absolute positioned so it doesn't take layout space when hidden */}
                      <div className="relative flex-shrink-0 w-8 flex items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setChatMenuId(isMenuOpen ? null : chat.id); }}
                          className={`absolute right-0 ${isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isMenuOpen ? 'bg-cultivate-bg-hover-dark' : 'hover:bg-cultivate-bg-hover'} transition-all w-8 h-full rounded-lg flex items-center justify-center`}
                        >
                          <MoreHorizontal className="w-4 h-4 text-cultivate-text-secondary hover:text-white transition-colors" strokeWidth={2.5} />
                        </button>

                        {/* Dropdown: Share, Rename, [Remove from system], Delete */}
                        {isMenuOpen && (
                          <div ref={chatDropdownRef} className="absolute right-0 top-full mt-1.5 bg-cultivate-bg-elevated rounded-xl shadow-xl border border-cultivate-border-element py-1.5 z-[101] min-w-[180px] whitespace-nowrap">
                              <div className="px-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Share className="w-3.5 h-3.5" />
                                  Share
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRenameClick(chat.id); }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Rename
                                </button>
                                {/* Conditional: only for chats linked to a Farmitecture system */}
                                {chat.systemName && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                    className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                    Remove from system
                                  </button>
                                )}
                              </div>
                              <div className="border-t border-cultivate-border-element my-1 mx-2" />
                              <div className="px-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(chat.id); }}
                                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-cultivate-bg-hover hover:text-red-300 rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </div>
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
                  className={`w-full flex items-center gap-2 px-2 py-1.5 ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm text-cultivate-text-secondary hover:text-white hover:bg-cultivate-bg-hover rounded-lg transition-colors`}
                >
                  <CircleEllipsis className="w-4 h-4 flex-shrink-0" />
                  All chats
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`${isStandalone ? '' : 'border-t border-cultivate-border-subtle'} p-2 ${isStandalone ? 'pb-6 pl-3' : 'pb-2'} lg:pb-2 relative ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          {/* div instead of button so the nested Download button is valid HTML */}
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`group relative flex items-center p-1.5 ${sidebarOpen ? 'w-full justify-between gap-2' : 'justify-center'} cursor-pointer`}
          >
            <div
              className={`flex items-center ${sidebarOpen ? 'gap-2' : ''} ${isStandalone && sidebarOpen ? 'w-auto max-w-[calc(100%-3rem)] px-2.5 py-1.5 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] transition-colors' : ''}`}
            >
              <div className="w-10 h-10 bg-cultivate-green-light rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base font-medium">{getInitials(user.name)}</span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-cultivate-text-primary truncate">
                    {user.name?.split(" ")[0]}
                  </p>
                  <p className="text-xs text-cultivate-text-secondary truncate">
                    {user.role === "ADMIN" ? "Admin" : user.role === "AGRONOMIST" ? "Agronomist" : "Farmer"}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInstallModal(true); }}
                  className={`${isStandalone ? 'h-10 w-10 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] flex items-center justify-center' : 'p-1.5 border border-cultivate-border-element hover:border-[#5a7048] rounded-md'} transition-colors text-cultivate-text-secondary hover:text-cultivate-text-primary`}
                  title="Install app"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Tooltip when collapsed */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {user.name?.split(" ")[0]}
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className={`absolute bottom-full mb-2 bg-cultivate-bg-sidebar rounded-lg shadow-lg border border-cultivate-border-subtle py-2 z-50 ${sidebarOpen ? 'left-3 right-3' : 'left-0 min-w-[200px]'}`}>
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-cultivate-text-secondary truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setActiveView("settings");
                    setShowUserMenu(false);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </button>
                <div className="border-t border-cultivate-border-subtle mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded"
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

        {activeView === "settings" && (
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 min-h-0 overflow-hidden">
            <SettingsView
              user={user}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              onBack={() => setActiveView("chat")}
              onLocationUpdate={(location, gpsCoordinates) => {
                // Update local user state if needed
                // The API handles the actual DB update
                console.log("Location updated:", location, gpsCoordinates);
              }}
            />
          </div>
        )}

        {activeView === "chat" && (
          <>
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {messages.length === 0 && !isStreaming && !currentConversationId && !messagesLoading ? (
                /* Welcome screen — centered greeting + sticky-bottom input (mobile parity with ConversationView) */
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                  <div className="flex-1 flex items-center justify-center px-6">
                    <div className="max-w-3xl w-full">
                      <div className="text-center mb-8">
                        <h1 className="text-4xl font-serif text-cultivate-text-primary mb-3 flex items-center justify-center gap-3">
                          <Sprout className="w-10 h-10 text-cultivate-green-light" />
                          Hey there, {user.name?.split(" ")[0]}
                        </h1>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center gap-2 flex-wrap">
                      <Tooltip content="Best practices for your crops">
                        <button onClick={() => setInputValue("What are the best practices for my crops?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-[#141413] transition-colors flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Crops</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Identify and manage pests">
                        <button onClick={() => setInputValue("How do I identify and manage pests on my farm?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-[#141413] transition-colors flex items-center gap-2">
                          <Bug className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Pests</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Plan based on weather">
                        <button onClick={() => setInputValue("How should I plan my farming around the weather?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-[#141413] transition-colors flex items-center gap-2">
                          <CloudRain className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Weather</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="When to plant and harvest">
                        <button onClick={() => setInputValue("When should I plant and harvest my crops?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-[#141413] transition-colors flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Planting</span>
                        </button>
                      </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className={`sticky bottom-0 ${isStandalone ? "relative z-30 -mt-10 bg-transparent pb-4 pt-0" : "bg-cultivate-bg-main pb-2"}`}>
                    {isStandalone && (
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1E1E1E]/70 via-[#1E1E1E]/40 to-transparent backdrop-blur-[0.5px]" />
                    )}
                    <div className={`${isStandalone ? "relative z-10 mx-3.5 mb-3" : "mx-auto w-full max-w-3xl px-6 mb-2"}`}>
                      <div className="relative bg-cultivate-bg-elevated rounded-2xl shadow-sm p-4">
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
                              <Plus className="w-5 h-5 text-cultivate-text-primary" />
                            </button>

                            {/* Voice input button */}
                            <div className="relative flex items-center">
                              {/* Mic icon (shows when connecting/listening/error) */}
                              {voiceState !== "idle" && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Mic className="w-5 h-5 text-cultivate-text-secondary" />
                                </div>
                              )}
                              {voiceState === "idle" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="p-1.5 hover:bg-[#3B3B3B] rounded transition-colors"
                                  title="Voice input"
                                >
                                  <AudioLines className="w-5 h-5 text-cultivate-text-primary" />
                                </button>
                              )}
                              {voiceState === "connecting" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="px-2.5 py-1.5 bg-cultivate-bg-elevated hover:bg-[#3B3B3B] rounded transition-colors flex items-center gap-1.5 text-xs text-white"
                                >
                                  <span>Cancel</span>
                                  <AnimatedDots type="pulse" />
                                </button>
                              )}
                              {voiceState === "listening" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="px-2.5 py-1.5 bg-cultivate-bg-elevated hover:bg-[#3B3B3B] rounded transition-colors flex items-center gap-1.5 text-xs text-white"
                                >
                                  <span>Stop</span>
                                  <AnimatedDots type="wave" />
                                </button>
                              )}
                              {voiceState === "error" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="px-2.5 py-1.5 bg-[#c0392b] hover:bg-[#a93226] rounded transition-colors flex items-center gap-1.5 text-xs text-white"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Error</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button
                                onClick={() => setShowAgentMenu(!showAgentMenu)}
                                className="flex items-center gap-1 text-cultivate-text-primary hover:text-white transition-colors text-sm standalone:text-base lg:text-sm"
                              >
                                <span>{selectedAgent}</span>
                                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                              {showAgentMenu && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowAgentMenu(false)} />
                                  <div className="absolute bottom-full right-0 mb-2 bg-cultivate-bg-elevated rounded-lg shadow-lg border border-cultivate-border-element py-2 z-50 min-w-[200px]">
                                    {agents.map((agent) => (
                                      <button
                                        key={agent.id}
                                        onClick={() => { setSelectedAgent(agent.name); setSelectedAgentId(agent.id); setShowAgentMenu(false); setCurrentConversationId(null); setConversationTitle(null); setMessages([]); }}
                                        className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-[#3B3B3B] transition-colors ${selectedAgent === agent.name ? "text-cultivate-green-light" : "text-cultivate-text-primary"}`}
                                      >
                                        {agent.name}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Language Selector */}
                            <div className="relative">
                              <button
                                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                                className="flex items-center gap-1.5 text-cultivate-text-primary hover:text-white transition-colors text-sm standalone:text-base lg:text-sm"
                                title="Select language"
                              >
                                <Globe className="w-4 h-4" />
                                <span className="hidden lg:inline">{LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English'}</span>
                                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                              {showLanguageMenu && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                                  <div className="absolute bottom-full right-0 mb-2 bg-cultivate-bg-elevated rounded-lg shadow-lg border border-cultivate-border-element py-2 z-50 min-w-[180px]">
                                    {LANGUAGES.map((lang) => (
                                      <button
                                        key={lang.code}
                                        onClick={() => { setSelectedLanguage(lang.code); setShowLanguageMenu(false); }}
                                        className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-[#3B3B3B] transition-colors flex items-center gap-2 ${selectedLanguage === lang.code ? "text-cultivate-green-light" : "text-cultivate-text-primary"}`}
                                      >
                                        <span>{lang.flag}</span>
                                        <span>{lang.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => { handleSend(); setSendIcon(s => s === "cabbage" ? "plane" : s === "plane" ? "sprout" : "cabbage"); }}
                              disabled={isStreaming || !inputValue.trim()}
                              className="p-2 bg-cultivate-green-light text-white rounded-xl hover:bg-[#536d3d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {sendIcon === "cabbage" && <CabbageIcon />}
                              {sendIcon === "plane" && <PaperPlaneIcon />}
                              {sendIcon === "sprout" && <SproutIcon />}
                            </button>
                          </div>
                        </div>
                      </div>
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
                    // Translation
                    selectedLanguage,
                    onLanguageSelect: (lang) => setSelectedLanguage(lang as SupportedLanguage),
                    showLanguageMenu,
                    setShowLanguageMenu,
                    languages: LANGUAGES,
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
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-80 shadow-xl">
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#5a7048] rounded-full flex items-center justify-center mb-3">
                <Download className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white font-semibold text-base mb-1.5">Install Cultivate</h2>
              <p className="text-cultivate-text-secondary text-sm leading-relaxed">
                Add Cultivate to your home screen for quick access and offline support.
              </p>
              <p className="text-cultivate-text-tertiary text-xs mt-2 leading-relaxed">
                On iOS: tap the Share button in Safari, then &ldquo;Add to Home Screen&rdquo;.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2 text-sm text-cultivate-text-secondary hover:text-white transition-colors rounded-lg"
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

      {/* Rename Conversation Modal */}
      {showRenameModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowRenameModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-80 shadow-xl">
            <div className="mb-4">
              <h2 className="text-white font-semibold text-base mb-3">Rename Conversation</h2>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !renameLoading) handleRenameSubmit(); }}
                placeholder="Enter new title..."
                className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRenameModal(false)}
                disabled={renameLoading}
                className="px-4 py-2 text-sm text-cultivate-text-secondary hover:text-white transition-colors rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                disabled={renameLoading || !renameValue.trim()}
                className="px-4 py-2 bg-[#5a7048] hover:bg-[#4a5d38] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {renameLoading ? "Renaming..." : "Rename"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Conversation Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-96 shadow-xl">
            <div className="mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-white font-semibold text-base mb-1.5">Delete Conversation</h2>
              <p className="text-cultivate-text-secondary text-sm leading-relaxed">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm text-cultivate-text-secondary hover:text-white transition-colors rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
