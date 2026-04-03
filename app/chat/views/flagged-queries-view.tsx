"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, ChevronDown, ExternalLink, Flag, Loader2, PanelLeft, X } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import { useFarmerFlaggedQueries, type FarmerFlaggedQueryItem } from "@/lib/hooks/use-farmer-flagged-queries";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Filter = "all" | "PENDING" | "VERIFIED" | "CORRECTED";

const LAST_SEEN_KEY = "cultivate-farmer-flagged-last-seen";

interface FlaggedQueriesViewProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  onOpenConversation: (query: FarmerFlaggedQueryItem) => void;
  onViewedUpdates?: () => void;
  demoMode?: boolean;
}

function getStatusColor(status: Filter | FarmerFlaggedQueryItem["status"]) {
  switch (status) {
    case "PENDING":
      return "bg-[#e8c8ab]/20 text-[#e8c8ab]";
    case "VERIFIED":
      return "bg-cultivate-green-light/20 text-cultivate-green-light";
    case "CORRECTED":
      return "bg-cultivate-teal/20 text-cultivate-teal";
    default:
      return "bg-cultivate-bg-elevated text-cultivate-text-secondary";
  }
}

export default function FlaggedQueriesView({
  sidebarOpen = true,
  setSidebarOpen,
  onOpenConversation,
  onViewedUpdates,
  demoMode = false,
}: FlaggedQueriesViewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [isStandalone, setIsStandalone] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const flagReasonsRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const apiData = useFarmerFlaggedQueries(filter === "all" ? "" : filter, 1, 20, demoMode);

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
    if (typeof window === "undefined") return;
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    onViewedUpdates?.();
  }, [onViewedUpdates]);

  const reviewUpdates = useMemo(
    () => apiData.queries.filter((query) => query.reviewedAtIso),
    [apiData.queries]
  );

  const flaggedCountLabel = `${apiData.total} ${apiData.total === 1 ? "question flagged" : "questions flagged"}`;

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
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{flaggedCountLabel}</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
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
          <div className="mt-4 mr-3 rounded-xl border border-cultivate-border-element bg-cultivate-bg-elevated px-4 py-3">
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
          <div className="mr-3 space-y-3">
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3B3B3B] text-cultivate-text-secondary">
                        {(query.confidenceScore * 100).toFixed(0)}% confidence
                      </span>
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
                          className="mt-2 text-xs text-[#e8c8ab] hover:text-[#e8c8ab]/80 transition-colors flex items-center gap-1"
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
                            ? "bg-cultivate-green-light/5 border border-[#85b878]/20"
                            : query.status === "CORRECTED"
                              ? "bg-cultivate-teal/5 border border-[#608e96]/20"
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
                          <p className="text-xs text-[#e8c8ab] mb-1.5">Why You Flagged This</p>
                          <div className="bg-[#e8c8ab]/5 border border-[#e8c8ab]/10 rounded-lg p-3 space-y-2">
                            {allFlagMessages.map((msg, idx) => {
                              const ordinals = ["1st", "2nd", "3rd"];
                              const ordinal = ordinals[idx] || `${idx + 1}th`;

                              return (
                                <div key={`${query.id}-${idx}`} className="flex items-start gap-2 text-xs">
                                  <span className="text-[#e8c8ab]/70 flex-shrink-0">{ordinal} · {msg.date} ·</span>
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
                        <div className="bg-cultivate-green-light/5 border border-[#85b878]/20 rounded-lg p-3">
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
                        <div className="bg-cultivate-teal/5 border border-[#608e96]/20 rounded-lg p-3">
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
                          <AlertTriangle className="w-3.5 h-3.5 text-[#e8c8ab]" />
                        ) : (
                          <CheckCircle className={`w-3.5 h-3.5 ${query.status === "CORRECTED" ? "text-cultivate-teal" : "text-cultivate-green-light"}`} />
                        )}
                        <span>{query.reviewedAt ? `Updated ${query.reviewedAt}` : `Flagged ${query.createdAt}`}</span>
                      </div>
                      <button
                        onClick={() => onOpenConversation(query)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cultivate-text-secondary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
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
    </div>
  );
}
