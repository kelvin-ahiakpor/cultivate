"use client";

/**
 * ConversationView — Shared "Real vs Demo" component pattern
 * ============================================================
 * This component is the canonical example of the REAL vs DEMO pattern used in Cultivate.
 *
 * ## The Pattern
 * When a UI view exists in both /demo/* (rich mock data, zero API calls) and real routes
 * (/chat, /dashboard), the shared rendering logic should live in ONE component.
 * The component receives all data and callbacks as props — it has no internal opinions
 * about where the data comes from.
 *
 * ### Real mode caller:
 *   <ConversationView
 *     messages={apiMessages}
 *     inputProps={{ value, onChange, onSend, agents, ... }}  // full live input
 *   />
 *
 * ### Demo mode caller:
 *   <ConversationView
 *     messages={DEMO_FARMER_CONVO_MESSAGES}
 *     demoAgentLabel={openedChat.agentName}
 *     // inputProps omitted → visual-only input, no real send
 *   />
 *
 * ## Three View Modes (NEVER flatten these together)
 *   Desktop     — lg: breakpoint (≥1024px): breadcrumb header, centered max-w-3xl input
 *   Mobile web  — <1024px non-standalone: glass back button, pt-16 safe area
 *   Standalone  — PWA/pinned: same as mobile + gradient glass overlay on input
 *
 * ## Applying this pattern to a new page
 * 1. Build the UI once in a shared component under components/
 * 2. Accept data + action callbacks as props (no internal fetches)
 * 3. Real caller: pass API data + real handlers
 * 4. Demo caller: pass mock data from lib/demo-data.ts, omit/stub action callbacks
 * 5. Keep lib/demo-data.ts as the single source for all mock data
 *
 * ## Systems view note
 * systems-view.tsx is simpler (list only, no conversation panel) — shared component
 * may not be needed there unless it grows. Apply the pattern if both demo and real
 * diverge in layout or behaviour.
 */

import { useRef, useEffect, useState, useCallback, type DragEvent as ReactDragEvent } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Share, Pencil, Trash2, Unlink, Box, Loader2, Copy, Check, ThumbsUp, Flag, RotateCw, CheckCircle, Mic, MicOff, AlertTriangle, AudioLines, Globe, Image, FileText, FolderPlus, PanelLeft, WifiOff, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notify } from "@/lib/toast";
import { CabbageIcon, PaperPlaneIcon, SproutIcon, Tooltip, AnimatedDots, Dropdown } from "@/components/cultivate-ui";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface ConversationMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  confidenceScore?: number;
  attachments?: MessageAttachment[];
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

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  attachmentType: "IMAGE";
  width?: number | null;
  height?: number | null;
}

export interface PendingImageAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

/** Props for the live send input (real mode only). Omit entirely for demo. */
export interface InputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  canSend: boolean;
  onNewChat: () => void;
  agents: { id: string; name: string }[];
  selectedAgent: string;
  onAgentSelect: (id: string, name: string) => void;
  sendIcon: "cabbage" | "plane" | "sprout";
  onSendIconCycle: () => void;
  showAgentMenu: boolean;
  setShowAgentMenu: (v: boolean) => void;
  isStreaming: boolean;
  pendingImages: PendingImageAttachment[];
  onSelectImages: (files: FileList | File[]) => void | Promise<void>;
  onRemovePendingImage: (id: string) => void;
  // Translation
  selectedLanguage: string;
  onLanguageSelect: (lang: string) => void;
  showLanguageMenu: boolean;
  setShowLanguageMenu: (v: boolean) => void;
  languages: readonly { code: string; name: string; flag: string }[];
}

interface ConversationViewProps {
  // Header data
  title: string;
  systemName?: string | null;
  subtitle?: string | null;
  footerMeta?: string | null;
  showSubtitleInHeader?: boolean;
  // Header state / callbacks
  headerMenuOpen: boolean;
  setHeaderMenuOpen: (v: boolean) => void;
  onBack: () => void;
  onNewChat: () => void;
  // Messages
  messages: ConversationMessage[];
  messagesLoading?: boolean;
  // Streaming (real mode only)
  isStreaming?: boolean;
  streamingContent?: string;
  // Layout
  isStandalone: boolean;
  // Full input config — omit for demo (shows visual-only input)
  inputProps?: InputProps;
  // Optional demo agent label (shown in place of agent dropdown)
  demoAgentLabel?: string;
  showComposer?: boolean;
  showNewChatButton?: boolean;
  showMessageActions?: boolean;
  highlightFlaggedMessages?: boolean;
  layoutMode?: "default" | "farmer-chat";
  /** Passed from useOnlineStatus(). Disables input + shows offline indicator when false. */
  isOnline?: boolean;
  onAddToSystem?: () => void;
  onRemoveFromSystem?: () => void;
}

