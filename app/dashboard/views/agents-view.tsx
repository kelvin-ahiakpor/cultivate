"use client";

import { useState } from "react";
import { Bot, Plus, Search, MoreHorizontal, Power, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, X, AlertTriangle, PanelLeft } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";

// Mock data - will be replaced with real API data
const mockAgents = [
  {
    id: "1",
    name: "General Farm Advisor",
    systemPrompt: "You are a knowledgeable agricultural advisor specializing in farming practices in Ghana...",
    confidenceThreshold: 0.7,
    isActive: true,
    conversations: 24,
    knowledgeBases: 3,
    updatedAt: "2 days ago",
  },
  {
    id: "2",
    name: "Maize Expert",
    systemPrompt: "You specialize in maize cultivation, covering planting schedules, pest management...",
    confidenceThreshold: 0.8,
    isActive: true,
    conversations: 12,
    knowledgeBases: 2,
    updatedAt: "5 days ago",
  },
  {
    id: "3",
    name: "Pest Management",
    systemPrompt: "You are an expert in identifying and managing agricultural pests common in West Africa...",
    confidenceThreshold: 0.75,
    isActive: false,
    conversations: 8,
    knowledgeBases: 1,
    updatedAt: "1 week ago",
  },
  {
    id: "4",
    name: "Cocoa Specialist",
    systemPrompt: "You are an expert in cocoa farming in Ghana, covering nursery management, fermentation, drying...",
    confidenceThreshold: 0.7,
    isActive: true,
    conversations: 18,
    knowledgeBases: 4,
    updatedAt: "1 day ago",
  },
  {
    id: "5",
    name: "Soil & Fertilizer Guide",
    systemPrompt: "You specialize in soil health, nutrient management, and fertilizer recommendations for Ghanaian soils...",
    confidenceThreshold: 0.65,
    isActive: true,
    conversations: 31,
    knowledgeBases: 5,
    updatedAt: "3 days ago",
  },
  {
    id: "6",
    name: "Irrigation Advisor",
    systemPrompt: "You provide guidance on irrigation methods, water management, and dry season farming strategies...",
    confidenceThreshold: 0.72,
    isActive: true,
    conversations: 9,
    knowledgeBases: 2,
    updatedAt: "4 days ago",
  },
  {
    id: "7",
    name: "Livestock & Poultry",
    systemPrompt: "You advise on small-scale livestock and poultry farming, covering breeds, feeding, housing, and disease prevention...",
    confidenceThreshold: 0.78,
    isActive: false,
    conversations: 5,
    knowledgeBases: 1,
    updatedAt: "2 weeks ago",
  },
];

