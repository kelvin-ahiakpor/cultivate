"use client";

import { useState } from "react";
import { Bot, Plus, Search, MoreHorizontal, Power, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function AgentsView() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

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
      <div className="flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Agents</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockAgents.length} agents configured</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#85b878] text-white rounded-lg hover:bg-[#536d3d] transition-colors text-sm"
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
                      <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors">
                        <Power className="w-3.5 h-3.5" />
                        {agent.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <div className="border-t border-[#2B2B2B] my-1" />
                      <button className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#141413] hover:text-red-300 flex items-center gap-2 transition-colors">
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
                      defaultValue="0.7"
                      className="flex-1 accent-[#85b878]"
                    />
                    <span className="text-sm text-white w-10 text-right">0.70</span>
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
                <button className="px-4 py-2 bg-[#85b878] text-white rounded-lg hover:bg-[#536d3d] transition-colors text-sm">
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
