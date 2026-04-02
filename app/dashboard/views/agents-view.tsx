"use client";

import { useState } from "react";
import { Bot, Plus, Search, MoreHorizontal, Power, Pencil, Trash2, ChevronDown, AlertTriangle, PanelLeft, Eye, Loader2 } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import { useAgents, createAgent, toggleAgentStatus, deleteAgent, type Agent } from "@/lib/hooks/use-agents";
import { DEMO_AGENTS } from "@/lib/demo-data";

// Helper to format relative time
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Demo agents sourced from lib/demo-data.ts — never fetched from the API
const mockAgents = DEMO_AGENTS;

export default function AgentsView({
  sidebarOpen,
  setSidebarOpen,
  demoMode = false,
  onEditAgent,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  demoMode?: boolean;
  onEditAgent?: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Fetch agents with SWR — disabled in demo mode (passes null key to SWR, no request made)
  const apiData = useAgents(searchQuery, currentPage, itemsPerPage, demoMode);

  // Use mock data in demo mode, real data otherwise
  const agents = demoMode
    ? mockAgents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : apiData.agents;
  const total = demoMode ? mockAgents.length : apiData.total;
  const isLoading = demoMode ? false : apiData.isLoading;
  const isError = demoMode ? false : apiData.isError;
  const mutate = demoMode ? (() => {}) : apiData.mutate;

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View, Edit, Deactivate, Delete modals
  const [viewAgentModal, setViewAgentModal] = useState<Agent | null>(null);
const [deactivateModalAgent, setDeactivateModalAgent] = useState<Agent | null>(null);
  const [deleteModalAgent, setDeleteModalAgent] = useState<Agent | null>(null);
  const [deleteNameConfirm, setDeleteNameConfirm] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  // Form values
  const [createName, setCreateName] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createStyle, setCreateStyle] = useState("");
  const [createThreshold, setCreateThreshold] = useState(0.7);


  const handleEditAgent = (agent: Agent) => {
    setOpenMenuId(null);
    onEditAgent?.(agent.id);
  };

  const handleToggleActivation = async (agent: Agent) => {
    if (agent.isActive) {
      // Deactivating - show confirmation modal
      setDeactivateModalAgent(agent);
    } else {
      // Activating - do it directly (no confirmation needed)
      try {
        await toggleAgentStatus(agent.id, true);
        mutate(); // Refresh list
      } catch (error) {
        console.error("Failed to activate agent:", error);
        alert("Failed to activate agent. Please try again.");
      }
    }
    setOpenMenuId(null);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateModalAgent) return;

    try {
      setSubmitting(true);
      await toggleAgentStatus(deactivateModalAgent.id, false);
      mutate(); // Refresh list
      setDeactivateModalAgent(null);
    } catch (error) {
      console.error("Failed to deactivate agent:", error);
      alert("Failed to deactivate agent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = (agent: Agent) => {
    setDeleteModalAgent(agent);
    setDeleteNameConfirm("");
    setDeleteReason("");
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalAgent) return;

    try {
      setSubmitting(true);
      await deleteAgent(deleteModalAgent.id);
      mutate(); // Refresh list
      setDeleteModalAgent(null);
      setDeleteNameConfirm("");
      setDeleteReason("");
    } catch (error) {
      console.error("Failed to delete agent:", error);
      alert("Failed to delete agent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createName.trim() || !createPrompt.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      await createAgent({
        name: createName,
        systemPrompt: createPrompt,
        responseStyle: createStyle || undefined,
        confidenceThreshold: createThreshold,
      });
      mutate(); // Refresh list
      setShowCreateModal(false);
      // Reset form
      setCreateName("");
      setCreatePrompt("");
      setCreateStyle("");
      setCreateThreshold(0.7);
    } catch (error) {
      console.error("Failed to create agent:", error);
      alert("Failed to create agent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, total);

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* Part 1: Fixed header + search */}
      <div className="flex-shrink-0 bg-cultivate-bg-main pt-8 lg:pt-0">
        {/* Mobile header — glass button absolute left, title centered, icon action absolute right */}
        <div className="relative flex items-center justify-center mb-6 lg:hidden">
          {!sidebarOpen && (
            <div className="absolute left-0">
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <PanelLeft className="w-5 h-5 text-white rotate-180" />
              </GlassCircleButton>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Agents</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{total} agents configured</p>
          </div>
          <div className="absolute right-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-11 h-11 bg-[#5a7048] hover:bg-[#4a5d38] rounded-full flex items-center justify-center transition-colors"
              aria-label="Create Agent"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Agents</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{total} agents configured</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6 w-[98.5%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>
      </div>

      {/* Part 2: Scrollable card list */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar scrollbar-outset">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cultivate-green-light animate-spin" />
          </div>
        ) : isError ? (
          <div className="bg-cultivate-bg-elevated rounded-xl p-8 text-center mr-3">
            <p className="text-sm text-red-400">Failed to load agents. Please try again.</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-cultivate-bg-elevated rounded-xl p-8 text-center mr-3">
            <Bot className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-cultivate-text-tertiary">
              {searchQuery ? "No agents match your search." : "No agents yet. Create your first agent to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mr-3">
        {agents.map((agent) => (
          <div key={agent.id}>
            {/* Mobile: Simplified card — tap to edit */}
            <div
              onClick={() => onEditAgent?.(agent.id)}
              className="lg:hidden bg-cultivate-bg-elevated rounded-xl p-4 border border-cultivate-border-element hover:border-[#85b878]/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${agent.isActive ? 'bg-cultivate-green-light/20' : 'bg-[#3B3B3B]'}`}>
                    <Bot className={`w-5 h-5 ${agent.isActive ? 'text-cultivate-green-light' : 'text-cultivate-text-tertiary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white truncate">{agent.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${agent.isActive ? 'bg-cultivate-green-light/20 text-cultivate-green-light' : 'bg-[#3B3B3B] text-cultivate-text-tertiary'}`}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-cultivate-text-tertiary line-clamp-2">
                      {agent.systemPrompt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setViewAgentModal(agent); }}
                  className="w-8 h-8 bg-[#3B3B3B] hover:bg-[#4B4B4B] rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="View details"
                >
                  <Eye className="w-4 h-4 text-cultivate-green-light" />
                </button>
              </div>
            </div>

            {/* Desktop: Original card with all stats — click to edit */}
            <div
              onClick={() => onEditAgent?.(agent.id)}
              className="hidden lg:block bg-cultivate-bg-elevated rounded-xl p-5 border border-cultivate-border-element hover:border-[#85b878]/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.isActive ? 'bg-cultivate-green-light/20' : 'bg-[#3B3B3B]'}`}>
                    <Bot className={`w-5 h-5 ${agent.isActive ? 'text-cultivate-green-light' : 'text-cultivate-text-tertiary'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white">{agent.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${agent.isActive ? 'bg-cultivate-green-light/20 text-cultivate-green-light' : 'bg-[#3B3B3B] text-cultivate-text-tertiary'}`}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-cultivate-text-tertiary mt-1 line-clamp-1 max-w-md">
                      {agent.systemPrompt}
                    </p>
                    <div className="flex items-center gap-4 mt-2.5">
                      <span className="text-xs text-cultivate-text-secondary">{agent.conversations || 0} chats</span>
                      <span className="text-xs text-cultivate-text-secondary">{agent.knowledgeBases || 0} docs</span>
                      <span className="text-xs text-cultivate-text-secondary">Threshold: {agent.confidenceThreshold}</span>
                      <span className="text-xs text-cultivate-text-tertiary">Updated {formatRelativeTime(agent.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === agent.id ? null : agent.id); }}
                    className="p-1.5 hover:bg-[#3B3B3B] rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-cultivate-text-primary" />
                  </button>

                  {openMenuId === agent.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-cultivate-border-subtle py-1 z-50 min-w-[160px]">
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActivation(agent)}
                          className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors"
                        >
                          <Power className="w-3.5 h-3.5" />
                          {agent.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <div className="border-t border-cultivate-border-subtle my-1" />
                        <button
                          onClick={() => handleDeleteAgent(agent)}
                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-cultivate-bg-hover hover:text-red-300 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && agents.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-cultivate-text-tertiary">
            {startIndex + 1}–{endIndex} of {total}
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

      {/* View Agent Modal */}
      {viewAgentModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setViewAgentModal(null)}
          />
          {/* Mobile: Centered modal */}
          <div className="lg:hidden fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl pointer-events-auto"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cultivate-border-subtle">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${viewAgentModal.isActive ? 'bg-cultivate-green-light/20' : 'bg-[#3B3B3B]'}`}>
                    <Bot className={`w-4 h-4 ${viewAgentModal.isActive ? 'text-cultivate-green-light' : 'text-cultivate-text-tertiary'}`} />
                  </div>
                  <h2 className="text-sm font-medium text-white truncate">{viewAgentModal.name}</h2>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${viewAgentModal.isActive ? 'bg-cultivate-green-light/20 text-cultivate-green-light' : 'bg-[#3B3B3B] text-cultivate-text-tertiary'}`}>
                    {viewAgentModal.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewAgentModal(null)}
                  className="p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-cultivate-text-secondary" />
                </button>
              </div>

              {/* Agent Details */}
              <div className="flex-1 overflow-y-auto px-4 py-4 thin-scrollbar">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-2">System Prompt</h3>
                    <p className="text-sm text-cultivate-text-primary leading-relaxed">{viewAgentModal.systemPrompt}</p>
                  </div>

                  <div className="bg-cultivate-bg-elevated rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cultivate-text-secondary">Conversations</span>
                      <span className="text-white">{viewAgentModal.conversations} chats</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cultivate-text-secondary">Knowledge bases</span>
                      <span className="text-white">{viewAgentModal.knowledgeBases} docs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cultivate-text-secondary">Confidence threshold</span>
                      <span className="text-white">{viewAgentModal.confidenceThreshold}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cultivate-text-secondary">Last updated</span>
                      <span className="text-white">{viewAgentModal.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-cultivate-border-subtle space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleEditAgent(viewAgentModal);
                      setViewAgentModal(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      handleToggleActivation(viewAgentModal);
                      setViewAgentModal(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-orange-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {viewAgentModal.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
                <button
                  onClick={() => {
                    handleDeleteAgent(viewAgentModal);
                    setViewAgentModal(null);
                  }}
                  className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-cultivate-border-element rounded-lg hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Desktop: Side panel */}
          <div className="hidden lg:flex fixed top-0 right-0 h-full w-[600px] bg-[#1C1C1C] border-l border-cultivate-border-subtle z-50 flex-col shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cultivate-border-subtle">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${viewAgentModal.isActive ? 'bg-cultivate-green-light/20' : 'bg-[#3B3B3B]'}`}>
                  <Bot className={`w-5 h-5 ${viewAgentModal.isActive ? 'text-cultivate-green-light' : 'text-cultivate-text-tertiary'}`} />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white">{viewAgentModal.name}</h2>
                  <p className="text-xs text-cultivate-text-secondary mt-0.5">
                    <span className={viewAgentModal.isActive ? 'text-cultivate-green-light' : 'text-cultivate-text-tertiary'}>
                      {viewAgentModal.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewAgentModal(null)}
                className="p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-cultivate-text-secondary" />
              </button>
            </div>

            {/* Agent Metadata */}
            <div className="px-5 py-4 border-b border-cultivate-border-subtle space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Conversations</span>
                <span className="text-white">{viewAgentModal.conversations} chats</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Knowledge bases</span>
                <span className="text-white">{viewAgentModal.knowledgeBases} documents</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Confidence threshold</span>
                <span className="text-white">{viewAgentModal.confidenceThreshold}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Last updated</span>
                <span className="text-white">{viewAgentModal.updatedAt}</span>
              </div>
            </div>

            {/* Scrollable Agent Details */}
            <div className="flex-1 overflow-y-auto px-5 py-4 thin-scrollbar">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-2">System Prompt</h3>
                  <div className="text-sm text-cultivate-text-primary leading-relaxed">
                    <p>{viewAgentModal.systemPrompt}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-cultivate-border-subtle">
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-3">Configuration</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-cultivate-text-tertiary">Confidence Threshold</span>
                        <span className="text-xs text-white">{viewAgentModal.confidenceThreshold}</span>
                      </div>
                      <p className="text-xs text-cultivate-text-secondary leading-relaxed">
                        Queries below this confidence will be flagged for agronomist review
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-3 border-t border-cultivate-border-subtle flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleEditAgent(viewAgentModal);
                  setViewAgentModal(null);
                }}
                className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewAgentModal(null)}
                className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => !submitting && setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Create New Agent</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-cultivate-text-secondary mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Maize Expert"
                    className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm text-cultivate-text-secondary mb-1.5">System Prompt</label>
                  <textarea
                    rows={4}
                    value={createPrompt}
                    onChange={(e) => setCreatePrompt(e.target.value)}
                    placeholder="Describe the agent's role, expertise, and how it should respond..."
                    className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm text-cultivate-text-secondary mb-1.5">Response Style (optional)</label>
                  <input
                    type="text"
                    value={createStyle}
                    onChange={(e) => setCreateStyle(e.target.value)}
                    placeholder="e.g. Friendly, concise, uses local examples"
                    className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm text-cultivate-text-secondary mb-1.5">Confidence Threshold</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={createThreshold}
                      onChange={(e) => setCreateThreshold(parseFloat(e.target.value))}
                      className="flex-1 accent-[#5a7048] hover:brightness-110 transition-all"
                      style={{
                        background: `linear-gradient(to right, #5a7048 0%, #5a7048 ${createThreshold * 100}%, #3B3B3B ${createThreshold * 100}%, #3B3B3B 100%)`
                      }}
                      disabled={submitting}
                    />
                    <span className="text-sm text-white w-10 text-right">{createThreshold.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-cultivate-text-tertiary mt-1">Queries below this confidence will be flagged for review</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubmit}
                  disabled={submitting || !createName.trim() || !createPrompt.trim()}
                  className="px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Creating..." : "Create Agent"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Deactivate Agent Modal */}
      {deactivateModalAgent && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDeactivateModalAgent(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Power className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Deactivate Agent</h2>
                  <p className="text-sm text-cultivate-text-secondary mt-1">
                    Are you sure you want to deactivate <span className="text-white font-medium">{deactivateModalAgent.name}</span>?
                  </p>
                </div>
              </div>

              <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-3 mb-5">
                <p className="text-xs text-cultivate-text-primary leading-relaxed">
                  This agent will no longer respond to farmer queries. {deactivateModalAgent.conversations} conversation histories will be preserved, but farmers won't be able to select this agent for new chats.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeactivateModalAgent(null)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivateConfirm}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Deactivating..." : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Agent Modal - Strict Confirmation */}
      {deleteModalAgent && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDeleteModalAgent(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Delete Agent</h2>
                  <p className="text-sm text-cultivate-text-secondary mt-1">
                    This is a permanent action that cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-5">
                <p className="text-xs text-red-300 leading-relaxed">
                  Deleting <span className="font-medium">{deleteModalAgent.name}</span> will permanently remove:
                </p>
                <ul className="text-xs text-red-300 mt-2 ml-4 space-y-1">
                  <li>• All {deleteModalAgent.conversations} conversation histories</li>
                  <li>• Agent configuration and system prompt</li>
                  <li>• Links to {deleteModalAgent.knowledgeBases} knowledge bases</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-cultivate-text-secondary mb-1.5">Reason for deletion (required)</label>
                  <textarea
                    rows={3}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Why are you deleting this agent?"
                    className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cultivate-text-secondary mb-1.5">
                    Type <span className="text-white font-mono">{deleteModalAgent.name}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteNameConfirm}
                    onChange={(e) => setDeleteNameConfirm(e.target.value)}
                    placeholder="Enter agent name exactly"
                    className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteModalAgent(null)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={submitting || deleteNameConfirm !== deleteModalAgent?.name || !deleteReason.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