export default function AgentsView({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  
  // Edit, Deactivate, Delete modals
  const [editModalAgent, setEditModalAgent] = useState<typeof mockAgents[0] | null>(null);
  const [deactivateModalAgent, setDeactivateModalAgent] = useState<typeof mockAgents[0] | null>(null);
  const [deleteModalAgent, setDeleteModalAgent] = useState<typeof mockAgents[0] | null>(null);
  const [deleteNameConfirm, setDeleteNameConfirm] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  
  // Slider values
  const [createThreshold, setCreateThreshold] = useState(0.7);
  const [editThreshold, setEditThreshold] = useState(0.7);

  const handleEditAgent = (agent: typeof mockAgents[0]) => {
    setEditModalAgent(agent);
    setEditThreshold(agent.confidenceThreshold);
    setOpenMenuId(null);
  };

  const handleToggleActivation = (agent: typeof mockAgents[0]) => {
    if (agent.isActive) {
      // Deactivating - show confirmation modal
      setDeactivateModalAgent(agent);
    } else {
      // Activating - do it directly (no confirmation needed)
      console.log('Activating agent:', agent.id);
    }
    setOpenMenuId(null);
  };

  const handleDeactivateConfirm = () => {
    console.log('Deactivating agent:', deactivateModalAgent?.id);
    setDeactivateModalAgent(null);
  };

  const handleDeleteAgent = (agent: typeof mockAgents[0]) => {
    setDeleteModalAgent(agent);
    setDeleteNameConfirm("");
    setDeleteReason("");
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = () => {
    console.log('Deleting agent:', deleteModalAgent?.id, 'Reason:', deleteReason);
    setDeleteModalAgent(null);
    setDeleteNameConfirm("");
    setDeleteReason("");
  };

  const filteredAgents = mockAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAgents = filteredAgents.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* Part 1: Fixed header + search */}
      <div className="flex-shrink-0 bg-[#1E1E1E] pt-8 lg:pt-0">
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
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Agents</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockAgents.length} agents configured</p>
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
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Agents</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockAgents.length} agents configured</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
          />
        </div>
      </div>

      {/* Part 2: Scrollable card list */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar scrollbar-outset">
        <div className="space-y-3 mr-3">
        {paginatedAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-[#2B2B2B] rounded-xl p-5 border border-[#3B3B3B] hover:border-[#85b878]/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.isActive ? 'bg-[#85b878]/20' : 'bg-[#3B3B3B]'}`}>
                  <Bot className={`w-5 h-5 ${agent.isActive ? 'text-[#85b878]' : 'text-[#6B6B6B]'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">{agent.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${agent.isActive ? 'bg-[#85b878]/20 text-[#85b878]' : 'bg-[#3B3B3B] text-[#6B6B6B]'}`}>
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-1 line-clamp-1 max-w-md">
                    {agent.systemPrompt}
                  </p>
                  <div className="flex items-center gap-4 mt-2.5">
                    <span className="text-xs text-[#9C9A92]">{agent.conversations} conversations</span>
                    <span className="text-xs text-[#9C9A92]">{agent.knowledgeBases} knowledge bases</span>
                    <span className="text-xs text-[#9C9A92]">Threshold: {agent.confidenceThreshold}</span>
                    <span className="text-xs text-[#6B6B6B]">Updated {agent.updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="relative">
                <button
                  onClick={() => setOpenMenuId(openMenuId === agent.id ? null : agent.id)}
                  className="p-1.5 hover:bg-[#3B3B3B] rounded-lg transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-[#C2C0B6]" />
                </button>

                {openMenuId === agent.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-1 z-50 min-w-[160px]">
                      <button 
                        onClick={() => handleEditAgent(agent)}
                        className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleActivation(agent)}
                        className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors"
                      >
                        <Power className="w-3.5 h-3.5" />
                        {agent.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <div className="border-t border-[#2B2B2B] my-1" />
                      <button 
                        onClick={() => handleDeleteAgent(agent)}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#141413] hover:text-red-300 flex items-center gap-2 transition-colors"
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
        ))}
      </div>

      {/* Pagination */}
      {filteredAgents.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2">
          <div className="text-sm text-[#9C9A92]">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAgents.length)} of {filteredAgents.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#85b878] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#3B3B3B] disabled:hover:text-[#C2C0B6]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <div className="flex items-center gap-1 px-3">
              <span className="text-sm text-white">Page {currentPage}</span>
              <span className="text-sm text-[#6B6B6B]">of {totalPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#85b878] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#3B3B3B] disabled:hover:text-[#C2C0B6]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {filteredAgents.length === 0 && (
        <div className="bg-[#2B2B2B] rounded-xl p-8 text-center">
          <Bot className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
          <p className="text-sm text-[#6B6B6B]">
            {searchQuery ? "No agents match your search." : "No agents yet. Create your first agent to get started."}
          </p>
        </div>
      )}

      </div>{/* end scrollable */}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Create New Agent</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Maize Expert"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">System Prompt</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the agent's role, expertise, and how it should respond..."
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Response Style</label>
                  <input
                    type="text"
                    placeholder="e.g. Friendly, concise, uses local examples"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Confidence Threshold</label>
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
                    />
                    <span className="text-sm text-white w-10 text-right">{createThreshold.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-1">Queries below this confidence will be flagged for review</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm">
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Agent Modal */}
      {editModalAgent && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setEditModalAgent(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto thin-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Edit Agent</h2>
                <button
                  type="button"
                  onClick={() => setEditModalAgent(null)}
                  className="p-1.5 hover:bg-[#2B2B2B] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[#9C9A92]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    defaultValue={editModalAgent.name}
                    placeholder="e.g. Maize Expert"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">System Prompt</label>
                  <textarea
                    rows={5}
                    defaultValue={editModalAgent.systemPrompt}
                    placeholder="Describe the agent's role, expertise, and how it should respond..."
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Confidence Threshold</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={editThreshold}
                      onChange={(e) => setEditThreshold(parseFloat(e.target.value))}
                      className="flex-1 accent-[#5a7048] hover:brightness-110 transition-all"
                      style={{
                        background: `linear-gradient(to right, #5a7048 0%, #5a7048 ${editThreshold * 100}%, #3B3B3B ${editThreshold * 100}%, #3B3B3B 100%)`
                      }}
                    />
                    <span className="text-sm text-white w-10 text-right">{editThreshold.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-1">Queries below this confidence will be flagged for review</p>
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Knowledge Bases</label>
                  <div className="bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg p-3">
                    <p className="text-xs text-[#6B6B6B] mb-2">{editModalAgent.knowledgeBases} knowledge bases assigned</p>
                    <button className="text-xs text-[#85b878] hover:text-[#9dcf84] transition-colors">
                      Manage knowledge bases →
                    </button>
                  </div>
                </div>

                <div className="bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9C9A92]">Status</span>
                    <span className={editModalAgent.isActive ? "text-[#85b878]" : "text-[#6B6B6B]"}>
                      {editModalAgent.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-[#9C9A92]">Conversations</span>
                    <span className="text-white">{editModalAgent.conversations}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditModalAgent(null)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm">
                  Save Changes
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
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Power className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Deactivate Agent</h2>
                  <p className="text-sm text-[#9C9A92] mt-1">
                    Are you sure you want to deactivate <span className="text-white font-medium">{deactivateModalAgent.name}</span>?
                  </p>
                </div>
              </div>

              <div className="bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg p-3 mb-5">
                <p className="text-xs text-[#C2C0B6] leading-relaxed">
                  This agent will no longer respond to farmer queries. {deactivateModalAgent.conversations} conversation histories will be preserved, but farmers won't be able to select this agent for new chats.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeactivateModalAgent(null)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeactivateConfirm}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  Deactivate
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
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Delete Agent</h2>
                  <p className="text-sm text-[#9C9A92] mt-1">
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
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Reason for deletion (required)</label>
                  <textarea
                    rows={3}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Why are you deleting this agent?"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">
                    Type <span className="text-white font-mono">{deleteModalAgent.name}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteNameConfirm}
                    onChange={(e) => setDeleteNameConfirm(e.target.value)}
                    placeholder="Enter agent name exactly"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteModalAgent(null)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  disabled={deleteNameConfirm !== deleteModalAgent.name || !deleteReason.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
