"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Flag, Loader2, PanelLeft } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import { useFarmerFlaggedQueries, type FarmerFlaggedQueryItem } from "@/lib/hooks/use-farmer-flagged-queries";

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
            <p className="text-sm text-cultivate-text-secondary mt-1">{apiData.total} questions you flagged</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Flagged Queries</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{apiData.total} questions you flagged</p>
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
          <div className="mt-4 rounded-xl border border-cultivate-border-element bg-cultivate-bg-elevated px-4 py-3">
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
              <button
                key={query.id}
                onClick={() => onOpenConversation(query)}
                className="w-full text-left bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element p-4 hover:bg-cultivate-bg-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{query.conversationTitle}</p>
                    <p className="text-xs text-cultivate-text-secondary mt-1">{query.agentName}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${getStatusColor(query.status)}`}>
                    {query.status.charAt(0) + query.status.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-cultivate-text-tertiary mb-1">Your question</p>
                    <p className="text-sm text-cultivate-text-primary line-clamp-2">{query.farmerMessage}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-cultivate-text-tertiary mb-1">Response you flagged</p>
                    <p className="text-sm text-cultivate-text-secondary line-clamp-3">{query.agentResponse}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-cultivate-text-tertiary">
                    {query.status === "PENDING" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#e8c8ab]" />
                    ) : (
                      <CheckCircle className={`w-3.5 h-3.5 ${query.status === "CORRECTED" ? "text-cultivate-teal" : "text-cultivate-green-light"}`} />
                    )}
                    <span>
                      {query.reviewedAt ? `Updated ${query.reviewedAt}` : `Flagged ${query.createdAt}`}
                    </span>
                  </div>
                  <span className="text-xs text-cultivate-green-light">Open chat</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
