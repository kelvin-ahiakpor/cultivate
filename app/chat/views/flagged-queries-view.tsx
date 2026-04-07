"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Flag, GripVertical, Loader2, MessageCircle, PanelLeft, User, X, WifiOff } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import { useFarmerFlaggedQueries, type FarmerFlaggedQueryItem } from "@/lib/hooks/use-farmer-flagged-queries";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { SproutIcon } from "@/components/cultivate-ui";

type Filter = "all" | "PENDING" | "VERIFIED" | "CORRECTED";

const LAST_SEEN_KEY = "cultivate-farmer-flagged-last-seen";
const DEFAULT_PANEL_WIDTH = 576;
const MIN_PANEL_WIDTH = 400;

interface FlaggedQueriesViewProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  onOpenConversation: (query: FarmerFlaggedQueryItem) => void;
  onViewedUpdates?: () => void;
  demoMode?: boolean;
}

interface ConversationPanelMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp: string;
  confidenceScore?: number;
  isFlagged?: boolean;
}

function getStatusColor(status: Filter | FarmerFlaggedQueryItem["status"]) {
  switch (status) {
    case "PENDING":
      return "bg-cultivate-beige/20 text-cultivate-beige";
    case "VERIFIED":
      return "bg-cultivate-green-light/20 text-cultivate-green-light";
    case "CORRECTED":
      return "bg-cultivate-teal/20 text-cultivate-teal";
    default:
      return "bg-cultivate-bg-elevated text-cultivate-text-secondary";
  }
}

function parseFarmerReasons(farmerReason: string | null | undefined, farmerUpdates: string | null | undefined) {
  const reasons: { ordinal: string; timestamp: string; message: string }[] = [];

  if (farmerReason) {
    const match = farmerReason.match(/^\[(.+?)\]\s*(.*)$/);
    if (match) {
      reasons.push({ ordinal: "1st", timestamp: match[1], message: match[2] || "(no reason provided)" });
    }
  }

  if (farmerUpdates) {
    const lines = farmerUpdates.split("\n\n");
    lines.forEach((line, idx) => {
      const match = line.match(/^\[(.+?)\]\s*(.*)$/);
      if (match) {
        const ordinal = idx === 0 ? "2nd" : idx === 1 ? "3rd" : `${idx + 2}th`;
        reasons.push({ ordinal, timestamp: match[1], message: match[2] || "(no reason provided)" });
      }
    });
  }

  return reasons;
}

function formatReasonTimestamp(isoString: string) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
      date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return isoString;
  }
}