export default function ConversationView({
  title,
  systemName,
  subtitle,
  footerMeta,
  headerMenuOpen,
  setHeaderMenuOpen,
  onBack,
  onNewChat,
  messages,
  messagesLoading = false,
  isStreaming = false,
  streamingContent = "",
  isStandalone,
  inputProps,
  demoAgentLabel,
  showSubtitleInHeader = true,
  showComposer = true,
  showNewChatButton = true,
  showMessageActions = true,
  highlightFlaggedMessages = false,
  layoutMode = "default",
  isOnline = true,
  onAddToSystem,
  onRemoveFromSystem,
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [flaggedMessages, setFlaggedMessages] = useState<Set<string>>(new Set());
  const [flaggingInProgress, setFlaggingInProgress] = useState<Set<string>>(new Set());
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const [copiedFlagMessages, setCopiedFlagMessages] = useState<Set<number>>(new Set()); // Track copied flag messages by index
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flaggingMessageId, setFlaggingMessageId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [isUpdatingFlag, setIsUpdatingFlag] = useState(false);
  const [previousReason, setPreviousReason] = useState("");
  const [previousUpdates, setPreviousUpdates] = useState("");
  // Cache: stores flag data for instant UI updates (synced from DB via AJAX)
  const [flagDataCache, setFlagDataCache] = useState<Map<string, { reason: string; updates: string }>>(new Map());
  // Track current reason index for each message (for navigation)
  const [currentReasonIndex, setCurrentReasonIndex] = useState<Map<string, number>>(new Map());

  // Voice input state
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "listening" | "error">("idle");
  const connectingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);

  // Attachment menu state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const shouldShowComposer = showComposer && (!messagesLoading || messages.length > 0);
  const isFarmerLayout = layoutMode === "farmer-chat";
  const isComposerExpanded = isFarmerLayout && isStandalone && (isComposerFocused || Boolean(inputProps?.value?.trim()));
  const conversationMaxWidth = isStandalone ? "max-w-5xl" : "max-w-3xl";
  const messagePadding = isStandalone ? "px-4 standalone:px-3 sm:px-6 lg:px-8" : "px-8 lg:px-8";
  const standaloneComposerShell = isFarmerLayout
    ? (isComposerExpanded
        ? "relative z-10 mx-auto mb-3 w-full max-w-[56rem] px-2 transition-all duration-200 ease-out"
        : "relative z-10 mx-auto mb-3 w-full max-w-[54rem] px-3 transition-all duration-200 ease-out")
    : "relative z-10 mx-auto mb-3 w-full max-w-3xl px-4";
  const webComposerShell = "mx-3.5 mb-1 lg:mx-auto lg:max-w-3xl";
  // composerCardClass: farmer-standalone only gets the larger/animated variant
  const composerCardClass = (isFarmerLayout && isStandalone)
    ? `rounded-[22px] shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.15),0_0_0.0625rem_rgba(0,0,0,0.15)] transition-all duration-200 ease-out ${
        isComposerExpanded ? "p-4" : "p-[0.95rem]"
      }`
    : "rounded-[20px] p-3.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.15),0_0_0.0625rem_rgba(0,0,0,0.15)] transition-colors";

  const triggerImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleComposerDragEnter = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!inputProps) return;
    if (!Array.from(e.dataTransfer.items || []).some((item) => item.kind === "file")) return;
    e.preventDefault();
    setIsDraggingImages(true);
  };

  const handleComposerDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!inputProps) return;
    if (!Array.from(e.dataTransfer.items || []).some((item) => item.kind === "file")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingImages) setIsDraggingImages(true);
  };

  const handleComposerDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!inputProps) return;
    const relatedTarget = e.relatedTarget;
    if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) return;
    setIsDraggingImages(false);
  };

  const handleComposerDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!inputProps) return;
    e.preventDefault();
    setIsDraggingImages(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    inputProps.onSelectImages(e.dataTransfer.files);
  };

  const renderPendingImages = inputProps && inputProps.pendingImages.length > 0 ? (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
      {inputProps.pendingImages.map((image) => (
        <div key={image.id} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-cultivate-border-element bg-cultivate-bg-main">
          <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => inputProps.onRemovePendingImage(image.id)}
            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black/85"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  ) : null;

  const renderMessageAttachments = (attachments?: MessageAttachment[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mb-3 flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={attachment.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl border border-cultivate-border-element bg-cultivate-bg-main"
          >
            <img
              src={attachment.fileUrl}
              alt={attachment.fileName}
              loading="lazy"
              decoding="async"
              className="h-40 w-40 object-cover sm:h-48 sm:w-48"
            />
          </a>
        ))}
      </div>
    );
  };

  // Stable callback to prevent recognition from restarting on every render
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && inputProps) {
      // Set final transcript as message value
      inputProps.onChange(text);
    }
  }, [inputProps]);

  const { transcript, isListening, isSupported: isSpeechSupported, error: speechError, startListening, stopListening, resetTranscript } = useSpeechRecognition({
    lang: "en-US",
    continuous: true, // Keep listening until user clicks Stop
    interimResults: false, // Disable interim results - might be causing issues
    onTranscript: handleTranscript,
  });

  // Handle voice button click
  const handleVoiceClick = async () => {
    if (voiceState === "listening") {
      // Stop listening
      stopListening();
      setVoiceState("idle");
    } else if (voiceState === "idle") {
      // Start listening IMMEDIATELY (mic access must be from direct user click)
      startListening();

      // Show "connecting" animation briefly for UX polish
      setVoiceState("connecting");
      connectingTimeoutRef.current = setTimeout(() => {
        setVoiceState("listening");
      }, 300); // Quick 300ms animation
    } else if (voiceState === "connecting") {
      // Cancel during connecting animation
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      stopListening();
      setVoiceState("idle");
    } else if (voiceState === "error") {
      // Reset from error
      setVoiceState("idle");
    }
  };

  // Update voice state based on speech recognition errors
  useEffect(() => {
    if (speechError) {
      setVoiceState("error");
      // Auto-reset error after 3 seconds
      const timer = setTimeout(() => setVoiceState("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  // Cleanup connecting timeout on unmount
  useEffect(() => {
    return () => {
      if (connectingTimeoutRef.current) {
        clearTimeout(connectingTimeoutRef.current);
      }
    };
  }, []);

  // Reset to idle when speech stops unexpectedly
  useEffect(() => {
    if (!isListening && voiceState === "listening") {
      setVoiceState("idle");
    }
  }, [isListening, voiceState]);

  // Initialize flaggedMessages from messages prop
  useEffect(() => {
    const flaggedIds = new Set(messages.filter(m => m.isFlagged).map(m => m.id));
    setFlaggedMessages(flaggedIds);
  }, [messages]);

  // Sync cache from DB (AJAX keeps this in line when messages refetch)
  useEffect(() => {
    const newCache = new Map<string, { reason: string; updates: string }>();
    messages.forEach(msg => {
      if (msg.flaggedQuery) {
        newCache.set(msg.id, {
          reason: msg.flaggedQuery.farmerReason || "",
          updates: msg.flaggedQuery.farmerUpdates || "",
        });
      }
    });
    setFlagDataCache(newCache);
  }, [messages]);

  // Scroll to bottom when messages or streaming content change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Handle copy with checkmark animation
  const handleCopy = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessages(prev => new Set(prev).add(messageId));
    // Reset checkmark after 2 seconds
    setTimeout(() => {
      setCopiedMessages(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }, 2000);
  };

  // Handle copy for flag messages with checkmark animation
  const handleFlagCopy = (index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFlagMessages(prev => new Set(prev).add(index));
    // Reset checkmark after 2 seconds
    setTimeout(() => {
      setCopiedFlagMessages(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 2000);
  };

  // Open flag modal - either to create or update
  const handleFlag = (msg: ConversationMessage) => {
    if (flaggingInProgress.has(msg.id)) return;

    // Don't allow updates if agronomist has already resolved it
    const status = msg.flaggedQuery?.status;
    if (status && status !== "PENDING") {
      return; // Already resolved, can't update
    }

    setFlaggingMessageId(msg.id);

    // Check Set instead of message object (message might not have flaggedQuery data if just flagged)
    if (flaggedMessages.has(msg.id)) {
      // Updating existing flag - use cache first (instant), fallback to DB data
      setIsUpdatingFlag(true);
      const cached = flagDataCache.get(msg.id);
      setPreviousReason(cached?.reason || msg.flaggedQuery?.farmerReason || "");
      setPreviousUpdates(cached?.updates || msg.flaggedQuery?.farmerUpdates || "");
    } else {
      // Creating new flag
      setIsUpdatingFlag(false);
      setPreviousReason("");
      setPreviousUpdates("");
    }

    setShowFlagModal(true);
  };

  // Submit flag (create new or add update)
  const submitFlag = async () => {
    if (!flaggingMessageId) return;

    setFlaggingInProgress(prev => new Set(prev).add(flaggingMessageId));
    setShowFlagModal(false);
    setCopiedFlagMessages(new Set());
    setFlagReason("");

    try {
      const method = isUpdatingFlag ? "PATCH" : "POST";
      const body = isUpdatingFlag
        ? { update: flagReason }
        : { reason: flagReason || undefined };

      const response = await fetch(`/api/messages/${flaggingMessageId}/flag`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to flag message");
      }

      setFlaggedMessages(prev => new Set(prev).add(flaggingMessageId));

      // Update cache for instant UI feedback (AJAX will sync from DB on next refetch)
      setFlagDataCache(prev => {
        const newCache = new Map(prev);
        const existing = prev.get(flaggingMessageId);
        const timestamp = new Date().toISOString();

        if (isUpdatingFlag && existing) {
          // Append update to existing flag
          const newUpdate = `[${timestamp}] ${flagReason}`;
          const updatedText = existing.updates ? `${existing.updates}\n\n${newUpdate}` : newUpdate;
          newCache.set(flaggingMessageId, { reason: existing.reason, updates: updatedText });
        } else {
          // New flag - store with timestamp (matches backend format)
          const timestampedReason = flagReason ? `[${timestamp}] ${flagReason}` : `[${timestamp}] `;
          newCache.set(flaggingMessageId, { reason: timestampedReason, updates: "" });
        }
        return newCache;
      });

      notify.success(isUpdatingFlag ? "Flag updated" : "Message flagged for review");
    } catch (err) {
      console.error("Failed to flag message:", err);
      notify.error(err instanceof Error ? err.message : "Failed to flag message");
    } finally {
      setFlaggingInProgress(prev => {
        const next = new Set(prev);
        next.delete(flaggingMessageId);
        return next;
      });
      setFlaggingMessageId(null);
      setFlagReason("");
      setIsUpdatingFlag(false);
      setPreviousReason("");
      setPreviousUpdates("");
    }
  };

  // Helper: Parse farmer flag reasons from farmerReason + farmerUpdates
  const parseFarmerReasons = (farmerReason: string | null | undefined, farmerUpdates: string | null | undefined) => {
    const reasons: { ordinal: string; timestamp: string; message: string }[] = [];

    // Add initial reason
    if (farmerReason) {
      const match = farmerReason.match(/^\[(.+?)\]\s*(.*)$/);
      if (match) {
        reasons.push({ ordinal: "1st", timestamp: match[1], message: match[2] || "(no reason provided)" });
      }
    }

    // Parse updates
    if (farmerUpdates) {
      const lines = farmerUpdates.split('\n\n');
      lines.forEach((line, idx) => {
        const match = line.match(/^\[(.+?)\]\s*(.*)$/);
        if (match) {
          const ord = idx === 0 ? "2nd" : idx === 1 ? "3rd" : `${idx + 2}th`;
          reasons.push({ ordinal: ord, timestamp: match[1], message: match[2] || "(no reason provided)" });
        }
      });
    }

    return reasons;
  };

  // Helper: Format ISO timestamp to nice date
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
             date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return isoString;
    }
  };

  const flaggedCount = messages.filter(
    (msg) => msg.role === "ASSISTANT" && msg.isFlagged
  ).length;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden">
      {/* ── Conversation Header ──────────────────────────────────────────
          Mobile: [glass back] | [title + system pill centered] | [translate toggle] | [+ new chat]
          Desktop: breadcrumb [system /] [title ▾] with dropdown | [translate toggle right edge]
          pt-16 on mobile for Dynamic Island safe area — DO NOT reduce to pt-3 alone */}
      {title && (
        <div className="flex-shrink-0 bg-cultivate-bg-main pt-16 lg:pt-3 pb-3 px-3 lg:pl-4 lg:pr-3">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            aria-label="Open menu"
            className="w-9 h-9 flex items-center justify-center bg-cultivate-bg-elevated hover:bg-cultivate-border-element rounded-lg transition-colors flex-shrink-0"
          >
            <PanelLeft className="w-4 h-4 text-cultivate-text-primary rotate-180" />
          </button>
          <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1 mx-2">
            <span className="text-sm standalone:text-base font-medium text-white truncate w-full text-center">
              {title || "Untitled conversation"}
            </span>
            {showSubtitleInHeader && subtitle && (
              <span className="text-xs text-cultivate-text-secondary truncate w-full text-center">
                {subtitle}
              </span>
            )}
            {systemName && (
              <div className="inline-flex items-center gap-1 bg-cultivate-bg-elevated rounded-full px-2.5 py-0.5">
                <Box className="w-3 h-3 text-cultivate-text-secondary" />
                <span className="text-xs text-cultivate-text-secondary truncate max-w-[180px]">{systemName}</span>
              </div>
            )}
          </div>

          {showNewChatButton ? (
            <button
              onClick={onNewChat}
              className="w-11 h-11 bg-cultivate-bg-elevated hover:bg-cultivate-border-element rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Plus className="w-5 h-5 text-cultivate-green-light" />
            </button>
          ) : (
            <div className="w-11 h-11 flex-shrink-0" />
          )}
        </div>

        {/* Desktop breadcrumb header */}
        <div className="hidden lg:flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-1 min-w-0">
          {(systemName || (showSubtitleInHeader && subtitle)) && (
            <>
              <span className="text-sm text-cultivate-text-primary hover:text-white truncate cursor-pointer transition-colors">
                {systemName || subtitle}
              </span>
              <span className="text-sm text-cultivate-text-tertiary flex-shrink-0">/</span>
            </>
          )}
          {/* Title + chevron — independent hover zones */}
          <div className={`flex min-w-0 items-stretch rounded-lg overflow-hidden cursor-pointer relative ${
            headerMenuOpen ? "bg-cultivate-bg-hover" : "hover:bg-cultivate-bg-hover"
          }`}>
            <span className="text-sm text-cultivate-text-primary truncate min-w-0 flex-1 py-1 pl-2 pr-1 hover:bg-cultivate-bg-hover-dark transition-colors">
              {title || "Untitled conversation"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("Chevron clicked! Current state:", headerMenuOpen, "Setting to:", !headerMenuOpen);
                setHeaderMenuOpen(!headerMenuOpen);
              }}
              className={`${headerMenuOpen ? "bg-cultivate-bg-hover-dark" : "hover:bg-cultivate-bg-hover-dark"} transition-all px-1.5 self-stretch flex items-center`}
            >
              <ChevronDown className="w-3.5 h-3.5 text-cultivate-text-secondary hover:text-white transition-colors" strokeWidth={1.5} />
            </button>

            {headerMenuOpen && (
              <>
                <div className="absolute left-0 top-full mt-1 bg-cultivate-bg-elevated rounded-xl shadow-xl border border-cultivate-border-element py-1.5 z-[101] min-w-[220px] whitespace-nowrap">
                  <div className="px-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                    >
                      <Share className="w-4 h-4" />Share
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />Rename
                    </button>
                    {systemName ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); onRemoveFromSystem?.(); }}
                        className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                      >
                        <Unlink className="w-4 h-4" />Remove from system
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); onAddToSystem?.(); }}
                        className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />Add to system
                      </button>
                    )}
                  </div>
                  <div className="border-t border-cultivate-border-element/70 my-1 mx-1.5" />
                  <div className="px-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />Delete
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 z-[100]" onClick={() => setHeaderMenuOpen(false)} />
              </>
            )}
          </div>
          </div>
        </div>
      </div>
      )}

      {highlightFlaggedMessages && flaggedCount > 0 && (
        <div className="flex-shrink-0 px-3 lg:px-4 py-2 bg-cultivate-beige/5 border-y border-cultivate-beige/10 flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-cultivate-beige" />
          <span className="text-xs text-cultivate-beige">
            {flaggedCount === 1
              ? "1 flagged assistant message highlighted below"
              : `${flaggedCount} flagged assistant messages highlighted below`}
          </span>
        </div>
      )}

      {/* ── Scroll container — messages + sticky input inside ─────────────
          Input is INSIDE this scroll container (not a flex sibling) so that
          sticky bottom-0 actually works and the gradient overlaps messages.
          When no title AND no messages (welcome screen), skip scroll wrapper - just render input */}
      {!title && messages.length === 0 ? (
        // Welcome screen: only render the sticky input (caller handles layout)
        <>
          {/* ── Sticky Input ────────────────────────────────────────────
              Standalone: glass gradient overlay, transparent bg
              Desktop/web: solid bg, centered max width */}
          <div className={`${isStandalone ? "relative z-30 bg-transparent pb-4 pt-0" : "bg-cultivate-bg-main pb-2 lg:pb-6"}`}>
            {isStandalone && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-cultivate-bg-main/70 via-cultivate-bg-main/40 to-transparent backdrop-blur-[0.5px]" />
            )}
          <div className={isStandalone ? standaloneComposerShell : webComposerShell}>
            <div
              onDragEnter={handleComposerDragEnter}
              onDragOver={handleComposerDragOver}
              onDragLeave={handleComposerDragLeave}
              onDrop={handleComposerDrop}
              className={`${composerCardClass} ${
                isDraggingImages
                  ? "bg-cultivate-bg-hover ring-1 ring-cultivate-green-light/60"
                  : "bg-cultivate-bg-elevated"
              }`}
            >
                {renderPendingImages}
                {isDraggingImages && (
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
                    if (!inputProps || !e.target.files || e.target.files.length === 0) return;
                    inputProps.onSelectImages(e.target.files);
                    e.target.value = "";
                  }}
                />
                <textarea
                  placeholder={!isOnline ? "No connection · read only" : "How can I help you today?"}
                  rows={1}
                  value={inputProps?.value ?? ""}
                  onChange={inputProps && isOnline ? (e) => inputProps.onChange(e.target.value) : undefined}
                  onKeyDown={inputProps && isOnline ? (e) => { if (e.key === "Enter" && !e.shiftKey && inputProps.canSend) { e.preventDefault(); inputProps.onSend(); } } : undefined}
                  readOnly={!inputProps || voiceState !== "idle" || !isOnline}
                  onFocus={() => setIsComposerFocused(true)}
                  onBlur={() => setIsComposerFocused(false)}
                  className="w-full px-2 py-1 focus:outline-none resize-none text-white placeholder-cultivate-text-tertiary bg-transparent text-sm standalone:text-base lg:text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  {/* Left: attachment menu + voice input (only in real mode) */}
                  <div className="flex items-center gap-2">
                    {/* Attachment menu (images, docs, systems) - only in real mode */}
                    {inputProps && (
                      <div className="relative">
                        <button
                          onClick={() => setShowAttachMenu(!showAttachMenu)}
                          className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
                          title="Attach"
                        >
                          <Plus className="w-5 h-5 text-cultivate-text-primary" />
                        </button>

                        {/* Attachment dropdown */}
                        {showAttachMenu && (
                        <>
                          {/* Menu */}
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
                                  // TODO: Implement document upload
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                Upload document
                              </button>
                            </div>
                          </div>
                          {/* Backdrop (after menu so menu is clickable) */}
                          <div
                            className="fixed inset-0 z-[100]"
                            onClick={() => setShowAttachMenu(false)}
                          />
                        </>
                      )}
                      </div>
                    )}

                    {/* Voice input button (Claude-style, only in real mode) */}
                    {inputProps && isSpeechSupported && (
                      <div className="flex items-center gap-2">
                        {/* Mic icon (shows when connecting/listening/error) */}
                        {voiceState !== "idle" && (
                          <Mic className="w-5 h-5 text-cultivate-text-secondary" />
                        )}

                        {/* State-based button */}
                        {voiceState === "idle" && (
                          <button
                            onClick={handleVoiceClick}
                            disabled={inputProps.isStreaming}
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
                            title={speechError || "Error"}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>Error</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: agent selector + send button */}
                  <div className="flex items-center gap-2">
                    {inputProps ? (
                      /* Real mode: agent dropdown */
                      <Dropdown
                        variant="pill"
                        value={inputProps.agents.find((agent) => agent.name === inputProps.selectedAgent)?.id ?? ""}
                        onChange={(id) => {
                          const agent = inputProps.agents.find((item) => item.id === id);
                          if (!agent) return;
                          inputProps.onAgentSelect(agent.id, agent.name);
                          inputProps.setShowAgentMenu(false);
                        }}
                        options={inputProps.agents.map((agent) => ({ value: agent.id, label: agent.name }))}
                        placeholder="Select agent..."
                        className="min-w-[170px] border-0 px-0 py-0 text-sm standalone:text-base lg:text-sm shadow-none hover:border-transparent focus:border-transparent bg-transparent"
                      />
                    ) : (
                      /* Demo mode: static agent label */
                      <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-secondary">
                        {demoAgentLabel || "General Farm Advisor"}
                      </span>
                    )}

                    {/* Language Selector (real mode only) */}
                    {inputProps && (
                      <div className="relative">
                        <button
                          onClick={() => inputProps.setShowLanguageMenu(!inputProps.showLanguageMenu)}
                          className="flex items-center gap-1.5 text-cultivate-text-primary hover:text-white transition-colors text-sm standalone:text-base lg:text-sm"
                          title="Select language"
                        >
                          <Globe className="w-4 h-4" />
                          <span className="hidden lg:inline">{inputProps.languages.find(l => l.code === inputProps.selectedLanguage)?.name || 'English'}</span>
                          <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        {inputProps.showLanguageMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => inputProps.setShowLanguageMenu(false)} />
                            <div className="absolute bottom-full right-0 mb-2 bg-cultivate-bg-elevated rounded-lg shadow-lg border border-cultivate-border-element py-2 z-50 min-w-[180px]">
                              {inputProps.languages.map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => { inputProps.onLanguageSelect(lang.code); inputProps.setShowLanguageMenu(false); }}
                                  className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-cultivate-border-element transition-colors flex items-center gap-2 ${inputProps.selectedLanguage === lang.code ? "text-cultivate-green-light" : "text-cultivate-text-primary"}`}
                                >
                                  <span>{lang.flag}</span>
                                  <span>{lang.name}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Offline indicator — replaces send button when disconnected */}
                    {!isOnline && inputProps ? (
                      <div className="flex items-center gap-1.5 text-cultivate-text-tertiary px-1">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-xs">Offline</span>
                      </div>
                    ) : inputProps ? (
                      inputProps.isStreaming ? (
                        <div className="p-2">
                          <Loader2 className="w-5 h-5 text-cultivate-green-light animate-spin" />
                        </div>
                      ) : (
                        <button
                          onClick={() => { inputProps.onSend(); inputProps.onSendIconCycle(); }}
                          disabled={!inputProps.canSend}
                          className="p-2 bg-cultivate-green-light text-white rounded-xl hover:bg-cultivate-green-dark transition-colors disabled:opacity-40"
                        >
                          {inputProps.sendIcon === "cabbage" && <CabbageIcon />}
                          {inputProps.sendIcon === "plane" && <PaperPlaneIcon />}
                          {inputProps.sendIcon === "sprout" && <SproutIcon />}
                        </button>
                      )
                    ) : (
                      <button className="p-2 bg-cultivate-green-light text-white rounded-xl hover:bg-cultivate-green-dark transition-colors opacity-40 cursor-default">
                        <CabbageIcon />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Normal conversation view with scroll container
        <div className="relative flex-1 min-h-0 min-w-0">
          <div className="thin-scrollbar h-full overflow-y-auto overflow-x-hidden">
            <div className={`mx-auto flex min-h-full w-full ${conversationMaxWidth} flex-col`}>
              {/* space-y-4: gap between messages.
                  pb-12 standalone: breathing room after "AI can make mistakes" before input */}
              <div className={`flex-1 ${messagePadding} pt-6 ${shouldShowComposer ? (isStandalone ? "pb-12" : "pb-6") : "pb-8"} space-y-4`}>
              {messagesLoading ? (
                <div className="flex flex-1 items-center justify-center min-h-[60vh]">
                  <Loader2 className="w-5 h-5 text-cultivate-text-secondary animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id}>
                      {msg.role === "USER" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[75%] bg-cultivate-bg-elevated rounded-2xl px-4 py-3">
                            {renderMessageAttachments(msg.attachments)}
                            {msg.content && (
                              <p className="text-base text-white whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="group">
                          <div className={`rounded-2xl transition-colors ${
                            highlightFlaggedMessages && msg.isFlagged
                              ? "relative border border-cultivate-beige/20 bg-cultivate-beige/5 px-4 py-3"
                              : ""
                          }`}>
                            {highlightFlaggedMessages && msg.isFlagged && (
                              <div className="absolute -inset-2 rounded-[1.5rem] border-2 border-cultivate-beige/30 pointer-events-none" />
                            )}
                            {renderMessageAttachments(msg.attachments)}
                            <div className="prose prose-base prose-invert max-w-none text-cultivate-text-primary leading-relaxed prose-p:my-1 prose-headings:text-cultivate-text-primary prose-headings:font-semibold prose-h2:text-base prose-h3:text-base prose-strong:text-cultivate-text-primary prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          </div>

                          {/* Agronomist correction (shown below message) */}
                          {msg.role === "ASSISTANT" && msg.flaggedQuery?.status === "CORRECTED" && msg.flaggedQuery?.agronomistResponse && (
                            <div className="mt-3 pl-4 border-l-2 border-cultivate-green-light/30">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-cultivate-green-light/20 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-3.5 h-3.5 text-cultivate-green-light" />
                                </div>
                                <span className="text-xs font-medium text-cultivate-green-light">Expert Correction</span>
                              </div>
                              <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary prose-p:my-1">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {msg.flaggedQuery.agronomistResponse}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Agronomist verification notes (shown below message) */}
                          {msg.role === "ASSISTANT" && msg.flaggedQuery?.status === "VERIFIED" && msg.flaggedQuery?.verificationNotes && (
                            <div className="mt-3 pl-4 border-l-2 border-cultivate-green-light/30">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-cultivate-green-light/20 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-3.5 h-3.5 text-cultivate-green-light" />
                                </div>
                                <span className="text-xs font-medium text-cultivate-green-light">Verified by Expert</span>
                              </div>
                              <p className="text-sm text-cultivate-text-primary leading-relaxed">
                                {msg.flaggedQuery.verificationNotes}
                              </p>
                            </div>
                          )}

                          {/* Why you flagged this (shown after review, before actions) */}
                          {msg.role === "ASSISTANT" && msg.flaggedQuery?.farmerReason && (() => {
                            const reasons = parseFarmerReasons(msg.flaggedQuery.farmerReason, msg.flaggedQuery.farmerUpdates);
                            const currentIdx = currentReasonIndex.get(msg.id) || 0;
                            const currentReason = reasons[currentIdx];

                            if (!currentReason) return null;

                            return (
                              <div className="mt-3 pl-4 border-l-2 border-cultivate-text-secondary/30">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-cultivate-text-secondary">Why You Flagged This</span>
                                  {reasons.length > 1 && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setCurrentReasonIndex(prev => {
                                            const newMap = new Map(prev);
                                            const newIdx = currentIdx > 0 ? currentIdx - 1 : reasons.length - 1;
                                            newMap.set(msg.id, newIdx);
                                            return newMap;
                                          });
                                        }}
                                        className="p-1 hover:bg-cultivate-bg-elevated rounded transition-colors"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5 text-cultivate-text-secondary" />
                                      </button>
                                      <span className="text-xs text-cultivate-text-tertiary">{currentIdx + 1}/{reasons.length}</span>
                                      <button
                                        onClick={() => {
                                          setCurrentReasonIndex(prev => {
                                            const newMap = new Map(prev);
                                            const newIdx = currentIdx < reasons.length - 1 ? currentIdx + 1 : 0;
                                            newMap.set(msg.id, newIdx);
                                            return newMap;
                                          });
                                        }}
                                        className="p-1 hover:bg-cultivate-bg-elevated rounded transition-colors"
                                      >
                                        <ChevronRight className="w-3.5 h-3.5 text-cultivate-text-secondary" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-cultivate-text-tertiary mb-1">
                                  {currentReason.ordinal} • {formatTimestamp(currentReason.timestamp)}
                                </p>
                                <p className="text-sm text-cultivate-text-secondary leading-relaxed">
                                  {currentReason.message}
                                </p>
                              </div>
                            );
                          })()}
                          {showMessageActions ? (
                            <div className="flex items-center mt-2">
                              <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <Tooltip content="Copy">
                                  <button
                                    onClick={() => handleCopy(msg.id, msg.content)}
                                    className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
                                  >
                                    {copiedMessages.has(msg.id) ? (
                                      <Check className="w-3.5 h-3.5 text-cultivate-text-primary transition-colors" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-cultivate-text-secondary hover:text-cultivate-text-primary transition-colors" />
                                    )}
                                  </button>
                                </Tooltip>
                                <Tooltip content="Give positive feedback">
                                  <button
                                    onClick={() => {
                                      console.log("Thumbs up for message:", msg.id);
                                    }}
                                    className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5 text-cultivate-text-secondary hover:text-cultivate-text-primary transition-colors" />
                                  </button>
                                </Tooltip>
                                <Tooltip content={
                                  msg.flaggedQuery?.status === "VERIFIED" ? "Resolved by agronomist" :
                                  msg.flaggedQuery?.status === "CORRECTED" ? "Corrected by agronomist" :
                                  flaggedMessages.has(msg.id) ? "Update flag" :
                                  "Flag for review"
                                }>
                                  <button
                                    onClick={() => handleFlag(msg)}
                                    disabled={
                                      flaggingInProgress.has(msg.id) ||
                                      (msg.flaggedQuery?.status !== undefined && msg.flaggedQuery.status !== "PENDING")
                                    }
                                    className={`p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors ${
                                      flaggingInProgress.has(msg.id)
                                        ? "opacity-50"
                                        : ""
                                    }`}
                                  >
                                    <Flag
                                      fill={
                                        msg.flaggedQuery?.status === "VERIFIED"
                                          ? "currentColor"
                                          : msg.flaggedQuery?.status === "CORRECTED"
                                            ? "none"
                                            : flaggedMessages.has(msg.id)
                                              ? "currentColor"
                                              : "none"
                                      }
                                      className={`w-3.5 h-3.5 transition-colors ${
                                        msg.flaggedQuery?.status === "VERIFIED" || msg.flaggedQuery?.status === "CORRECTED"
                                          ? "text-cultivate-green-light"
                                          : flaggedMessages.has(msg.id)
                                            ? "text-red-400"
                                            : "text-cultivate-text-secondary hover:text-cultivate-text-primary"
                                      }`}
                                    />
                                  </button>
                                </Tooltip>
                                <Tooltip content="Retry">
                                  <button
                                    onClick={() => {
                                      console.log("Retry message:", msg.id);
                                    }}
                                    className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
                                  >
                                    <RotateCw className="w-3.5 h-3.5 text-cultivate-text-secondary hover:text-cultivate-text-primary transition-colors" />
                                  </button>
                                </Tooltip>
                              </div>
                              {msg.role === "ASSISTANT" && msg.confidenceScore !== undefined && msg.confidenceScore !== null && (
                                <Tooltip content="Confidence Score">
                                  <div className={`ml-2 text-xs font-medium lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ${
                                    msg.confidenceScore < 0.6
                                      ? "text-cultivate-beige"
                                      : msg.confidenceScore < 0.8
                                        ? "text-cultivate-teal"
                                        : "text-cultivate-green-light"
                                  }`}>
                                    {Math.round(msg.confidenceScore * 100)}%
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-3">
                              {msg.confidenceScore !== undefined && msg.confidenceScore !== null && (
                                <span className={`text-xs font-medium ${
                                  msg.confidenceScore < 0.6
                                    ? "text-cultivate-beige"
                                    : msg.confidenceScore < 0.8
                                      ? "text-cultivate-teal"
                                      : "text-cultivate-green-light"
                                }`}>
                                  {Math.round(msg.confidenceScore * 100)}% confidence
                                </span>
                              )}
                              {msg.isFlagged && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-cultivate-beige/10 px-2 py-0.5 text-xs text-cultivate-beige">
                                  <Flag className="w-3 h-3" />
                                  Flagged
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                    )}
                  </div>
                ))}

                  {/* Streaming indicator (real mode only) */}
                  {isStreaming && (
                    <div>
                      {streamingContent ? (
                        <div className="prose prose-base prose-invert max-w-none text-cultivate-text-primary leading-relaxed prose-p:my-1 prose-headings:text-cultivate-text-primary prose-headings:font-semibold prose-h2:text-base prose-h3:text-base prose-strong:text-cultivate-text-primary prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center py-1">
                          <span className="w-1.5 h-1.5 bg-cultivate-green-light rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-cultivate-green-light rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-cultivate-green-light rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disclaimer — in-flow on standalone, under input otherwise (only show when messages exist or are loading) */}
                  {isStandalone && (messages.length > 0 || messagesLoading) && (
                    <div className="mt-6 ">
                      <p className="text-sm text-cultivate-text-primary text-right leading-snug max-w-[250px] ml-auto">
                        AI can make mistakes.<br />Please verify important information.
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* ── Sticky Input ────────────────────────────────────────────
                Standalone: glass gradient overlay, transparent bg, -mt-10 to overlap messages
                Desktop/web: solid bg, mx-3.5 side margins (inside max-w-3xl container) */}
            <div className={`${shouldShowComposer ? `sticky bottom-0 ${isStandalone ? "relative z-30 -mt-10 bg-transparent pb-4 pt-0" : "bg-cultivate-bg-main pb-2"}` : "hidden"}`}>
              {isStandalone && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-cultivate-bg-main/70 via-cultivate-bg-main/40 to-transparent backdrop-blur-[0.5px]" />
              )}
              <div className={isStandalone ? standaloneComposerShell : "mx-3.5 mb-1"}>
                <div
                  onDragEnter={handleComposerDragEnter}
                  onDragOver={handleComposerDragOver}
                  onDragLeave={handleComposerDragLeave}
                  onDrop={handleComposerDrop}
                  className={`${composerCardClass} ${
                    isDraggingImages
                      ? "bg-cultivate-bg-hover ring-1 ring-cultivate-green-light/60"
                      : "bg-cultivate-bg-elevated"
                  }`}
                >
                  {renderPendingImages}
                  {isDraggingImages && (
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
                      if (!inputProps || !e.target.files || e.target.files.length === 0) return;
                      inputProps.onSelectImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <textarea
                    placeholder={
                      inputProps
                        ? voiceState === "connecting"
                          ? "Connecting..."
                          : voiceState === "listening"
                            ? "Listening..."
                            : messages.length === 0 && !messagesLoading
                              ? "How can I help you today?"
                              : "Ask a follow-up..."
                        : "Reply..."
                    }
                    rows={1}
                    value={inputProps?.value ?? ""}
                    onChange={inputProps ? (e) => inputProps.onChange(e.target.value) : undefined}
                    onKeyDown={inputProps ? (e) => { if (e.key === "Enter" && !e.shiftKey && inputProps.canSend) { e.preventDefault(); inputProps.onSend(); } } : undefined}
                    readOnly={!inputProps || voiceState !== "idle"}
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => setIsComposerFocused(false)}
                    className="w-full px-2 py-1 focus:outline-none resize-none text-white placeholder-cultivate-text-tertiary bg-transparent text-sm standalone:text-base lg:text-sm"
                  />
                  <div className="flex items-center justify-between mt-2">
                    {/* Left: attachment menu + voice input (only in real mode) */}
                    <div className="flex items-center gap-2">
                      {/* Attachment menu (images, docs, systems) - only in real mode */}
                      {inputProps && (
                        <div className="relative">
                          <button
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
                            title="Attach"
                          >
                            <Plus className="w-5 h-5 text-cultivate-text-primary" />
                          </button>

                          {/* Attachment dropdown */}
                          {showAttachMenu && (
                          <>
                            {/* Menu */}
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
                                    // TODO: Implement document upload
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  Upload document
                                </button>
                              </div>
                              {messages.length > 0 && (
                                <>
                                  <div className="border-t border-cultivate-border-element my-1 mx-2" />
                                  <div className="px-1.5">
                                    {systemName ? (
                                      <button
                                        onClick={() => {
                                          setShowAttachMenu(false);
                                          onRemoveFromSystem?.();
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                      >
                                        <Unlink className="w-4 h-4" />
                                        Remove from system
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setShowAttachMenu(false);
                                          onAddToSystem?.();
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover rounded-lg flex items-center gap-2.5 transition-colors"
                                      >
                                        <FolderPlus className="w-4 h-4" />
                                        Add to system
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Backdrop (after menu so menu is clickable) */}
                            <div
                              className="fixed inset-0 z-[100]"
                              onClick={() => setShowAttachMenu(false)}
                            />
                          </>
                        )}
                        </div>
                      )}

                      {/* Voice input button (Claude-style, only in real mode) */}
                      {inputProps && isSpeechSupported && (
                        <div className="flex items-center gap-2">
                          {/* Mic icon (shows when connecting/listening/error) */}
                          {voiceState !== "idle" && (
                            <Mic className="w-5 h-5 text-cultivate-text-secondary" />
                          )}

                          {/* State-based button */}
                          {voiceState === "idle" && (
                            <button
                              onClick={handleVoiceClick}
                              disabled={inputProps.isStreaming}
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
                              title={speechError || "Error"}
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>Error</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: agent selector + send button */}
                    <div className="flex items-center gap-2">
                      {inputProps ? (
                        /* Real mode: agent dropdown */
                        <Dropdown
                          variant="pill"
                          value={inputProps.agents.find((agent) => agent.name === inputProps.selectedAgent)?.id ?? ""}
                          onChange={(id) => {
                            const agent = inputProps.agents.find((item) => item.id === id);
                            if (!agent) return;
                            inputProps.onAgentSelect(agent.id, agent.name);
                            inputProps.setShowAgentMenu(false);
                          }}
                          options={inputProps.agents.map((agent) => ({ value: agent.id, label: agent.name }))}
                          placeholder="Select agent..."
                          className="min-w-[170px] border-0 px-0 py-0 text-sm standalone:text-base lg:text-sm shadow-none hover:border-transparent focus:border-transparent bg-transparent"
                        />
                      ) : (
                        /* Demo mode: static agent label */
                        <span className="text-sm standalone:text-base lg:text-sm text-cultivate-text-secondary">
                          {demoAgentLabel || "General Farm Advisor"}
                        </span>
                      )}

                      {/* Language Selector (real mode only) */}
                      {inputProps && (
                        <div className="relative">
                          <button
                            onClick={() => inputProps.setShowLanguageMenu(!inputProps.showLanguageMenu)}
                            className="flex items-center gap-1.5 text-cultivate-text-primary hover:text-white transition-colors text-sm standalone:text-base lg:text-sm"
                            title="Select language"
                          >
                            <Globe className="w-4 h-4" />
                            <span className="hidden lg:inline">{inputProps.languages.find(l => l.code === inputProps.selectedLanguage)?.name || 'English'}</span>
                            <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                          {inputProps.showLanguageMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => inputProps.setShowLanguageMenu(false)} />
                              <div className="absolute bottom-full right-0 mb-2 bg-cultivate-bg-elevated rounded-lg shadow-lg border border-cultivate-border-element py-2 z-50 min-w-[180px]">
                                {inputProps.languages.map((lang) => (
                                  <button
                                    key={lang.code}
                                    onClick={() => { inputProps.onLanguageSelect(lang.code); inputProps.setShowLanguageMenu(false); }}
                                    className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-cultivate-border-element transition-colors flex items-center gap-2 ${inputProps.selectedLanguage === lang.code ? "text-cultivate-green-light" : "text-cultivate-text-primary"}`}
                                  >
                                    <span>{lang.flag}</span>
                                    <span>{lang.name}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Send button */}
                      {inputProps ? (
                        inputProps.isStreaming ? (
                          <div className="p-2">
                            <Loader2 className="w-5 h-5 text-cultivate-green-light animate-spin" />
                          </div>
                        ) : (
                          <button
                            onClick={() => { inputProps.onSend(); inputProps.onSendIconCycle(); }}
                            disabled={!inputProps.canSend}
                            className="p-2 bg-cultivate-green-light text-white rounded-xl hover:bg-cultivate-green-dark transition-colors disabled:opacity-40"
                          >
                            {inputProps.sendIcon === "cabbage" && <CabbageIcon />}
                            {inputProps.sendIcon === "plane" && <PaperPlaneIcon />}
                            {inputProps.sendIcon === "sprout" && <SproutIcon />}
                          </button>
                        )
                      ) : (
                        <button className="p-2 bg-cultivate-green-light text-white rounded-xl hover:bg-cultivate-green-dark transition-colors opacity-40 cursor-default">
                          <CabbageIcon />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {shouldShowComposer && !isStandalone && (messages.length > 0 || messagesLoading) && (
                  <p className="mt-2 text-xs text-cultivate-text-secondary text-center leading-snug">
                    AI can make mistakes. Please verify important information.
                  </p>
                )}
                </div>
              </div>
          </div>
        </div>
        {!shouldShowComposer && footerMeta && (
          <div className="flex-shrink-0 px-3 lg:px-4 py-3 border-t border-cultivate-border-element">
            <p className="text-xs text-cultivate-text-secondary text-center">
              {footerMeta}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Flag modal */}
      <Dialog open={showFlagModal} onOpenChange={(open) => { if (!open) { setShowFlagModal(false); setFlagReason(""); setCopiedFlagMessages(new Set()); } }}>
      {showFlagModal && (() => {
        // Parse all flag messages (initial reason + updates) - both have timestamps now
        const allMessages: Array<{ text: string; date: string }> = [];

        // Debug logging
        console.log('Flag modal - previousReason:', previousReason);
        console.log('Flag modal - previousUpdates:', previousUpdates);

        // Helper to parse timestamped message: [timestamp] text
        const parseMessage = (msg: string) => {
          const trimmed = msg.trim();
          const match = trimmed.match(/^\[(.*?)\]\s*(.*)$/);
          if (match) {
            const timestamp = new Date(match[1]);
            const text = match[2];
            const formatted = timestamp.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            return { text, date: formatted };
          }
          // Fallback for messages without timestamp (shouldn't happen with new format)
          return { text: trimmed, date: "No date" };
        };

        // Parse initial reason
        if (previousReason) {
          allMessages.push(parseMessage(previousReason));
        }

        // Parse updates
        if (previousUpdates) {
          const updates = previousUpdates.split('\n\n').map(parseMessage);
          allMessages.push(...updates);
        }

        console.log('Flag modal - allMessages:', allMessages);

        // Total count includes initial + updates (max 3: 1 initial + 2 updates)
        const canAddMore = allMessages.length < 3;

        return (
          <DialogContent
            showCloseButton={false}
            className="bg-cultivate-bg-elevated border-0 p-0 rounded-none sm:rounded-2xl shadow-none max-w-none w-auto"
          >
            <DialogTitle className="sr-only">{isUpdatingFlag ? "Update Flag" : "Flag for Review"}</DialogTitle>
            <div className="bg-cultivate-bg-elevated rounded-lg border border-cultivate-border-element p-5 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-base font-semibold text-cultivate-text-primary mb-2">
                {isUpdatingFlag ? "Update flag" : "Flag for Review"}
              </h3>
              <p className="text-xs text-cultivate-text-secondary mb-3">
                {isUpdatingFlag
                  ? `Add additional context to your flag, you have up to 2 revisions`
                  : <>This message will be sent to an agronomist for review.<br />You can optionally provide a reason:</>}
              </p>

              {/* Show previous messages if updating */}
              {isUpdatingFlag && allMessages.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-cultivate-text-secondary mb-1.5">
                    Your flag reasons{!canAddMore ? ' (limit reached)' : ':'}
                  </p>
                  <div className="space-y-1">
                    {allMessages.map((msg, idx) => {
                      // Sequential numbering: 1st, 2nd, 3rd (max 3 total: 1 initial + 2 updates)
                      const ordinals = ['1st', '2nd', '3rd'];
                      const ordinal = ordinals[idx] || `${idx + 1}th`;
                      const isUpdate = idx > 0; // First is initial, rest are updates

                      return (
                        <div key={idx} className="flex items-start gap-2 bg-cultivate-bg-main rounded px-2 py-1.5 group">
                          <p className="flex-1 text-xs break-words">
                            <span className="text-cultivate-text-secondary">{ordinal} · {msg.date} · </span>
                            <span className={isUpdate ? "font-semibold text-cultivate-text-primary" : "text-cultivate-text-primary"}>
                              {msg.text}
                            </span>
                          </p>
                          <button
                            onClick={() => handleFlagCopy(idx, msg.text)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cultivate-bg-elevated rounded transition-all flex-shrink-0"
                            title="Copy"
                          >
                            {copiedFlagMessages.has(idx) ? (
                              <Check className="w-3 h-3 text-cultivate-green-light" />
                            ) : (
                              <Copy className="w-3 h-3 text-cultivate-text-secondary" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <textarea
                value={flagReason}
                onChange={(e) => {
                  setFlagReason(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                placeholder={isUpdatingFlag ? "Add update..." : "Why are you flagging this? (optional)"}
                className="w-full px-2.5 py-2 bg-cultivate-bg-main text-cultivate-text-primary text-sm placeholder-cultivate-text-tertiary border border-cultivate-border-element rounded-lg resize-none focus:outline-none focus:border-cultivate-green-light mb-3 overflow-hidden"
                rows={1}
                style={{ minHeight: "36px" }}
                disabled={isUpdatingFlag && !canAddMore}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowFlagModal(false); setFlagReason(""); setCopiedFlagMessages(new Set()); }}
                  className="px-3 py-1.5 text-xs text-cultivate-text-primary hover:bg-cultivate-border-element rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFlag}
                  disabled={isUpdatingFlag && !canAddMore}
                  className="px-3 py-1.5 text-xs bg-cultivate-button-primary text-white rounded-lg hover:bg-cultivate-button-primary-hover transition-colors disabled:opacity-40"
                >
                  {isUpdatingFlag ? "Add Update" : "Submit"}
                </button>
              </div>
            </div>
          </DialogContent>
        );
      })()}
      </Dialog>
    </div>
  );
}
