"use client";

import { cn } from "@/lib/utils";

/** Base animated pulse block. Use this to compose view-specific skeletons. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-cultivate-bg-elevated",
        className
      )}
    />
  );
}

/** Skeleton for a single agent card */
export function AgentCardSkeleton() {
  return (
    <div className="bg-cultivate-bg-elevated rounded-xl p-4 flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
    </div>
  );
}

/** Skeleton list for agents view — renders n cards */
export function AgentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <AgentCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single document row in knowledge view */
export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
      <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
    </div>
  );
}

/** Skeleton list for knowledge base view */
export function DocumentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="bg-cultivate-bg-elevated rounded-xl overflow-hidden divide-y divide-cultivate-border-subtle">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single flagged query row */
export function FlaggedRowSkeleton() {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-12 flex-shrink-0" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton list for flagged queries view */
export function FlaggedListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="bg-cultivate-bg-elevated rounded-xl overflow-hidden divide-y divide-cultivate-border-subtle">
      {Array.from({ length: count }).map((_, i) => (
        <FlaggedRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single farmer chat row (farmer chats view) */
export function FarmerChatCardSkeleton({ titleWidth = "w-2/5" }: { titleWidth?: string }) {
  return (
    <div className="bg-cultivate-bg-elevated rounded-xl p-4 flex items-start gap-3">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Skeleton list for farmer chats view */
export function FarmerChatListSkeleton({ count = 5 }: { count?: number }) {
  const widths = ["w-2/5", "w-1/3", "w-1/2", "w-2/5", "w-1/3"];
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FarmerChatCardSkeleton key={i} titleWidth={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Skeleton for a single system card (farmer systems view) */
export function SystemCardSkeleton() {
  return (
    <div className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-4 w-16 flex-shrink-0" />
      </div>
      <Skeleton className="h-3 w-full mb-1.5" />
      <Skeleton className="h-3 w-4/5 mb-4" />
      <div className="bg-cultivate-bg-elevated rounded-lg p-3">
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton list for farmer systems view */
export function SystemListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 pb-4">
      {Array.from({ length: count }).map((_, i) => (
        <SystemCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single conversation card (dashboard chats view) */
export function ConversationCardSkeleton({ titleWidth = "w-2/5" }: { titleWidth?: string }) {
  return (
    <div className="bg-cultivate-bg-elevated rounded-xl p-4 flex items-start gap-3">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton list for conversation/chats view */
export function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  const widths = ["w-2/5", "w-1/3", "w-1/2", "w-2/5", "w-1/3", "w-2/5"];
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationCardSkeleton key={i} titleWidth={widths[i % widths.length]} />
      ))}
    </div>
  );
}