export default function FlaggedQueriesView({
  sidebarOpen = true,
  setSidebarOpen,
  onOpenConversation,
  onViewedUpdates,
  demoMode = false,
}: FlaggedQueriesViewProps) {
  const isOnline = useOnlineStatus();
  const [filter, setFilter] = useState<Filter>("all");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentReasonIndex, setCurrentReasonIndex] = useState(0);
  const flagReasonsRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelQuery, setChatPanelQuery] = useState<FarmerFlaggedQueryItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const flaggedMessageRef = useRef<HTMLDivElement>(null);
  const apiData = useFarmerFlaggedQueries(filter === "all" ? "" : filter, 1, 20, demoMode);
  const { data: conversationData } = useSWR(
    !demoMode && chatPanelQuery?.conversationId
      ? `/api/conversations/${chatPanelQuery.conversationId}/messages`
      : null,
    (url: string) => fetch(url).then((res) => res.json())
  );

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
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const onViewedUpdatesRef = useRef(onViewedUpdates);
  onViewedUpdatesRef.current = onViewedUpdates;
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    onViewedUpdatesRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth;
      const clamped = Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), maxWidth);
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  useEffect(() => {
    if (chatPanelOpen && flaggedMessageRef.current) {
      const timer = setTimeout(() => {
        flaggedMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chatPanelOpen]);

  const reviewUpdates = useMemo(
    () => apiData.queries.filter((query) => query.reviewedAtIso),
    [apiData.queries]
  );

  const flaggedCountLabel = `${apiData.total} ${apiData.total === 1 ? "question flagged" : "questions flagged"}`;

  const handleOpenChatPanel = (query: FarmerFlaggedQueryItem) => {
    setChatPanelQuery(query);
    setCurrentReasonIndex(0);
    setChatPanelOpen(true);
    setIsClosing(false);
  };

  const handleCloseChatPanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setChatPanelOpen(false);
      setChatPanelQuery(null);
      setIsClosing(false);
      setPanelWidth(DEFAULT_PANEL_WIDTH);
    }, 300);
  };

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      <div className="flex-shrink-0 bg-cultivate-bg-main z-10 pb-4 pt-8 lg:pt-0">
        <div className="relative flex items-center justify-center mb-6 lg:hidden">
          {!sidebarOpen && setSidebarOpen && (
            <div className="absolute left-0">
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <PanelLeft className="w-5 h-5 text-white rotate-180" />
              </GlassCircleButton>
            </div>
          )}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </div>
            <p className="text-sm text-cultivate-text-secondary mt-1">{flaggedCountLabel}</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </div>
            <p className="text-sm text-cultivate-text-secondary mt-1">{flaggedCountLabel}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "PENDING", "VERIFIED", "CORRECTED"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filter === value
                  ? "bg-cultivate-bg-hover text-white"
                  : "bg-cultivate-bg-elevated text-cultivate-text-secondary hover:text-white"
              }`}
            >
              {value === "all" ? "All" : value.charAt(0) + value.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {reviewUpdates.length > 0 && (
          <div className="mt-4 mr-1 rounded-xl border border-cultivate-border-element bg-cultivate-bg-elevated px-4 py-3">
            <p className="text-sm text-white">
              {reviewUpdates.length === 1 ? "1 flagged query has a new expert response." : `${reviewUpdates.length} flagged queries have new expert responses.`}
            </p>
            <p className="text-xs text-cultivate-text-secondary mt-1">
              Open any item below to jump back into the related chat.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-6 thin-scrollbar scrollbar-outset">
        {apiData.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-cultivate-text-tertiary animate-spin" />
          </div>
        ) : apiData.queries.length === 0 ? (
          <div className="p-8 text-center">
            <Flag className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
            <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-tertiary`}>
              No flagged queries in this filter yet.
            </p>
          </div>
        ) : (
          <div className="mr-1 space-y-3">
            {apiData.queries.map((query) => (
              <div
                key={query.id}
                className="bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
                  className="w-full p-4 text-left flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white truncate">
                        {query.conversationTitle || "Conversation"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(query.status)}`}>
                        {query.status.charAt(0) + query.status.slice(1).toLowerCase()}
                      </span>
                      {query.confidenceScore != null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cultivate-border-element text-cultivate-text-secondary">
                          {(query.confidenceScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-cultivate-text-primary line-clamp-2">{query.farmerMessage}</p>
                    <div className="mt-1.5 min-w-0 space-y-1 lg:space-y-0 lg:flex lg:items-center lg:gap-2 lg:text-xs lg:text-cultivate-text-tertiary">
                      <p className="text-xs text-cultivate-text-secondary truncate lg:text-cultivate-text-tertiary">
                        {query.agentName}
                      </p>
                      <div className="hidden lg:flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-cultivate-text-tertiary/60">·</span>
                        <span className="min-w-0 truncate">{query.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-cultivate-text-tertiary lg:hidden">
                        <span className="shrink-0">{query.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-cultivate-text-tertiary flex-shrink-0 mt-1 transition-transform ${
                      expandedId === query.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedId === query.id && (
                  <div className="px-4 pb-4 border-t border-cultivate-border-element pt-4 space-y-4">
                    <div>
                      <p className="text-xs text-cultivate-text-tertiary mb-1.5">Your Question</p>
                      <div className="bg-cultivate-bg-main rounded-lg p-3">
                        <p className="text-sm text-cultivate-text-primary">{query.farmerMessage}</p>
                      </div>
                      {(query.farmerReason || query.farmerUpdates) && (
                        <button
                          onClick={() => {
                            const el = flagReasonsRefs.current.get(query.id);
                            el?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="mt-2 text-xs text-cultivate-beige hover:text-cultivate-beige/80 transition-colors flex items-center gap-1"
                        >
                          Click to see why you flagged this →
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className="text-xs text-cultivate-text-tertiary">Response You Flagged</p>
                        {query.status === "VERIFIED" && (
                          <CheckCircle className="w-3.5 h-3.5 text-cultivate-green-light" />
                        )}
                        {query.status === "CORRECTED" && (
                          <X className="w-3.5 h-3.5 text-cultivate-teal" />
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          query.status === "VERIFIED"
                            ? "bg-cultivate-green-light/5 border border-cultivate-green-light/20"
                            : query.status === "CORRECTED"
                              ? "bg-cultivate-teal/5 border border-cultivate-teal/20"
                              : "bg-cultivate-bg-main"
                        }`}
                      >
                        <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{query.agentResponse}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {(query.farmerReason || query.farmerUpdates) && (() => {
                      const allFlagMessages: Array<{ text: string; date: string }> = [];

                      const parseMessage = (msg: string) => {
                        const trimmed = msg.trim();
                        const match = trimmed.match(/^\[(.*?)\]\s*(.*)$/);
                        if (match) {
                          const timestamp = new Date(match[1]);
                          const text = match[2];
                          const formatted = timestamp.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                          return { text, date: formatted };
                        }
                        return { text: trimmed, date: "No date" };
                      };

                      if (query.farmerReason) {
                        allFlagMessages.push(parseMessage(query.farmerReason));
                      }

                      if (query.farmerUpdates) {
                        const updates = query.farmerUpdates.split("\n\n").map(parseMessage);
                        allFlagMessages.push(...updates);
                      }

                      return (
                        <div ref={(el) => { if (el) flagReasonsRefs.current.set(query.id, el); }}>
                          <p className="text-xs text-cultivate-beige mb-1.5">Why You Flagged This</p>
                          <div className="bg-cultivate-beige/5 border border-cultivate-beige/10 rounded-lg p-3 space-y-2">
                            {allFlagMessages.map((msg, idx) => {
                              const ordinals = ["1st", "2nd", "3rd"];
                              const ordinal = ordinals[idx] || `${idx + 1}th`;

                              return (
                                <div key={`${query.id}-${idx}`} className="flex items-start gap-2 text-xs">
                                  <span className="text-cultivate-beige/70 flex-shrink-0">{ordinal} · {msg.date} ·</span>
                                  <span className="text-cultivate-text-primary">{msg.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {query.status === "VERIFIED" && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <p className="text-xs text-cultivate-green-light">Expert Review</p>
                        </div>
                        <div className="bg-cultivate-green-light/5 border border-cultivate-green-light/20 rounded-lg p-3">
                          <p className="text-sm text-cultivate-text-primary">
                            {query.verificationNotes || "An agronomist reviewed this response and marked it accurate."}
                          </p>
                        </div>
                      </div>
                    )}

                    {query.status === "CORRECTED" && query.agronomistResponse && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <p className="text-xs text-cultivate-teal">Expert Correction</p>
                        </div>
                        <div className="bg-cultivate-teal/5 border border-cultivate-teal/20 rounded-lg p-3">
                          <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {query.agronomistResponse}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-cultivate-text-tertiary">
                        {query.status === "PENDING" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-cultivate-beige" />
                        ) : (
                          <CheckCircle className={`w-3.5 h-3.5 ${query.status === "CORRECTED" ? "text-cultivate-teal" : "text-cultivate-green-light"}`} />
                        )}
                        <span>{query.reviewedAt ? `Updated ${query.reviewedAt}` : `Flagged ${query.createdAt}`}</span>
                      </div>
                      <button
                        onClick={() => handleOpenChatPanel(query)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-secondary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Chat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {chatPanelOpen && chatPanelQuery && (() => {
        const conversation = conversationData
          ? {
              title: conversationData.conversation?.title || "Conversation",
              messages: (conversationData.messages || []).map((message: {
                id: string;
                role: "USER" | "ASSISTANT";
                content: string;
                timestamp: string;
                confidenceScore?: number;
                isFlagged?: boolean;
              }) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: message.timestamp,
                confidenceScore: message.confidenceScore,
                isFlagged: message.isFlagged,
              })),
            }
          : null;

        if (!conversation) {
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          );
        }

        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={handleCloseChatPanel} />
            <div
              className={`fixed top-0 right-0 h-full bg-cultivate-bg-sidebar border-l border-cultivate-border-subtle z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
                isClosing ? "translate-x-full" : "translate-x-0"
              }`}
              style={{ width: isDesktop ? `${panelWidth}px` : "100vw" }}
            >
              <div
                className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-cultivate-bg-sidebar rounded-full p-1.5 cursor-col-resize z-10 border border-cultivate-border-subtle hover:border-white shadow-lg group"
                onMouseDown={handleResizeStart}
                onDoubleClick={() => setPanelWidth(DEFAULT_PANEL_WIDTH)}
                title="Drag to resize, double-click to reset"
              >
                <GripVertical className="w-3.5 h-3.5 text-cultivate-beige group-hover:text-white transition-colors" />
              </div>

              <div className="flex items-center justify-between px-5 pt-16 pb-3 lg:py-4 border-b border-cultivate-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="lg:hidden">
                    <GlassCircleButton onClick={handleCloseChatPanel} aria-label="Back">
                      <ArrowLeft className="w-4 h-4 text-white" />
                    </GlassCircleButton>
                  </div>
                  <button
                    onClick={handleCloseChatPanel}
                    className="hidden lg:flex p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-cultivate-text-primary" />
                  </button>
                  <div>
                    <h2 className="text-sm font-medium text-white">{conversation.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-cultivate-text-secondary">{chatPanelQuery.agentName}</span>
                      <span className="text-xs text-cultivate-text-tertiary">&middot;</span>
                      <span className="text-xs text-cultivate-text-secondary">{chatPanelQuery.status.charAt(0) + chatPanelQuery.status.slice(1).toLowerCase()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseChatPanel}
                  className="hidden lg:flex p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-cultivate-text-secondary" />
                </button>
              </div>

              <div className="px-5 py-2 bg-cultivate-beige/5 border-b border-cultivate-beige/10 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-cultivate-beige" />
                <span className="text-xs text-cultivate-beige">
                  Flagged message highlighted below · {(chatPanelQuery.confidenceScore * 100).toFixed(0)}% confidence
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {conversation.messages.map((msg: ConversationPanelMessage) => (
                  <div
                    key={msg.id}
                    ref={msg.isFlagged ? flaggedMessageRef : undefined}
                    className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${msg.isFlagged ? "relative" : ""}`}>
                      {msg.isFlagged && (
                        <div className="absolute -left-1 -top-2 -right-2 -bottom-2 rounded-2xl border-2 border-cultivate-beige/30 pointer-events-none" />
                      )}

                      <div className={`flex gap-2.5 ${msg.role === "USER" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          msg.role === "USER" ? "bg-cultivate-teal" : "bg-cultivate-green-light"
                        }`}>
                          {msg.role === "USER" ? (
                            <User className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <div className="text-white scale-75"><SproutIcon /></div>
                          )}
                        </div>

                        <div className={`rounded-2xl px-3.5 py-2.5 ${
                          msg.role === "USER"
                            ? "bg-cultivate-bg-elevated text-cultivate-text-primary"
                            : msg.isFlagged
                              ? "bg-cultivate-beige/5 border border-cultivate-beige/20 text-cultivate-text-primary"
                              : "bg-cultivate-bg-main text-cultivate-text-primary"
                        }`}>
                          {msg.role === "ASSISTANT" ? (
                            <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary prose-p:my-1 prose-hr:my-[1.5rem] prose-hr:border-cultivate-border-element prose-hr:opacity-80">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-2 mt-1.5 ${msg.role === "USER" ? "justify-end" : "justify-start"}`}>
                            <span className="text-[10px] text-cultivate-text-tertiary">{msg.timestamp}</span>
                            {msg.role === "ASSISTANT" && msg.confidenceScore !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                msg.confidenceScore < 0.7
                                  ? "bg-cultivate-beige/20 text-cultivate-beige"
                                  : "bg-cultivate-green-light/20 text-cultivate-green-light"
                              }`}>
                                {(msg.confidenceScore * 100).toFixed(0)}%
                              </span>
                            )}
                            {msg.isFlagged && <Flag className="w-3 h-3 text-cultivate-beige" />}
                          </div>

                          {msg.id === chatPanelQuery.messageId && (chatPanelQuery.farmerReason || chatPanelQuery.farmerUpdates) && (() => {
                            const reasons = parseFarmerReasons(chatPanelQuery.farmerReason, chatPanelQuery.farmerUpdates);
                            const currentReason = reasons[currentReasonIndex];

                            if (!currentReason) return null;

                            return (
                              <div className="mt-3 pl-4 border-l-2 border-cultivate-text-secondary/30">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-cultivate-text-secondary">Why You Flagged This</span>
                                  {reasons.length > 1 && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setCurrentReasonIndex((prev) => (prev > 0 ? prev - 1 : reasons.length - 1))}
                                        className="p-1 hover:bg-cultivate-bg-elevated rounded transition-colors"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5 text-cultivate-text-secondary" />
                                      </button>
                                      <span className="text-xs text-cultivate-text-tertiary">{currentReasonIndex + 1}/{reasons.length}</span>
                                      <button
                                        onClick={() => setCurrentReasonIndex((prev) => (prev < reasons.length - 1 ? prev + 1 : 0))}
                                        className="p-1 hover:bg-cultivate-bg-elevated rounded transition-colors"
                                      >
                                        <ChevronRight className="w-3.5 h-3.5 text-cultivate-text-secondary" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-cultivate-text-tertiary mb-1">
                                  {currentReason.ordinal} • {formatReasonTimestamp(currentReason.timestamp)}
                                </p>
                                <p className="text-sm text-cultivate-text-secondary leading-relaxed">
                                  {currentReason.message}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {chatPanelQuery.status === "CORRECTED" && chatPanelQuery.agronomistResponse && (
                  <div className="border-t border-cultivate-border-element pt-4 mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-cultivate-teal" />
                      <span className="text-xs text-cultivate-teal font-medium">Expert Correction</span>
                    </div>
                    <div className="bg-cultivate-teal/5 border border-cultivate-teal/20 rounded-xl px-3.5 py-2.5">
                      <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary prose-p:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatPanelQuery.agronomistResponse}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {chatPanelQuery.status === "VERIFIED" && (
                  <div className="border-t border-cultivate-border-element pt-4 mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-cultivate-green-light" />
                      <span className="text-xs text-cultivate-green-light font-medium">Expert Review</span>
                    </div>
                    <div className="bg-cultivate-green-light/5 border border-cultivate-green-light/20 rounded-xl px-3.5 py-2.5">
                      <p className="text-sm text-cultivate-text-primary leading-relaxed">
                        {chatPanelQuery.verificationNotes || "An agronomist reviewed this response and marked it accurate."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-cultivate-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-cultivate-text-tertiary" />
                  <span className="text-xs text-cultivate-text-tertiary">{conversation.messages.length} messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseChatPanel}
                    className="px-3 py-1.5 text-xs text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-text-primary transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleCloseChatPanel();
                      onOpenConversation(chatPanelQuery);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-secondary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Chat
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
