"use client";

import { useState, useEffect, useRef, type DragEvent as ReactDragEvent } from "react";
import Link from "next/link";
import { Sprout, Plus, ChevronDown, Leaf, Bug, CloudRain, Calendar, Settings, HelpCircle, LogOut, MessageCircle, Layers, PanelLeft, MoreHorizontal, CircleEllipsis, Download, Share, Pencil, Unlink, Trash2, Globe, AudioLines, Mic, AlertTriangle, Flag, Image, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { signOut } from "next-auth/react";
import { mutate as globalMutate } from "swr";
import { CabbageIcon, PaperPlaneIcon, SproutIcon, GlassCircleButton, Tooltip, Dropdown } from "@/components/cultivate-ui";
import ConversationView, { type MessageAttachment, type PendingImageAttachment } from "@/components/conversation-view";
import ChatsView, { mockChats } from "./views/chats-view";
import FlaggedQueriesView from "./views/flagged-queries-view";
import SystemsView from "./views/systems-view";
import SettingsView from "./views/settings-view";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useAgents } from "@/lib/hooks/use-agents";
import { useFarmerFlaggedQueries, type FarmerFlaggedQueryItem } from "@/lib/hooks/use-farmer-flagged-queries";
import { useSystems } from "@/lib/hooks/use-systems";
import { DEMO_FARMER_CONVO_MESSAGES } from "@/lib/demo-data";
import { translateToEnglish, translateFromEnglish, LANGUAGES, type SupportedLanguage } from "@/lib/translation";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { AnimatedDots } from "@/components/cultivate-ui";
import { notify } from "@/lib/toast";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  saveConversationList,
  saveConversationMessages,
  getConversationList,
  getConversationMessages,
  type CachedConversation,
} from "@/lib/offline-storage";

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
  initialView?: "chat" | "chats" | "systems" | "settings" | "flagged";
  initialConversationId?: string | null;
}

