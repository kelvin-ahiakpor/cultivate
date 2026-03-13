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

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronDown, Plus, Share, Pencil, Trash2, Unlink, Box, Loader2, Copy, ThumbsUp, Flag, RotateCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GlassCircleButton from "@/components/glass-circle-button";
import { CabbageIcon, PaperPlaneIcon, SproutIcon } from "@/components/send-icons";
import { Tooltip } from "@/components/tooltip";

export interface ConversationMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

/** Props for the live send input (real mode only). Omit entirely for demo. */
export interface InputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  agents: { id: string; name: string }[];
  selectedAgent: string;
  onAgentSelect: (id: string, name: string) => void;
  sendIcon: "cabbage" | "plane" | "sprout";
  onSendIconCycle: () => void;
  showAgentMenu: boolean;
  setShowAgentMenu: (v: boolean) => void;
  isStreaming: boolean;
}

interface ConversationViewProps {
  // Header data
  title: string;
  systemName?: string | null;
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
}

export default function ConversationView({
  title,
  systemName,
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
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log("ConversationView render - headerMenuOpen:", headerMenuOpen);

  // Scroll to bottom when messages or streaming content change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Conversation Header ──────────────────────────────────────────
          Mobile: [glass back] | [title + system pill centered] | [+ new chat]
          Desktop: breadcrumb [system /] [title ▾] with dropdown
          pt-16 on mobile for Dynamic Island safe area — DO NOT reduce to pt-3 alone */}
      <div className="flex-shrink-0 bg-[#1E1E1E] pt-16 lg:pt-3 pb-3 px-3 lg:pl-4 lg:pr-3">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between">
          <GlassCircleButton onClick={onBack} aria-label="Back">
            <ChevronLeft className="w-5 h-5 text-white" />
          </GlassCircleButton>
          <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1 mx-3">
            <span className="text-sm standalone:text-base font-medium text-white truncate">
              {title || "Untitled conversation"}
            </span>
            {systemName && (
              <div className="inline-flex items-center gap-1 bg-[#2B2B2B] rounded-full px-2.5 py-0.5">
                <Box className="w-3 h-3 text-[#9C9A92]" />
                <span className="text-xs text-[#9C9A92] truncate max-w-[180px]">{systemName}</span>
              </div>
            )}
          </div>
          <button
            onClick={onNewChat}
            className="w-11 h-11 bg-[#2B2B2B] hover:bg-[#3B3B3B] rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Plus className="w-5 h-5 text-[#85b878]" />
          </button>
        </div>

        {/* Desktop breadcrumb header */}
        <div className="hidden lg:flex items-center gap-1">
          {systemName && (
            <>
              <span className="text-sm text-[#C2C0B6] hover:text-white truncate cursor-pointer transition-colors">
                {systemName}
              </span>
              <span className="text-sm text-[#6B6B6B] flex-shrink-0">/</span>
            </>
          )}
          {/* Title + chevron — independent hover zones */}
          <div className={`inline-flex items-stretch rounded-lg overflow-hidden cursor-pointer relative ${
            headerMenuOpen ? "bg-[#141413]" : "hover:bg-[#141413]"
          }`}>
            <span className="text-sm text-[#C2C0B6] truncate max-w-[220px] py-1 pl-2 pr-1 hover:bg-[#0a0a0a] transition-colors">
              {title || "Untitled conversation"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("Chevron clicked! Current state:", headerMenuOpen, "Setting to:", !headerMenuOpen);
                setHeaderMenuOpen(!headerMenuOpen);
              }}
              className={`${headerMenuOpen ? "bg-[#0a0a0a]" : "hover:bg-[#0a0a0a]"} transition-all px-1.5 self-stretch flex items-center`}
            >
              <ChevronDown className="w-3.5 h-3.5 text-[#9C9A92] hover:text-white transition-colors" strokeWidth={1.5} />
            </button>

            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-1 z-50 min-w-[200px] whitespace-nowrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <Share className="w-3.5 h-3.5" />Share
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />Rename
                  </button>
                  {systemName && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5" />Remove from system
                    </button>
                  )}
                  <div className="border-t border-[#2B2B2B] my-1 mx-3" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#141413] hover:text-red-300 flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Scroll container — messages + sticky input inside ─────────────
          Input is INSIDE this scroll container (not a flex sibling) so that
          sticky bottom-0 actually works and the gradient overlaps messages. */}
      <div className="flex-1 min-h-0 relative">
        <div className="h-full overflow-y-auto thin-scrollbar">
          <div className="max-w-3xl standalone:max-w-4xl mx-auto flex flex-col min-h-full">
            {/* space-y-4: gap between messages.
                pb-12 standalone: breathing room after "AI can make mistakes" before input */}
            <div className={`flex-1 px-8 standalone:px-2 lg:px-8 pt-6 ${isStandalone ? "pb-12" : "pb-6"} space-y-4`}>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-[#9C9A92] animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id}>
                      {msg.role === "USER" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[75%] bg-[#2B2B2B] rounded-2xl px-4 py-3">
                            <p className="text-base text-white whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="group">
                          <div className="prose prose-base prose-invert max-w-none text-[#C2C0B6] leading-relaxed prose-p:my-1 prose-headings:text-[#C2C0B6] prose-headings:font-semibold prose-h2:text-base prose-h3:text-base prose-strong:text-[#C2C0B6] prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                          {/* Message actions — copy, thumbs up, flag, retry */}
                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip content="Copy">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.content);
                                  // TODO: Show toast notification "Copied to clipboard"
                                }}
                                className="p-1.5 hover:bg-[#141413] rounded transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#9C9A92] hover:text-[#C2C0B6] transition-colors" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Give positive feedback">
                              <button
                                onClick={() => {
                                  // TODO: Implement thumbs up feedback
                                  console.log("Thumbs up for message:", msg.id);
                                }}
                                className="p-1.5 hover:bg-[#141413] rounded transition-colors"
                              >
                                <ThumbsUp className="w-3.5 h-3.5 text-[#9C9A92] hover:text-[#C2C0B6] transition-colors" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Flag for review">
                              <button
                                onClick={() => {
                                  // TODO: Implement flag for review
                                  console.log("Flag message for review:", msg.id);
                                }}
                                className="p-1.5 hover:bg-[#141413] rounded transition-colors"
                              >
                                <Flag className="w-3.5 h-3.5 text-[#9C9A92] hover:text-[#C2C0B6] transition-colors" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Retry">
                              <button
                                onClick={() => {
                                  // TODO: Implement retry (regenerate response)
                                  console.log("Retry message:", msg.id);
                                }}
                                className="p-1.5 hover:bg-[#141413] rounded transition-colors"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-[#9C9A92] hover:text-[#C2C0B6] transition-colors" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming indicator (real mode only) */}
                  {isStreaming && (
                    <div>
                      {streamingContent ? (
                        <div className="prose prose-base prose-invert max-w-none text-[#C2C0B6] leading-relaxed prose-p:my-1 prose-headings:text-[#C2C0B6] prose-headings:font-semibold prose-h2:text-base prose-h3:text-base prose-strong:text-[#C2C0B6] prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center py-1">
                          <span className="w-1.5 h-1.5 bg-[#85b878] rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-[#85b878] rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-[#85b878] rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disclaimer — in-flow on standalone, under input otherwise */}
                  {isStandalone && (
                    <div className="mt-6 ">
                      <p className="text-sm text-[#C2C0B6] text-right leading-snug max-w-[250px] ml-auto">
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
                Desktop/web: solid bg, centered max width */}
            <div className={`sticky bottom-0 ${isStandalone ? "relative z-30 -mt-10 bg-transparent pb-4 pt-0" : "bg-[#1E1E1E] pb-2"}`}>
              {isStandalone && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1E1E1E]/70 via-[#1E1E1E]/40 to-transparent backdrop-blur-[0.5px]" />
              )}
              <div className={`${isStandalone ? "relative z-10 mx-3.5 mb-3" : "mx-3.5 mb-1"}`}>
                <div className="bg-[#2B2B2B] rounded-[20px] p-3.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.15),0_0_0.0625rem_rgba(0,0,0,0.15)]">
                  <textarea
                    placeholder={inputProps ? "Ask a follow-up..." : "Reply..."}
                    rows={1}
                    value={inputProps?.value ?? ""}
                    onChange={inputProps ? (e) => inputProps.onChange(e.target.value) : undefined}
                    onKeyDown={inputProps ? (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); inputProps.onSend(); } } : undefined}
                    readOnly={!inputProps}
                    className="w-full px-2 py-1 focus:outline-none resize-none text-white placeholder-[#6B6B6B] bg-transparent text-sm standalone:text-base lg:text-sm"
                  />
                  <div className="flex items-center justify-between mt-2">
                    {/* Left: new chat button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={inputProps ? inputProps.onNewChat : onNewChat}
                        className="p-1.5 hover:bg-[#3B3B3B] rounded transition-colors"
                        title="New chat"
                      >
                        <Plus className="w-5 h-5 text-[#C2C0B6]" />
                      </button>
                    </div>

                    {/* Right: agent selector + send button */}
                    <div className="flex items-center gap-2">
                      {inputProps ? (
                        /* Real mode: agent dropdown */
                        <div className="relative">
                          <button
                            onClick={() => inputProps.setShowAgentMenu(!inputProps.showAgentMenu)}
                            className="flex items-center gap-1 text-[#C2C0B6] hover:text-white transition-colors text-sm standalone:text-base lg:text-sm"
                          >
                            <span>{inputProps.selectedAgent}</span>
                            <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                          {inputProps.showAgentMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => inputProps.setShowAgentMenu(false)} />
                              <div className="absolute bottom-full right-0 mb-2 bg-[#2B2B2B] rounded-lg shadow-lg border border-[#3B3B3B] py-2 z-50 min-w-[200px]">
                                {inputProps.agents.map((agent) => (
                                  <button
                                    key={agent.id}
                                    onClick={() => { inputProps.onAgentSelect(agent.id, agent.name); inputProps.setShowAgentMenu(false); }}
                                    className={`w-full px-4 py-2 text-left text-sm standalone:text-base lg:text-sm hover:bg-[#3B3B3B] transition-colors ${inputProps.selectedAgent === agent.name ? "text-[#85b878]" : "text-[#C2C0B6]"}`}
                                  >
                                    {agent.name}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        /* Demo mode: static agent label */
                        <span className="text-sm standalone:text-base lg:text-sm text-[#9C9A92]">
                          {demoAgentLabel || "General Farm Advisor"}
                        </span>
                      )}

                      {/* Send button */}
                      {inputProps ? (
                        inputProps.isStreaming ? (
                          <div className="p-2">
                            <Loader2 className="w-5 h-5 text-[#85b878] animate-spin" />
                          </div>
                        ) : (
                          <button
                            onClick={() => { inputProps.onSend(); inputProps.onSendIconCycle(); }}
                            disabled={!inputProps.value.trim()}
                            className="p-2 bg-[#85b878] text-white rounded-xl hover:bg-[#536d3d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {inputProps.sendIcon === "cabbage" && <CabbageIcon />}
                            {inputProps.sendIcon === "plane" && <PaperPlaneIcon />}
                            {inputProps.sendIcon === "sprout" && <SproutIcon />}
                          </button>
                        )
                      ) : (
                        <button className="p-2 bg-[#85b878] text-white rounded-xl hover:bg-[#536d3d] transition-colors opacity-40 cursor-default">
                          <CabbageIcon />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {!isStandalone && (
                  <p className="mt-2 text-xs text-[#9C9A92] text-center leading-snug">
                    AI can make mistakes. Please verify important information.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
