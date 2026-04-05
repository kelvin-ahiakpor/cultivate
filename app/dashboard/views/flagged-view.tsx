"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Flag, Search, CheckCircle, ChevronDown, Send, X, Pencil, ExternalLink, AlertTriangle, MessageCircle, User, ArrowLeft, GripVertical, PanelLeft, Loader2, Copy, WifiOff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GlassCircleButton, SproutIcon } from "@/components/cultivate-ui";
import { useFlaggedQueries, reviewFlaggedQuery, type FlaggedQueryItem as FlaggedQuery } from "@/lib/hooks/use-flagged-queries";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { saveAgroCache, getAgroCache } from "@/lib/offline-storage";
import { DEMO_FLAGGED_CONVOS, DEMO_FLAGGED } from "@/lib/demo-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { notify } from "@/lib/toast";

type FlagStatus = "all" | "PENDING" | "VERIFIED" | "CORRECTED";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  timestamp: string;
  confidenceScore?: number;
  isFlagged?: boolean;
}


// Sample conversations for demo mode — sourced from lib/demo-data.ts
const sampleConversations = DEMO_FLAGGED_CONVOS;

// Mock flagged queries for demo mode — sourced from lib/demo-data.ts
const initialFlagged: FlaggedQuery[] = (DEMO_FLAGGED as FlaggedQuery[]).map((query) => ({
  ...query,
  conversationTitle: query.conversationTitle || sampleConversations[query.conversationId]?.title || "Conversation",
}));

const DEFAULT_PANEL_WIDTH = 576; // max-w-xl equivalent
const MIN_PANEL_WIDTH = 400;