export default function ChatPageClient({ user, demoMode = false, initialView = "chat", initialConversationId = null }: ChatPageProps) {
  const FLAGGED_LAST_SEEN_KEY = "cultivate-farmer-flagged-last-seen";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showSystemPickerModal, setShowSystemPickerModal] = useState(false);
  const [systemPickerConversationId, setSystemPickerConversationId] = useState<string | null>(null);
  const [selectedSystemOptionId, setSelectedSystemOptionId] = useState<string>("");
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
  const [activeView, setActiveView] = useState<"chat" | "chats" | "systems" | "settings" | "flagged">(initialView);

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
  const [flaggedUpdatesSeenAt, setFlaggedUpdatesSeenAt] = useState<string | null>(null);
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
  // Demo mode: local mutable chat list so rename/delete actually update the UI
  const [demoChatList, setDemoChatList] = useState(() => mockChats);

  // Chat state
  interface ChatMessage {
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
    attachments?: MessageAttachment[];
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
  const [pendingImages, setPendingImages] = useState<PendingImageAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDraggingWelcomeImages, setIsDraggingWelcomeImages] = useState(false);
  const [isGlobalImageDragActive, setIsGlobalImageDragActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [conversationSystem, setConversationSystem] = useState<string | null>(null);
  const [conversationSystemId, setConversationSystemId] = useState<string | null>(null);
  const [pendingConversationSystemId, setPendingConversationSystemId] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(!!initialConversationId);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [chatsViewOpen, setChatsViewOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // kept for welcome-screen scroll if needed
  const imageInputRef = useRef<HTMLInputElement>(null);
  const globalDragCounterRef = useRef(0);

  // Online/offline status — drives IndexedDB fallback + disables input when offline
  const isOnline = useOnlineStatus();
  const [offlineChats, setOfflineChats] = useState<CachedConversation[]>([]);

  // Sidebar conversation list — disabled in demo mode (zero API requests)
  const apiConversations = useConversations("", 1, 30, demoMode);
  const farmerFlags = useFarmerFlaggedQueries("", 1, 50, demoMode);
  const farmerSystems = useSystems(demoMode);
  // Unified list: demo → mockChats, online → API data, offline → IndexedDB cache
  const sidebarChats = demoMode
    ? demoChatList
    : isOnline
      ? apiConversations.conversations.map(c => ({ id: c.id, title: c.title, agentName: c.agentName, lastMessage: c.lastMessage, messageCount: c.messageCount, systemName: c.systemName }))
      : offlineChats.map(c => ({ id: c.id, title: c.title, agentName: c.agentName, lastMessage: c.lastMessage, messageCount: c.messageCount, systemName: c.systemName }));

  // IndexedDB write-through: persist conversations when online data loads
  useEffect(() => {
    if (demoMode || !isOnline) return;
    const convs = apiConversations.conversations;
    if (convs.length === 0) return;
    saveConversationList(convs).catch(() => {/* non-critical */});
  }, [apiConversations.conversations, isOnline, demoMode]);

  // IndexedDB read: populate offlineChats when connection drops
  useEffect(() => {
    if (demoMode || isOnline) return;
    getConversationList().then(setOfflineChats).catch(() => {/* non-critical */});
  }, [isOnline, demoMode]);

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

  useEffect(() => {
    const lastSeen = localStorage.getItem(FLAGGED_LAST_SEEN_KEY);
    setFlaggedUpdatesSeenAt(lastSeen);
  }, []);

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

  // On mount: if a conversation ID was in the URL, restore it.
  // Online: serve cached messages instantly then revalidate from API in background (no spinner if cached).
  // Offline: serve from IndexedDB only.
  useEffect(() => {
    if (!initialConversationId || demoMode) return;
    let cancelled = false;
    let hasVisibleMessages = false;

    const applyCachedConversationMeta = (list: CachedConversation[]) => {
      const cached = list.find(c => c.id === initialConversationId);
      if (!cached || cancelled) return;
      setConversationTitle(cached.title);
      setConversationSystem(cached.systemName || cached.agentName);
      setSelectedChatId(initialConversationId);
    };

    const applyApiConversationMeta = (convData: {
      title?: string | null;
      agent?: { name?: string | null } | null;
      farmerSystem?: { id?: string | null; name?: string | null } | null;
    }) => {
      if (cancelled) return;
      setConversationTitle(convData?.title || null);
      setConversationSystem(convData?.farmerSystem?.name ?? convData?.agent?.name ?? null);
      setConversationSystemId(convData?.farmerSystem?.id || null);
      setSelectedChatId(initialConversationId);
    };

    const applyMessages = (msgs: ChatMessage[] | null, { clearLoading }: { clearLoading: boolean }) => {
      if (cancelled || !msgs || msgs.length === 0) return false;
      hasVisibleMessages = true;
      setMessages(msgs);
      setSelectedChatId(initialConversationId);
      if (clearLoading) {
        setMessagesLoading(false);
      }
      return true;
    };

    if (!navigator.onLine) {
      const offlineMetaPromise = getConversationList()
        .then(applyCachedConversationMeta)
        .catch(() => {/* cache miss */});
      const offlineMessagesPromise = getConversationMessages(initialConversationId)
        .then((msgs) => { applyMessages(msgs, { clearLoading: true }); })
        .catch(() => {/* cache miss */});

      Promise.allSettled([offlineMetaPromise, offlineMessagesPromise]).finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
      return () => { cancelled = true; };
    }

    // Step 1: paint from cache immediately — messages should not wait on list metadata.
    getConversationMessages(initialConversationId)
      .then((msgs) => { applyMessages(msgs, { clearLoading: true }); })
      .catch(() => {/* cache miss, keep spinner until API responds */});

    getConversationList()
      .then(applyCachedConversationMeta)
      .catch(() => {/* cache miss */});

    // Step 2: revalidate from API in background. Messages and metadata resolve independently.
    fetch(`/api/conversations/${initialConversationId}`)
      .then(r => r.json())
      .then(applyApiConversationMeta)
      .catch(() => {/* metadata can fail without losing the visible conversation */});

    fetch(`/api/conversations/${initialConversationId}/messages`)
      .then(r => r.json())
      .then((msgData) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = msgData?.messages ? msgData.messages.map((m: any) => ({
          id: m.id,
          role: m.role as "USER" | "ASSISTANT",
          content: m.content,
          attachments: m.attachments,
          confidenceScore: m.confidenceScore,
          isFlagged: m.isFlagged,
          flaggedQuery: m.flaggedQuery,
        })) : [];
        if (applyMessages(mapped, { clearLoading: true })) {
          saveConversationMessages(initialConversationId, mapped).catch(() => {});
          return;
        }
        setMessagesLoading(false);
      })
      .catch(() => {
        if (cancelled || hasVisibleMessages) return; // cached data still visible — don't reset
      setCurrentConversationId(null);
      window.history.replaceState(null, "", "/chat");
      })
      .finally(() => {
        if (!cancelled && !hasVisibleMessages) setMessagesLoading(false);
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

  useEffect(() => {
    if (!openMenuId) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenuId(null); };
    const handleMouseDown = () => setOpenMenuId(null);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [openMenuId]);

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

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  };

  const convertImageToWebp = async (file: File): Promise<File> => {
    const imageBitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.max(1, Math.round(imageBitmap.width * scale));
    const height = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available for image processing");
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error("Failed to encode image"));
      }, "image/webp", 0.82);
    });

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  };

  const handleSelectImages = async (files: FileList | File[]) => {
    const requestedFiles = Array.from(files);
    const nextFiles = requestedFiles.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (nextFiles.length === 0) {
      notify.error("Only JPG, PNG, and WebP images are supported.");
      return;
    }

    if (nextFiles.length < requestedFiles.length) {
      notify.error("Some files were skipped. Only JPG, PNG, and WebP images are supported.");
    }

    if (pendingImages.length + nextFiles.length > 3) {
      notify.error("You can attach up to 3 images per message.");
      return;
    }

    try {
      const convertedFiles = await Promise.all(nextFiles.map(async (file) => {
        try {
          return await convertImageToWebp(file);
        } catch {
          return file;
        }
      }));

      const nextImages = convertedFiles.map((file) => ({
        id: genId(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setPendingImages((prev) => [...prev, ...nextImages]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to process images.");
    }
  };

  const handleRemovePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const image = prev.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  useEffect(() => {
    const hasFilePayload = (event: DragEvent) =>
      Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file");

    const handleWindowDragEnter = (event: DragEvent) => {
      if (activeView !== "chat" || !hasFilePayload(event)) return;
      event.preventDefault();
      globalDragCounterRef.current += 1;
      setIsGlobalImageDragActive(true);
    };

    const handleWindowDragOver = (event: DragEvent) => {
      if (activeView !== "chat" || !hasFilePayload(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setIsGlobalImageDragActive(true);
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      if (activeView !== "chat" || !hasFilePayload(event)) return;
      event.preventDefault();
      globalDragCounterRef.current = Math.max(0, globalDragCounterRef.current - 1);
      if (globalDragCounterRef.current === 0) {
        setIsGlobalImageDragActive(false);
      }
    };

    const handleWindowDrop = (event: DragEvent) => {
      if (activeView !== "chat") return;
      if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return;
      event.preventDefault();
      globalDragCounterRef.current = 0;
      setIsGlobalImageDragActive(false);
      void handleSelectImages(event.dataTransfer.files);
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [activeView]);

  const triggerImagePicker = () => {
    imageInputRef.current?.click();
  };

  const openAddToSystemModal = (conversationId: string | null) => {
    setSystemPickerConversationId(conversationId);
    setSelectedSystemOptionId(conversationSystemId || pendingConversationSystemId || "");
    setShowSystemPickerModal(true);
    setOpenMenuId(null);
    setShowAttachMenu(false);
  };

  const assignConversationToSystem = async (systemId: string) => {
    const selectedSystem = farmerSystems.systems.find((system) => system.id === systemId);
    if (!selectedSystem) {
      notify.error("System not found");
      return;
    }

    if (!systemPickerConversationId) {
      setPendingConversationSystemId(systemId);
      setConversationSystem(selectedSystem.name);
      setConversationSystemId(systemId);
      setSelectedSystemOptionId("");
      setShowSystemPickerModal(false);
      notify.success("System selected. Send your first message to link this chat.");
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${systemPickerConversationId}/system`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmerSystemId: systemId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add chat to system");
      }

      setConversationSystem(data.farmerSystem?.name || selectedSystem.name);
      setConversationSystemId(data.farmerSystem?.id || systemId);
      setSelectedSystemOptionId("");
      setShowSystemPickerModal(false);
      await apiConversations.mutate();
      notify.success("Chat added to system");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to add chat to system");
    }
  };

  const removeConversationFromSystem = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/system`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove chat from system");
      }
      if (currentConversationId === conversationId) {
        setConversationSystem(null);
        setConversationSystemId(null);
      }
      setSelectedSystemOptionId("");
      setShowSystemPickerModal(false);
      await apiConversations.mutate();
      notify.success("Chat removed from system");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to remove chat from system");
    }
  };

  const handleWelcomeComposerDragEnter = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.items || []).some((item) => item.kind === "file")) return;
    e.preventDefault();
    setIsDraggingWelcomeImages(true);
  };

  const handleWelcomeComposerDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.items || []).some((item) => item.kind === "file")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingWelcomeImages) setIsDraggingWelcomeImages(true);
  };

  const handleWelcomeComposerDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget;
    if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) return;
    setIsDraggingWelcomeImages(false);
  };

  const handleWelcomeComposerDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingWelcomeImages(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    void handleSelectImages(e.dataTransfer.files);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if ((!text && pendingImages.length === 0) || isStreaming || demoMode) return;

    const agentId = selectedAgentId || agents[0]?.id;
    if (!agentId) return;

    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");
    const imagesToSend = pendingImages;
    setPendingImages([]);

    // Translate user message to English if needed
    const englishText = text
      ? (await translateToEnglish(text, selectedLanguage)).translatedText
      : "";

    // Add user message to UI immediately (show original text, not translated)
    const userMsg: ChatMessage = {
      id: genId(),
      role: "USER",
      content: text,
      attachments: imagesToSend.map((image) => ({
        id: image.id,
        fileName: image.file.name,
        fileUrl: image.previewUrl,
        mimeType: image.file.type,
        attachmentType: "IMAGE",
      })),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Create conversation if we don't have one
      let convId = currentConversationId;
      if (!convId) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, farmerSystemId: pendingConversationSystemId || undefined }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Create conversation failed: ${res.status} ${JSON.stringify(err)}`);
        }
        // apiSuccess returns the conversation object directly (not wrapped in { data: ... })
        const data = await res.json();
        convId = data.id;
        setCurrentConversationId(convId);
        setConversationSystem(data.farmerSystem?.name || conversationSystem);
        setConversationSystemId(data.farmerSystem?.id || pendingConversationSystemId);
        setPendingConversationSystemId(null);
      }

      // Send message — SSE stream (send English text to backend)
      const formData = new FormData();
      formData.set("content", englishText);
      imagesToSend.forEach((image) => formData.append("images", image.file));

      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        body: formData,
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
            if (event.type === "user_message") {
              setMessages((prev) => prev.map((msg) => (
                msg.id === userMsg.id
                  ? {
                      ...msg,
                      id: event.message?.id || msg.id,
                      attachments: event.message?.attachments || msg.attachments,
                    }
                  : msg
              )));
              imagesToSend.forEach((image) => URL.revokeObjectURL(image.previewUrl));
            } else if (event.type === "text") {
              assistantText += event.content;
              setStreamingContent(assistantText);
            } else if (event.type === "done") {
              // Translate assistant response to user's language
              const translatedContent = await translateFromEnglish(assistantText, selectedLanguage);

              const assistantMsg: ChatMessage = {
                id: event.message?.id || genId(),
                role: "ASSISTANT",
                content: translatedContent,
                attachments: event.message?.attachments,
                confidenceScore: event.message?.confidenceScore,
                isFlagged: event.message?.isFlagged,
                flaggedQuery: event.message?.flaggedQuery,
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingContent("");
              // Invalidate ALL conversation SWR keys so sidebar refreshes too
              globalMutate(key => typeof key === "string" && key.startsWith("/api/conversations"));
            } else if (event.type === "title") {
              setConversationTitle(event.title as string || null);
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
      setMessages(prev => prev.filter((msg) => msg.id !== userMsg.id));
      setPendingImages(prev => [...imagesToSend, ...prev]);
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
  const loadExistingConversation = async (chatId: string, chatTitle: string, systemName?: string | null) => {
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
        attachments: m.attachments,
        confidenceScore: m.confidenceScore,
        isFlagged: m.isFlagged,
        flaggedQuery: m.flaggedQuery,
      })));
      setMessagesLoading(false);
    } else if (!isOnline) {
      // Offline: serve from IndexedDB cache
      const cached = await getConversationMessages(chatId).catch(() => null);
      if (cached) {
        setMessages(cached);
      }
      setMessagesLoading(false);
    } else {
      try {
        const res = await fetch(`/api/conversations/${chatId}/messages`);
        const data = await res.json();
        if (data.messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            attachments: m.attachments,
            confidenceScore: m.confidenceScore,
            isFlagged: m.isFlagged,
            flaggedQuery: m.flaggedQuery
          }));
          setMessages(mapped);
          // Write-through: cache for offline access
          saveConversationMessages(chatId, mapped).catch(() => {/* non-critical */});
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

  const handleOpenFlaggedConversation = (query: FarmerFlaggedQueryItem) => {
    loadExistingConversation(query.conversationId, query.conversationTitle || "Conversation");
  };

  const unseenFlaggedUpdates = farmerFlags.queries.filter((query) => {
    if (!query.reviewedAtIso) return false;
    if (!flaggedUpdatesSeenAt) return true;
    return new Date(query.reviewedAtIso).getTime() > new Date(flaggedUpdatesSeenAt).getTime();
  }).length;

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
  };

  const handleRenameSubmit = async () => {
    if (!renameTargetId || !renameValue.trim()) return;
    if (demoMode) {
      setDemoChatList(prev => prev.map(c => c.id === renameTargetId ? { ...c, title: renameValue.trim() } : c));
      if (currentConversationId === renameTargetId) setConversationTitle(renameValue.trim());
      setShowRenameModal(false);
      setRenameTargetId(null);
      setRenameValue("");
      return;
    }
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/conversations/${renameTargetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      apiConversations.mutate();
      if (currentConversationId === renameTargetId) setConversationTitle(renameValue.trim());
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
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    if (demoMode) {
      setDemoChatList(prev => prev.filter(c => c.id !== deleteTargetId));
      if (currentConversationId === deleteTargetId) {
        setCurrentConversationId(null);
        setConversationTitle(null);
        setConversationSystem(null);
        setMessages([]);
        setActiveView("chat");
      }
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/conversations/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      apiConversations.mutate();
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
          className="fixed top-16 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center bg-cultivate-bg-elevated hover:bg-cultivate-border-element rounded-lg transition-colors"
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
              onClick={() => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setConversationSystemId(null); setPendingConversationSystemId(null); setStreamingContent(""); setSelectedChatId(null); setMessagesLoading(false); setHeaderMenuOpen(false); setActiveView("chat"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chat" && !currentConversationId ? "bg-cultivate-bg-hover text-white" : "text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white"
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

            {/* Flagged Queries */}
            <button
              onClick={() => { setActiveView("flagged"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "flagged" ? "bg-cultivate-bg-hover text-white" : "text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white"
              }`}
            >
              <Flag className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 text-white flex-shrink-0" />
              {sidebarOpen && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>Flagged Queries</span>
                  {unseenFlaggedUpdates > 0 && (
                    <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-cultivate-beige text-cultivate-bg-sidebar text-[10px] font-medium">
                      {unseenFlaggedUpdates}
                    </span>
                  )}
                </div>
              )}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Flagged Queries
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
                  const isMenuOpen = openMenuId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSidebarChatClick(chat.id)}
                      className={`group flex items-stretch rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-cultivate-bg-hover'
                          : isMenuOpen
                            ? '' /* menu open: no row bg, only button gets bg */
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
                      {/* Three-dot menu */}
                      <div className="relative flex-shrink-0 w-8 flex items-center">
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : chat.id);
                          }}
                          className={`absolute right-0 ${isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isMenuOpen ? 'bg-cultivate-bg-hover-dark' : 'hover:bg-cultivate-bg-hover'} transition-all w-8 h-full rounded-lg flex items-center justify-center`}
                        >
                          <MoreHorizontal className="w-4 h-4 text-cultivate-text-secondary hover:text-white transition-colors" strokeWidth={2.5} />
                        </button>

                        {isMenuOpen && (
                          <div
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1.5 bg-cultivate-bg-elevated rounded-xl shadow-xl border border-cultivate-border-element py-1.5 z-[101] min-w-[180px] whitespace-nowrap"
                          >
                              <div className="px-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Share className="w-4 h-4" />
                                  Share
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleRenameClick(chat.id);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Rename
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddToSystemModal(chat.id);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Layers className="w-4 h-4" />
                                  Add to system
                                </button>
                                {chat.systemName && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      void removeConversationFromSystem(chat.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                  >
                                    <Unlink className="w-4 h-4" />
                                    Remove from system
                                  </button>
                                )}
                              </div>
                              <div className="border-t border-cultivate-border-element/70 my-1 mx-1.5" />
                              <div className="px-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleDeleteClick(chat.id);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-error hover:bg-cultivate-bg-hover hover:text-cultivate-error rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                  className={`${isStandalone ? 'h-10 w-10 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] flex items-center justify-center' : 'p-1.5 border border-cultivate-border-element hover:border-cultivate-button-primary rounded-md'} transition-colors text-cultivate-text-secondary hover:text-cultivate-text-primary`}
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
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeView === "chat" && isGlobalImageDragActive && (
          <div className="absolute inset-0 z-[120] bg-cultivate-bg-main/75 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="rounded-3xl border border-dashed border-cultivate-green-light/60 bg-cultivate-bg-elevated/95 px-8 py-6 text-center shadow-xl">
              <p className="text-lg font-medium text-cultivate-green-light">Drop up to 3 images here</p>
              <p className="mt-2 text-sm text-cultivate-text-secondary">JPG, PNG, and WebP only</p>
            </div>
          </div>
        )}
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

        {activeView === "flagged" && (
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 min-h-0 overflow-hidden">
            <FlaggedQueriesView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              onOpenConversation={handleOpenFlaggedConversation}
              onViewedUpdates={() => {
                const now = new Date().toISOString();
                localStorage.setItem(FLAGGED_LAST_SEEN_KEY, now);
                setFlaggedUpdatesSeenAt(now);
              }}
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
                        <button onClick={() => setInputValue("What are the best practices for my crops?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-cultivate-bg-hover transition-colors flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Crops</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Identify and manage pests">
                        <button onClick={() => setInputValue("How do I identify and manage pests on my farm?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-cultivate-bg-hover transition-colors flex items-center gap-2">
                          <Bug className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Pests</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Plan based on weather">
                        <button onClick={() => setInputValue("How should I plan my farming around the weather?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-cultivate-bg-hover transition-colors flex items-center gap-2">
                          <CloudRain className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Weather</span>
                        </button>
                      </Tooltip>
                      <Tooltip content="When to plant and harvest">
                        <button onClick={() => setInputValue("When should I plant and harvest my crops?")} className="px-3 py-[7px] border-[0.5px] border-cultivate-border-element bg-cultivate-bg-main rounded-lg hover:bg-cultivate-bg-hover hover:border-cultivate-bg-hover transition-colors flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cultivate-text-primary" />
                          <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-primary">Planting</span>
                        </button>
                      </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className={`sticky bottom-0 ${isStandalone ? "relative z-30 -mt-10 bg-transparent pb-4 pt-0" : "bg-cultivate-bg-main pb-2"}`}>
                    {isStandalone && (
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-cultivate-bg-main/70 via-cultivate-bg-main/40 to-transparent backdrop-blur-[0.5px]" />
                    )}
                    <div className={`${isStandalone ? "relative z-10 mx-3.5 mb-3" : "mx-auto w-full max-w-3xl px-6 mb-2"}`}>
                      <div
                        onDragEnter={handleWelcomeComposerDragEnter}
                        onDragOver={handleWelcomeComposerDragOver}
                        onDragLeave={handleWelcomeComposerDragLeave}
                        onDrop={handleWelcomeComposerDrop}
                        className={`relative rounded-2xl p-4 shadow-sm transition-colors ${
                          isDraggingWelcomeImages
                            ? "bg-cultivate-bg-hover ring-1 ring-cultivate-green-light/60"
                            : "bg-cultivate-bg-elevated"
                        }`}
                      >
                        {pendingImages.length > 0 && (
                          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                            {pendingImages.map((image) => (
                              <div key={image.id} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-cultivate-border-element bg-cultivate-bg-main">
                                <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePendingImage(image.id)}
                                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black/85"
                                  title="Remove image"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {isDraggingWelcomeImages && (
                          <div className="mb-3 rounded-2xl border border-dashed border-cultivate-green-light/60 bg-cultivate-green-light/8 px-3 py-2 text-sm text-cultivate-green-light">
                            Drop up to 3 images here
                          </div>
                        )}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (!e.target.files || e.target.files.length === 0) return;
                            void handleSelectImages(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <textarea
                          placeholder="How can I help you today?"
                          rows={1}
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          className="w-full px-2 py-2 focus:outline-none resize-none text-white placeholder-cultivate-text-primary bg-transparent text-sm standalone:text-base lg:text-sm"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button
                                onClick={() => setShowAttachMenu(!showAttachMenu)}
                                className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
                                title="Attach"
                              >
                              <Plus className="w-5 h-5 text-cultivate-text-primary" />
                              </button>

                              {showAttachMenu && (
                                <>
                                  <div className="absolute left-0 bottom-full mb-1 bg-cultivate-bg-elevated rounded-xl shadow-xl border border-cultivate-border-element py-1.5 z-[101] min-w-[220px] whitespace-nowrap">
                                    <div className="px-1.5">
                                      <button
                                        onClick={() => {
                                          setShowAttachMenu(false);
                                          triggerImagePicker();
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                      >
                                        <Image className="w-4 h-4" />
                                        Upload image
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowAttachMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                      >
                                        <FileText className="w-4 h-4" />
                                        Upload document
                                      </button>
                                    </div>
                                    <div className="border-t border-cultivate-border-element my-1 mx-2" />
                                    <div className="px-1.5">
                                      {pendingConversationSystemId || conversationSystemId ? (
                                        <button
                                          onClick={() => {
                                            setShowAttachMenu(false);
                                            setPendingConversationSystemId(null);
                                            setConversationSystem(null);
                                            setConversationSystemId(null);
                                            notify.success("System removed from pending chat");
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                        >
                                          <Unlink className="w-4 h-4" />
                                          Remove from system
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            openAddToSystemModal(null);
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                        >
                                          <Layers className="w-4 h-4" />
                                          Add to system
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="fixed inset-0 z-[100]" onClick={() => setShowAttachMenu(false)} />
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {voiceState !== "idle" && (
                                <Mic className="w-5 h-5 text-cultivate-text-secondary" />
                              )}
                              {voiceState === "idle" && (
                                <button
                                  onClick={handleVoiceClick}
                                  disabled={isStreaming}
                                  className="p-2 hover:bg-cultivate-bg-hover rounded-lg transition-colors disabled:opacity-40"
                                  title="Voice input"
                                >
                                  <AudioLines className="w-5 h-5 text-cultivate-text-primary" />
                                </button>
                              )}
                              {voiceState === "connecting" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="px-3 py-1.5 bg-cultivate-green-light hover:bg-cultivate-green-dark rounded-lg flex items-center gap-2 transition-colors text-white text-sm"
                                >
                                  <AnimatedDots type="pulse" />
                                  <span>Cancel</span>
                                </button>
                              )}
                              {voiceState === "listening" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="px-3 py-1.5 bg-cultivate-green-light hover:bg-cultivate-green-dark rounded-lg flex items-center gap-2 transition-colors text-white text-sm"
                                >
                                  <AnimatedDots type="wave" />
                                  <span>Stop</span>
                                </button>
                              )}
                              {voiceState === "error" && (
                                <button
                                  onClick={handleVoiceClick}
                                  className="px-3 py-1.5 bg-cultivate-error rounded-lg flex items-center gap-2 text-white text-sm"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Error</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dropdown
                              variant="pill"
                              value={selectedAgentId ?? ""}
                              onChange={(id) => {
                                const agent = agents.find((item) => item.id === id);
                                if (!agent) return;
                                setSelectedAgent(agent.name);
                                setSelectedAgentId(agent.id);
                                setCurrentConversationId(null);
                                setConversationTitle(null);
                                setMessages([]);
                              }}
                              options={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
                              placeholder="Select agent..."
                              className="min-w-[170px] border-0 px-0 py-0 text-sm standalone:text-base lg:text-sm shadow-none hover:border-transparent focus:border-transparent bg-transparent"
                            />

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
                                        className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-cultivate-border-element transition-colors flex items-center gap-2 ${selectedLanguage === lang.code ? "text-cultivate-green-light" : "text-cultivate-text-primary"}`}
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
                              disabled={isStreaming || (inputValue.trim().length === 0 && pendingImages.length === 0)}
                              className="p-2 bg-cultivate-green-light text-white rounded-xl hover:bg-cultivate-green-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  onBack={() => setSidebarOpen(true)}
                  onNewChat={() => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setConversationSystemId(null); setPendingConversationSystemId(null); setStreamingContent(""); }}
                  messages={messages}
                  messagesLoading={messagesLoading}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  isStandalone={isStandalone}
                  isOnline={isOnline}
                  onAddToSystem={() => openAddToSystemModal(currentConversationId)}
                  onRemoveFromSystem={conversationSystemId ? () => { void removeConversationFromSystem(currentConversationId!); } : undefined}
                  inputProps={{
                    value: inputValue,
                    onChange: setInputValue,
                    onSend: handleSend,
                    canSend: inputValue.trim().length > 0 || pendingImages.length > 0,
                    onNewChat: () => { setMessages([]); setCurrentConversationId(null); setConversationTitle(null); setConversationSystem(null); setConversationSystemId(null); setPendingConversationSystemId(null); setStreamingContent(""); },
                    agents,
                    selectedAgent,
                    onAgentSelect: (id, name) => { setSelectedAgentId(id); setSelectedAgent(name); },
                    sendIcon,
                    onSendIconCycle: () => setSendIcon(s => s === "cabbage" ? "plane" : s === "plane" ? "sprout" : "cabbage"),
                    showAgentMenu,
                    setShowAgentMenu,
                    isStreaming,
                    pendingImages,
                    onSelectImages: handleSelectImages,
                    onRemovePendingImage: handleRemovePendingImage,
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
      <Dialog open={showSystemPickerModal} onOpenChange={(open) => { if (!open) { setShowSystemPickerModal(false); setSelectedSystemOptionId(""); } }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-80 shadow-xl">
            <DialogTitle className="sr-only">Add Chat to System</DialogTitle>
            <div className="mb-4">
              <div className="w-10 h-10 bg-cultivate-button-primary rounded-full flex items-center justify-center mb-3">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white font-semibold text-base mb-1.5">Add Chat to System</h2>
              <p className="text-cultivate-text-secondary text-sm leading-relaxed">
                Choose which Farmitecture system this conversation should be linked to.
              </p>
            </div>

            {farmerSystems.systems.length === 0 ? (
              <div className="rounded-lg border border-cultivate-border-element bg-cultivate-bg-elevated px-4 py-3 text-sm text-cultivate-text-secondary">
                No systems available yet. Add a system first from the Systems page.
              </div>
            ) : (
              <Dropdown
                value={selectedSystemOptionId}
                onChange={setSelectedSystemOptionId}
                options={farmerSystems.systems.map((system) => ({ value: system.id, label: system.name }))}
                placeholder="Select a system..."
                className="w-full"
              />
            )}

            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => { setShowSystemPickerModal(false); setSelectedSystemOptionId(""); }}
                className="px-4 py-2 text-sm text-cultivate-text-secondary hover:text-white transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedSystemOptionId) {
                    notify.error("Select a system first");
                    return;
                  }
                  void assignConversationToSystem(selectedSystemOptionId);
                }}
                disabled={farmerSystems.systems.length === 0}
                className="px-4 py-2 bg-cultivate-button-primary hover:bg-cultivate-button-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Add to System
              </button>
            </div>
        </DialogContent>
      </Dialog>

      {/* PWA Install Modal — outside sidebar to avoid transform containing block issues */}
      <Dialog open={showInstallModal} onOpenChange={(open) => { if (!open) setShowInstallModal(false); }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-80 shadow-xl">
            <DialogTitle className="sr-only">Install Cultivate</DialogTitle>
            <div className="mb-4">
              <div className="w-10 h-10 bg-cultivate-button-primary rounded-full flex items-center justify-center mb-3">
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
                className="px-4 py-2 bg-cultivate-button-primary hover:bg-cultivate-button-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                Install
              </button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Rename Conversation Modal */}
      <Dialog open={showRenameModal} onOpenChange={(open) => { if (!open) setShowRenameModal(false); }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-80 shadow-xl">
            <DialogTitle className="sr-only">Rename Conversation</DialogTitle>
            <div className="mb-4">
              <h2 className="text-white font-semibold text-base mb-3">Rename Conversation</h2>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !renameLoading) handleRenameSubmit(); }}
                placeholder="Enter new title..."
                className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-green-light"
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
                className="px-4 py-2 bg-cultivate-button-primary hover:bg-cultivate-button-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {renameLoading ? "Renaming..." : "Rename"}
              </button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false); }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-96 shadow-xl">
            <DialogTitle className="sr-only">Delete Conversation</DialogTitle>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