export default function FlaggedView({
  sidebarOpen = true,
  setSidebarOpen,
  demoMode = false,
  onOpenChat,
}: {
  sidebarOpen?: boolean;
  setSidebarOpen?: (v: boolean) => void;
  // demoMode: uses initialFlagged local state, makes zero API requests. See BACKEND-PROGRESS.md § Phase 5.
  demoMode?: boolean;
  onOpenChat?: (conversationId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FlagStatus>("all");
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Demo mode: local mutable state. Real mode: driven by SWR + API calls.
  const [demoQueries, setDemoQueries] = useState<FlaggedQuery[]>(initialFlagged);

  const isOnline = useOnlineStatus();
  const [offlineQueries, setOfflineQueries] = useState<FlaggedQuery[]>([]);

  // SWR — disabled in demo mode (null key → zero requests)
  const apiData = useFlaggedQueries(
    searchQuery,
    statusFilter === "all" ? "" : statusFilter,
    currentPage,
    itemsPerPage,
    demoMode
  );

  // Write-through: cache when online data arrives
  useEffect(() => {
    if (demoMode || !isOnline || apiData.queries.length === 0) return;
    saveAgroCache("flagged_queries", apiData.queries).catch(() => {});
  }, [apiData.queries, isOnline, demoMode]);

  // Read from IndexedDB when offline
  useEffect(() => {
    if (demoMode || isOnline) return;
    getAgroCache<FlaggedQuery[]>("flagged_queries").then(r => { if (r) setOfflineQueries(r.data); }).catch(() => {});
  }, [isOnline, demoMode]);

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingQueryId, setVerifyingQueryId] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");

  // Edit correction modal state
  const [showEditCorrectionModal, setShowEditCorrectionModal] = useState(false);
  const [editingCorrectionId, setEditingCorrectionId] = useState<string | null>(null);
  const [editCorrectionText, setEditCorrectionText] = useState("");

  // Revoke confirmation modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Ref for scrolling to flag reasons
  const flagReasonsRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [revokingQueryId, setRevokingQueryId] = useState<string | null>(null);
  const [revokeType, setRevokeType] = useState<"verification" | "correction">("verification");

  // Chat panel state
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelQuery, setChatPanelQuery] = useState<FlaggedQuery | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const flaggedMessageRef = useRef<HTMLDivElement>(null);

  // Fetch conversation for chat panel (disabled when panel closed or demo mode)
  const { data: conversationData } = useSWR(
    !demoMode && chatPanelQuery?.conversationId
      ? `/api/conversations/${chatPanelQuery.conversationId}/messages`
      : null,
    (url: string) => fetch(url).then(res => res.json())
  );

  // Sidebar width: w-72 = 288px when open, w-14 = 56px when collapsed
  const sidebarWidth = sidebarOpen ? 288 : 56;
  const maxPanelWidth = typeof window !== "undefined" ? window.innerWidth - sidebarWidth : 1200;
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // --- Resize handlers ---
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), window.innerWidth - sidebarWidth);
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, sidebarWidth]);

  // Reset panel width when sidebar toggles (respect new max)
  useEffect(() => {
    const max = typeof window !== "undefined" ? window.innerWidth - sidebarWidth : 1200;
    if (panelWidth > max) setPanelWidth(max);
  }, [sidebarWidth, panelWidth]);

  // Demo: filter + paginate locally. Real: API already filtered + paginated.
  const sourceQueries: FlaggedQuery[] = demoMode ? demoQueries : isOnline ? apiData.queries : offlineQueries;

  const filteredQueries: FlaggedQuery[] = demoMode
    ? demoQueries.filter(q => {
        const matchesSearch =
          !searchQuery ||
          q.farmerMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.farmerName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || q.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : isOnline
      ? apiData.queries
      : offlineQueries.filter(q => {
          const matchesSearch =
            !searchQuery ||
            q.farmerMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.farmerName.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = statusFilter === "all" || q.status === statusFilter;
          return matchesSearch && matchesStatus;
        });

  const totalPages = demoMode
    ? Math.ceil(filteredQueries.length / itemsPerPage)
    : isOnline ? apiData.totalPages : Math.ceil(filteredQueries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQueries = (demoMode || !isOnline) ? filteredQueries.slice(startIndex, endIndex) : filteredQueries;

  // Pending count — demo counts from local state, real counts from total (status=PENDING)
  const pendingCount = demoMode
    ? demoQueries.filter(q => q.status === "PENDING").length
    : isOnline ? apiData.total : offlineQueries.filter(q => q.status === "PENDING").length;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: FlagStatus) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-[#e8c8ab]/20 text-[#e8c8ab]";
      case "VERIFIED": return "bg-cultivate-green-light/20 text-cultivate-green-light";
      case "CORRECTED": return "bg-cultivate-teal/20 text-cultivate-teal";
      default: return "bg-[#3B3B3B] text-cultivate-text-tertiary";
    }
  };

  // --- Verification handlers ---
  const handleOpenVerifyModal = (queryId: string) => {
    setVerifyingQueryId(queryId);
    setVerifyNotes(responseText);
    setShowVerifyModal(true);
  };

  const handleConfirmVerification = async () => {
    if (!verifyingQueryId) return;
    if (demoMode) {
      setDemoQueries(prev => prev.map(q =>
        q.id === verifyingQueryId
          ? { ...q, status: "VERIFIED" as const, verificationNotes: verifyNotes || undefined, reviewedAt: "Just now" }
          : q
      ));
    } else {
      setSubmitting(true);
      try {
        await reviewFlaggedQuery(verifyingQueryId, { status: "VERIFIED", verificationNotes: verifyNotes || undefined });
        apiData.mutate();
      } catch (e) { console.error("Verify failed:", e); }
      finally { setSubmitting(false); }
    }
    setShowVerifyModal(false);
    setVerifyingQueryId(null);
    setVerifyNotes("");
    setResponseText("");
  };

  const handleEditVerification = (queryId: string) => {
    const query = sourceQueries.find(q => q.id === queryId);
    if (!query) return;
    setVerifyingQueryId(queryId);
    setVerifyNotes(query.verificationNotes || "");
    setShowVerifyModal(true);
  };

  // --- Correction handlers ---
  const handleSendCorrection = async (queryId: string) => {
    if (!responseText.trim()) return;
    if (demoMode) {
      setDemoQueries(prev => prev.map(q =>
        q.id === queryId
          ? { ...q, status: "CORRECTED" as const, agronomistResponse: responseText, reviewedAt: "Just now" }
          : q
      ));
      setResponseText("");
      notify.success("Correction sent");
    } else {
      setSubmitting(true);
      try {
        console.log("Sending correction for query:", queryId, "Response:", responseText);
        const result = await reviewFlaggedQuery(queryId, { status: "CORRECTED", agronomistResponse: responseText });
        console.log("Correction API response:", result);
        await apiData.mutate();
        setResponseText("");
        notify.success("Correction saved successfully");
      } catch (e) {
        console.error("Correction failed:", e);
        notify.error(e instanceof Error ? e.message : "Failed to save correction");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleEditCorrection = (queryId: string) => {
    const query = sourceQueries.find(q => q.id === queryId);
    if (!query) return;
    setEditingCorrectionId(queryId);
    setEditCorrectionText(query.agronomistResponse || "");
    setShowEditCorrectionModal(true);
  };

  const handleSaveEditedCorrection = async () => {
    if (!editingCorrectionId || !editCorrectionText.trim()) return;
    if (demoMode) {
      setDemoQueries(prev => prev.map(q =>
        q.id === editingCorrectionId
          ? { ...q, agronomistResponse: editCorrectionText, reviewedAt: "Just now" }
          : q
      ));
    } else {
      // No dedicated edit-correction API — resubmit as CORRECTED with new text
      setSubmitting(true);
      try {
        await reviewFlaggedQuery(editingCorrectionId, { status: "CORRECTED", agronomistResponse: editCorrectionText });
        apiData.mutate();
      } catch (e) { console.error("Edit correction failed:", e); }
      finally { setSubmitting(false); }
    }
    setShowEditCorrectionModal(false);
    setEditingCorrectionId(null);
    setEditCorrectionText("");
  };

  // --- Revoke handlers ---
  const handleOpenRevokeModal = (queryId: string, type: "verification" | "correction") => {
    setRevokingQueryId(queryId);
    setRevokeType(type);
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingQueryId) return;
    if (demoMode) {
      setDemoQueries(prev => prev.map(q =>
        q.id === revokingQueryId
          ? { ...q, status: "PENDING" as const, verificationNotes: undefined, agronomistResponse: undefined, reviewedAt: undefined }
          : q
      ));
      setShowRevokeModal(false);
      setRevokingQueryId(null);
      notify.success("Review revoked");
    } else {
      setSubmitting(true);
      try {
        const response = await fetch(`/api/flagged-queries/${revokingQueryId}/revoke`, {
          method: "PATCH",
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to revoke review");
        }
        await apiData.mutate();
        setShowRevokeModal(false);
        setRevokingQueryId(null);
        notify.success("Review revoked - query back to pending");
      } catch (e) {
        console.error("Revoke failed:", e);
        notify.error(e instanceof Error ? e.message : "Failed to revoke review");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // --- Chat panel handlers ---
  const handleOpenChatPanel = (query: FlaggedQuery) => {
    setChatPanelQuery(query);
    setChatPanelOpen(true);
    setIsClosing(false);
  };

  const handleCloseChatPanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setChatPanelOpen(false);
      setIsClosing(false);
      setPanelWidth(DEFAULT_PANEL_WIDTH);
    }, 300);
  };

  const handleDoubleClickResize = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
  };

  // Scroll to flagged message when panel opens
  useEffect(() => {
    if (chatPanelOpen && flaggedMessageRef.current) {
      // Small delay to let the panel render
      const timer = setTimeout(() => {
        flaggedMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chatPanelOpen]);

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* Part 1: Fixed header + search/filter */}
      <div className="flex-shrink-0 bg-cultivate-bg-main pt-8 lg:pt-0">
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
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
            {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
          </div>
          <p className="text-sm text-cultivate-text-secondary mt-1">{pendingCount} pending review</p>
        </div>
      </div>
      {/* Desktop header */}
      <div className="hidden lg:block mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
          {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
        </div>
        <p className="text-sm text-cultivate-text-secondary mt-1">{pendingCount} pending review</p>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[68.5%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>
        <div className="flex gap-1 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-1">
          {(["all", "PENDING", "VERIFIED", "CORRECTED"] as FlagStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-[#3B3B3B] text-white'
                  : 'text-cultivate-text-tertiary hover:text-cultivate-text-primary'
              }`}
            >
              {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      </div>{/* end flex-shrink-0 */}

      {/* Part 2: Scrollable card list */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar scrollbar-outset pb-6">
      {/* Flagged Query Cards */}
      <div className="space-y-3 mr-3">
        {paginatedQueries.map((query) => (
          <div
            key={query.id}
            className="bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element overflow-hidden"
          >
            {/* Query Header */}
            <button
              onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
              className="w-full p-4 text-left flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-white">{query.farmerName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(query.status)}`}>
                    {query.status.charAt(0) + query.status.slice(1).toLowerCase()}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3B3B3B] text-cultivate-text-secondary">
                    {(query.confidenceScore * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-cultivate-text-primary line-clamp-1">{query.farmerMessage}</p>
                {isDesktop ? (
                  <div className="flex items-center gap-2 mt-1.5 min-w-0 text-xs text-cultivate-text-tertiary">
                    <span className="shrink-0">{query.agentName}</span>
                    <span className="shrink-0 text-cultivate-text-tertiary/60">·</span>
                    <span className="min-w-0 truncate">{query.conversationTitle || "Conversation"}</span>
                    <span className="shrink-0 text-cultivate-text-tertiary/60">·</span>
                    <span className="shrink-0">{query.createdAt}</span>
                  </div>
                ) : (
                  <div className="mt-1.5 min-w-0 space-y-1">
                    <p className="text-xs text-cultivate-text-secondary truncate">
                      {query.conversationTitle || "Conversation"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-cultivate-text-tertiary min-w-0">
                      <span className="truncate">{query.agentName}</span>
                      <span className="shrink-0 text-cultivate-text-tertiary/60">·</span>
                      <span className="shrink-0">{query.createdAt}</span>
                    </div>
                  </div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-cultivate-text-tertiary flex-shrink-0 mt-1 transition-transform ${expandedId === query.id ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Content */}
            {expandedId === query.id && (
              <div className="px-4 pb-4 border-t border-cultivate-border-element pt-4 space-y-4">
                {/* Farmer's Question */}
                <div>
                  <p className="text-xs text-cultivate-text-tertiary mb-1.5">Farmer&apos;s Question</p>
                  <div className="bg-cultivate-bg-main rounded-lg p-3">
                    <p className="text-sm text-cultivate-text-primary">{query.farmerMessage}</p>
                  </div>
                  {/* Link to scroll to flag reasons (if they exist) */}
                  {(query.farmerReason || query.farmerUpdates) && (
                    <button
                      onClick={() => {
                        const el = flagReasonsRefs.current.get(query.id);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="mt-2 text-xs text-[#e8c8ab] hover:text-[#e8c8ab]/80 transition-colors flex items-center gap-1"
                    >
                      Click to see why farmer flagged this →
                    </button>
                  )}
                </div>

                {/* Agent's Response - MOVED UP */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <p className="text-xs text-cultivate-text-tertiary">Agent&apos;s Response</p>
                    {query.status === "VERIFIED" && (
                      <CheckCircle className="w-3.5 h-3.5 text-cultivate-green-light" />
                    )}
                    {query.status === "CORRECTED" && (
                      <X className="w-3.5 h-3.5 text-[#e8c8ab]" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    query.status === "VERIFIED"
                      ? "bg-cultivate-green-light/5 border border-[#85b878]/20"
                      : query.status === "CORRECTED"
                        ? "bg-[#e8c8ab]/5 border border-[#e8c8ab]/10"
                        : "bg-cultivate-bg-main"
                  }`}>
                    <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {query.agentResponse}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Farmer Flag Messages — ABOVE review so agronomist sees why it was flagged first */}
                {(query.farmerReason || query.farmerUpdates) && (() => {
                  const allFlagMessages: Array<{ text: string; date: string }> = [];

                  // Helper to parse timestamped message
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
                    return { text: trimmed, date: "No date" };
                  };

                  // Parse initial reason
                  if (query.farmerReason) {
                    allFlagMessages.push(parseMessage(query.farmerReason));
                  }

                  // Parse updates
                  if (query.farmerUpdates) {
                    const updates = query.farmerUpdates.split('\n\n').map(parseMessage);
                    allFlagMessages.push(...updates);
                  }

                  return (
                    <div ref={(el) => { if (el) flagReasonsRefs.current.set(query.id, el); }}>
                      <p className="text-xs text-[#e8c8ab] mb-1.5">Why Farmer Flagged This</p>
                      <div className="bg-[#e8c8ab]/5 border border-[#e8c8ab]/10 rounded-lg p-3 space-y-2">
                        {allFlagMessages.map((msg, idx) => {
                          const ordinals = ['1st', '2nd', '3rd'];
                          const ordinal = ordinals[idx] || `${idx + 1}th`;

                          return (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className="text-[#e8c8ab]/70 flex-shrink-0">{ordinal} · {msg.date} ·</span>
                              <span className="text-cultivate-text-primary">
                                {msg.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Verified — show verification notes */}
                {query.status === "VERIFIED" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-cultivate-green-light">Your Review</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditVerification(query.id)}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Edit verification"
                        >
                          <Pencil className="w-3 h-3 text-cultivate-text-secondary hover:text-white" />
                        </button>
                        <button
                          onClick={() => handleOpenRevokeModal(query.id, "verification")}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Revoke verification"
                        >
                          <X className="w-3.5 h-3.5 text-cultivate-text-secondary hover:text-[#e8c8ab]" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-cultivate-green-light/5 border border-[#85b878]/20 rounded-lg p-3">
                      <p className="text-sm text-cultivate-text-primary">
                        {query.verificationNotes || "Verified — no additional notes."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Corrected — show agronomist's correction */}
                {query.status === "CORRECTED" && query.agronomistResponse && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-cultivate-teal">Your Correction</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditCorrection(query.id)}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Edit correction"
                        >
                          <Pencil className="w-3 h-3 text-cultivate-text-secondary hover:text-white" />
                        </button>
                        <button
                          onClick={() => handleOpenRevokeModal(query.id, "correction")}
                          className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
                          title="Remove correction"
                        >
                          <X className="w-3.5 h-3.5 text-cultivate-text-secondary hover:text-[#e8c8ab]" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-cultivate-teal/5 border border-[#608e96]/20 rounded-lg p-3">
                      <p className="text-sm text-cultivate-text-primary">{query.agronomistResponse}</p>
                    </div>
                  </div>
                )}

                {/* Action bar for non-pending (view chat) */}
                {query.status !== "PENDING" && (
                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => handleOpenChatPanel(query)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-secondary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Chat
                    </button>
                  </div>
                )}

                {/* Response Input (for pending) */}
                {query.status === "PENDING" && (
                  <div>
                    <p className="text-xs text-cultivate-text-secondary mb-1.5">Your Response</p>
                    <textarea
                      rows={1}
                      placeholder="Provide your expert response or correction..."
                      value={responseText}
                      onChange={(e) => {
                        setResponseText(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      style={{ minHeight: "36px" }}
                      className="w-full px-3 py-2.5 bg-cultivate-bg-main border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none overflow-hidden"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => handleOpenChatPanel(query)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-secondary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Chat
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenVerifyModal(query.id)}
                          disabled={!isOnline}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors disabled:opacity-30"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Verify
                        </button>
                        <button
                          onClick={() => handleSendCorrection(query.id)}
                          disabled={submitting || !isOnline}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cultivate-green-light text-white rounded-lg hover:bg-[#536d3d] transition-colors text-xs disabled:opacity-50"
                        >
                          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          {submitting ? "Saving..." : "Correct"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filteredQueries.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-cultivate-text-tertiary">
            {startIndex + 1}–{Math.min(endIndex, filteredQueries.length)}
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

      {filteredQueries.length === 0 && (
        <div className="bg-cultivate-bg-elevated rounded-xl p-8 text-center">
          <Flag className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-cultivate-text-tertiary">
            {searchQuery || statusFilter !== "all" ? "No queries match your filters." : "No flagged queries. Your agents are doing great!"}
          </p>
        </div>
      )}

      </div>{/* end scrollable */}

      {/* Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={(open) => { if (!open) setShowVerifyModal(false); }}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#1C1C1C] border-0 p-0 rounded-none sm:rounded-2xl shadow-none max-w-none w-auto"
        >
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-cultivate-green-light" />
                <h2 className="text-lg font-medium text-white">Verify Agent Response</h2>
              </div>

              <p className="text-sm text-cultivate-text-secondary mb-4">
                Confirming that the agent&apos;s response is accurate. Add any supporting notes below.
              </p>

              <div>
                <label className="block text-sm text-cultivate-text-secondary mb-1.5">Notes (optional)</label>
                <textarea
                  rows={4}
                  placeholder="Any additional context or notes supporting this verification..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowVerifyModal(false); setVerifyingQueryId(null); }}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmVerification}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cultivate-green-light text-white rounded-lg hover:bg-[#536d3d] transition-colors text-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? "Verifying..." : "Confirm Verification"}
                </button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Edit Correction Modal */}
      <Dialog open={showEditCorrectionModal} onOpenChange={(open) => { if (!open) setShowEditCorrectionModal(false); }}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#1C1C1C] border-0 p-0 rounded-none sm:rounded-2xl shadow-none max-w-none w-auto"
        >
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <Pencil className="w-5 h-5 text-cultivate-teal" />
                <h2 className="text-lg font-medium text-white">Edit Correction</h2>
              </div>

              <div>
                <label className="block text-sm text-cultivate-text-secondary mb-1.5">Your correction</label>
                <textarea
                  rows={5}
                  value={editCorrectionText}
                  onChange={(e) => setEditCorrectionText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowEditCorrectionModal(false); setEditingCorrectionId(null); }}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedCorrection}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cultivate-teal text-white rounded-lg hover:bg-cultivate-teal/80 transition-colors text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Revoke Confirmation Modal */}
      <Dialog open={showRevokeModal} onOpenChange={(open) => { if (!open) { setShowRevokeModal(false); setRevokingQueryId(null); } }}>
        <DialogContent showCloseButton={false} className="bg-[#1C1C1C] border border-cultivate-border-subtle p-6 rounded-xl shadow-2xl max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#e8c8ab]" />
            <h2 className="text-lg font-medium text-white">
              {revokeType === "verification" ? "Revoke Verification" : "Remove Correction"}
            </h2>
          </div>

          <p className="text-sm text-cultivate-text-secondary mb-2">
            {revokeType === "verification"
              ? "Are you sure you want to revoke your verification? This will move the query back to pending review."
              : "Are you sure you want to remove your correction? This will move the query back to pending review."
            }
          </p>
          <p className="text-xs text-cultivate-text-tertiary">
            This action can be undone by re-reviewing the query.
          </p>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => { setShowRevokeModal(false); setRevokingQueryId(null); }}
              className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRevoke}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#e8c8ab] text-[#1C1C1C] rounded-lg hover:bg-[#e8c8ab]/80 transition-colors text-sm font-medium"
            >
              {revokeType === "verification" ? "Revoke" : "Remove"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Panel — Slide-out from right */}
      {chatPanelOpen && chatPanelQuery && (() => {
        // Use demo data in demo mode, real API data otherwise
        const conversation = demoMode
          ? sampleConversations[chatPanelQuery.conversationId]
          : conversationData
            ? {
                title: conversationData.conversation?.title || "Conversation",
                messages: conversationData.messages?.map((m: {
                  id: string;
                  role: "USER" | "ASSISTANT";
                  content: string;
                  timestamp: string;
                  isFlagged?: boolean;
                }) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: m.timestamp,
                  isFlagged: m.isFlagged,
                })) || []
              }
            : null;

        if (!conversation) return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        );

        return (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={handleCloseChatPanel}
            />
            <div 
              className={`fixed top-0 right-0 h-full bg-[#1C1C1C] border-l border-cultivate-border-subtle z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
                isClosing ? 'translate-x-full' : 'translate-x-0'
              }`}
              style={{ width: isDesktop ? `${panelWidth}px` : "100vw" }}
            >
              {/* Drag handle - centered on left edge */}
              <div
                className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[#1C1C1C] rounded-full p-1.5 cursor-col-resize z-10 border border-cultivate-border-subtle hover:border-white shadow-lg group"
                onMouseDown={handleResizeStart}
                onDoubleClick={handleDoubleClickResize}
                title="Drag to resize, double-click to reset"
              >
                <GripVertical className="w-3.5 h-3.5 text-[#e8c8ab] group-hover:text-white transition-colors" />
              </div>
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 pt-16 pb-3 lg:py-4 border-b border-cultivate-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="lg:hidden">
                    <GlassCircleButton
                      onClick={handleCloseChatPanel}
                      aria-label="Back"
                    >
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
                      <span className="text-xs text-cultivate-text-secondary">{chatPanelQuery.farmerName}</span>
                      <span className="text-xs text-cultivate-text-tertiary">&middot;</span>
                      <span className="text-xs text-cultivate-text-secondary">{chatPanelQuery.agentName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(chatPanelQuery.status)}`}>
                    {chatPanelQuery.status.charAt(0) + chatPanelQuery.status.slice(1).toLowerCase()}
                  </span>
                  <button
                    onClick={handleCloseChatPanel}
                      className="hidden lg:flex p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-cultivate-text-secondary" />
                  </button>
                </div>
              </div>

              {/* Flagged message indicator */}
              <div className="px-5 py-2 bg-[#e8c8ab]/5 border-b border-[#e8c8ab]/10 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-[#e8c8ab]" />
                <span className="text-xs text-[#e8c8ab]">
                  Flagged message highlighted below &middot; {(chatPanelQuery.confidenceScore * 100).toFixed(0)}% confidence
                </span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {conversation.messages.map((msg: ChatMessage) => (
                  <div
                    key={msg.id}
                    ref={msg.isFlagged ? flaggedMessageRef : undefined}
                    className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${msg.isFlagged ? "relative" : ""}`}>
                      {/* Flagged indicator ring */}
                      {msg.isFlagged && (
                        <div className="absolute -left-1 -top-2 -right-2 -bottom-2 rounded-2xl border-2 border-[#e8c8ab]/30 pointer-events-none" />
                      )}

                      {/* Avatar + bubble */}
                      <div className={`flex gap-2.5 ${msg.role === "USER" ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          msg.role === "USER" ? "bg-cultivate-teal" : "bg-cultivate-green-light"
                        }`}>
                          {msg.role === "USER" ? (
                            <User className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <div className="text-white scale-75"><SproutIcon /></div>
                          )}
                        </div>

                        {/* Message bubble */}
                        <div className={`rounded-2xl px-3.5 py-2.5 ${
                          msg.role === "USER"
                            ? "bg-cultivate-bg-elevated text-cultivate-text-primary"
                            : msg.isFlagged
                              ? "bg-[#e8c8ab]/5 border border-[#e8c8ab]/20 text-cultivate-text-primary"
                              : "bg-cultivate-bg-main text-cultivate-text-primary"
                        }`}>
                          {msg.role === "ASSISTANT" ? (
                            <div className="prose prose-sm prose-invert max-w-none prose-p:text-cultivate-text-primary prose-p:leading-relaxed prose-headings:text-cultivate-text-primary prose-strong:text-cultivate-text-primary prose-li:text-cultivate-text-primary prose-p:my-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-2 mt-1.5 ${msg.role === "USER" ? "justify-end" : "justify-start"}`}>
                            <span className="text-[10px] text-cultivate-text-tertiary">{msg.timestamp}</span>
                            {msg.confidenceScore !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                msg.confidenceScore < 0.7
                                  ? "bg-[#e8c8ab]/20 text-[#e8c8ab]"
                                  : "bg-cultivate-green-light/20 text-cultivate-green-light"
                              }`}>
                                {(msg.confidenceScore * 100).toFixed(0)}%
                              </span>
                            )}
                            {msg.isFlagged && (
                              <Flag className="w-3 h-3 text-[#e8c8ab]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Agronomist correction shown at bottom of chat if corrected */}
                {chatPanelQuery.status === "CORRECTED" && chatPanelQuery.agronomistResponse && (
                  <div className="border-t border-cultivate-border-element pt-4 mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-cultivate-teal" />
                      <span className="text-xs text-cultivate-teal font-medium">Agronomist Correction</span>
                    </div>
                    <div className="bg-cultivate-teal/5 border border-[#608e96]/20 rounded-xl px-3.5 py-2.5">
                      <p className="text-sm text-cultivate-text-primary leading-relaxed">{chatPanelQuery.agronomistResponse}</p>
                    </div>
                  </div>
                )}

                {/* Verification notes shown at bottom if verified */}
                {chatPanelQuery.status === "VERIFIED" && chatPanelQuery.verificationNotes && (
                  <div className="border-t border-cultivate-border-element pt-4 mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-cultivate-green-light" />
                      <span className="text-xs text-cultivate-green-light font-medium">Agronomist Verification</span>
                    </div>
                    <div className="bg-cultivate-green-light/5 border border-[#85b878]/20 rounded-xl px-3.5 py-2.5">
                      <p className="text-sm text-cultivate-text-primary leading-relaxed">{chatPanelQuery.verificationNotes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="px-5 py-3 border-t border-cultivate-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-cultivate-text-tertiary" />
                  <span className="text-xs text-cultivate-text-tertiary">{conversation.messages.length} messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleCloseChatPanel();
                      onOpenChat?.(chatPanelQuery.conversationId);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-secondary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Chat
                  </button>
                  <button
                    onClick={handleCloseChatPanel}
                    className="px-3 py-1.5 text-xs text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
                  >
                    Close
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
