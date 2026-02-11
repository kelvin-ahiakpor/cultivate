"use client";

import { useState } from "react";
import { BookOpen, Upload, Search, FileText, File, MoreHorizontal, Trash2, Download, Eye, Filter, ChevronLeft, ChevronRight } from "lucide-react";

// Mock data - expanded for pagination
const mockDocuments = [
  { id: "1", title: "Maize Farming Best Practices", fileName: "maize-guide-2025.pdf", fileType: "PDF", chunkCount: 42, agentName: "General Farm Advisor", uploadedAt: "Jan 28, 2026" },
  { id: "2", title: "Pest Identification Guide - West Africa", fileName: "pest-id-guide.pdf", fileType: "PDF", chunkCount: 78, agentName: "Pest Management", uploadedAt: "Jan 25, 2026" },
  { id: "3", title: "Irrigation Scheduling Manual", fileName: "irrigation-manual.docx", fileType: "DOCX", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Jan 20, 2026" },
  { id: "4", title: "Soil Health & Fertilizer Guide", fileName: "soil-health.pdf", fileType: "PDF", chunkCount: 56, agentName: "Maize Expert", uploadedAt: "Jan 15, 2026" },
  { id: "5", title: "Cassava Disease Management", fileName: "cassava-diseases.pdf", fileType: "PDF", chunkCount: 64, agentName: "Pest Management", uploadedAt: "Jan 14, 2026" },
  { id: "6", title: "Tomato Cultivation Guide", fileName: "tomato-guide.pdf", fileType: "PDF", chunkCount: 48, agentName: "General Farm Advisor", uploadedAt: "Jan 12, 2026" },
  { id: "7", title: "Integrated Pest Management Strategies", fileName: "ipm-strategies.pdf", fileType: "PDF", chunkCount: 92, agentName: "Pest Management", uploadedAt: "Jan 10, 2026" },
  { id: "8", title: "Maize Hybrid Varieties Guide", fileName: "maize-hybrids.pdf", fileType: "PDF", chunkCount: 38, agentName: "Maize Expert", uploadedAt: "Jan 8, 2026" },
  { id: "9", title: "Water Conservation Techniques", fileName: "water-conservation.docx", fileType: "DOCX", chunkCount: 27, agentName: "General Farm Advisor", uploadedAt: "Jan 6, 2026" },
  { id: "10", title: "Organic Fertilizer Production", fileName: "organic-fert.pdf", fileType: "PDF", chunkCount: 44, agentName: "General Farm Advisor", uploadedAt: "Jan 5, 2026" },
  { id: "11", title: "Post-Harvest Handling Guide", fileName: "post-harvest.pdf", fileType: "PDF", chunkCount: 53, agentName: "General Farm Advisor", uploadedAt: "Jan 3, 2026" },
  { id: "12", title: "Armyworm Control Strategies", fileName: "armyworm-control.pdf", fileType: "PDF", chunkCount: 35, agentName: "Pest Management", uploadedAt: "Dec 30, 2025" },
  { id: "13", title: "Rice Production Manual", fileName: "rice-production.pdf", fileType: "PDF", chunkCount: 71, agentName: "General Farm Advisor", uploadedAt: "Dec 28, 2025" },
  { id: "14", title: "Seed Selection and Storage", fileName: "seed-guide.pdf", fileType: "PDF", chunkCount: 29, agentName: "Maize Expert", uploadedAt: "Dec 26, 2025" },
  { id: "15", title: "Crop Rotation Best Practices", fileName: "crop-rotation.pdf", fileType: "PDF", chunkCount: 41, agentName: "General Farm Advisor", uploadedAt: "Dec 24, 2025" },
  { id: "16", title: "Greenhouse Management Guide", fileName: "greenhouse.pdf", fileType: "PDF", chunkCount: 58, agentName: "General Farm Advisor", uploadedAt: "Dec 22, 2025" },
  { id: "17", title: "Fall Armyworm Identification", fileName: "faw-id.pdf", fileType: "PDF", chunkCount: 33, agentName: "Pest Management", uploadedAt: "Dec 20, 2025" },
  { id: "18", title: "Maize Weeding Techniques", fileName: "maize-weeding.pdf", fileType: "PDF", chunkCount: 24, agentName: "Maize Expert", uploadedAt: "Dec 18, 2025" },
  { id: "19", title: "Cocoa Farming in Ghana", fileName: "cocoa-guide.pdf", fileType: "PDF", chunkCount: 67, agentName: "General Farm Advisor", uploadedAt: "Dec 16, 2025" },
  { id: "20", title: "Poultry Integration on Farms", fileName: "poultry-integration.pdf", fileType: "PDF", chunkCount: 45, agentName: "General Farm Advisor", uploadedAt: "Dec 14, 2025" },
  { id: "21", title: "Soil pH Management", fileName: "soil-ph.pdf", fileType: "PDF", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Dec 12, 2025" },
  { id: "22", title: "Biological Pest Control Methods", fileName: "bio-pest-control.pdf", fileType: "PDF", chunkCount: 54, agentName: "Pest Management", uploadedAt: "Dec 10, 2025" },
  { id: "23", title: "Maize Storage and Preservation", fileName: "maize-storage.pdf", fileType: "PDF", chunkCount: 37, agentName: "Maize Expert", uploadedAt: "Dec 8, 2025" },
  { id: "24", title: "Okra Production Guide", fileName: "okra-guide.pdf", fileType: "PDF", chunkCount: 28, agentName: "General Farm Advisor", uploadedAt: "Dec 6, 2025" },
  { id: "25", title: "Compost Making Techniques", fileName: "compost.pdf", fileType: "PDF", chunkCount: 22, agentName: "General Farm Advisor", uploadedAt: "Dec 4, 2025" },
  { id: "26", title: "Aphid Control Strategies", fileName: "aphid-control.pdf", fileType: "PDF", chunkCount: 26, agentName: "Pest Management", uploadedAt: "Dec 2, 2025" },
  { id: "27", title: "Soybean Cultivation Manual", fileName: "soybean.pdf", fileType: "PDF", chunkCount: 49, agentName: "General Farm Advisor", uploadedAt: "Nov 30, 2025" },
  { id: "28", title: "Maize Planting Density Guide", fileName: "planting-density.pdf", fileType: "PDF", chunkCount: 19, agentName: "Maize Expert", uploadedAt: "Nov 28, 2025" },
  { id: "29", title: "Drip Irrigation Setup", fileName: "drip-irrigation.pdf", fileType: "PDF", chunkCount: 43, agentName: "General Farm Advisor", uploadedAt: "Nov 26, 2025" },
  { id: "30", title: "Locust Swarm Management", fileName: "locust-management.pdf", fileType: "PDF", chunkCount: 36, agentName: "Pest Management", uploadedAt: "Nov 24, 2025" },
  { id: "31", title: "Yam Production Techniques", fileName: "yam-production.pdf", fileType: "PDF", chunkCount: 52, agentName: "General Farm Advisor", uploadedAt: "Nov 22, 2025" },
  { id: "32", title: "Maize Fertilizer Application Schedule", fileName: "maize-fertilizer.pdf", fileType: "PDF", chunkCount: 34, agentName: "Maize Expert", uploadedAt: "Nov 20, 2025" },
  { id: "33", title: "Banana Farming Guide", fileName: "banana-guide.pdf", fileType: "PDF", chunkCount: 61, agentName: "General Farm Advisor", uploadedAt: "Nov 18, 2025" },
  { id: "34", title: "Whitefly Control Methods", fileName: "whitefly-control.pdf", fileType: "PDF", chunkCount: 29, agentName: "Pest Management", uploadedAt: "Nov 16, 2025" },
  { id: "35", title: "Groundnut Cultivation", fileName: "groundnut.pdf", fileType: "PDF", chunkCount: 47, agentName: "General Farm Advisor", uploadedAt: "Nov 14, 2025" },
  { id: "36", title: "Maize Harvesting Guidelines", fileName: "maize-harvest.pdf", fileType: "PDF", chunkCount: 25, agentName: "Maize Expert", uploadedAt: "Nov 12, 2025" },
  { id: "37", title: "Pepper Farming Best Practices", fileName: "pepper-guide.pdf", fileType: "PDF", chunkCount: 39, agentName: "General Farm Advisor", uploadedAt: "Nov 10, 2025" },
  { id: "38", title: "Integrated Nutrient Management", fileName: "nutrient-mgmt.pdf", fileType: "PDF", chunkCount: 55, agentName: "General Farm Advisor", uploadedAt: "Nov 8, 2025" },
  { id: "39", title: "Stem Borer Management", fileName: "stem-borer.pdf", fileType: "PDF", chunkCount: 32, agentName: "Pest Management", uploadedAt: "Nov 6, 2025" },
  { id: "40", title: "Maize Drought Tolerance", fileName: "drought-tolerance.pdf", fileType: "PDF", chunkCount: 41, agentName: "Maize Expert", uploadedAt: "Nov 4, 2025" },
  { id: "41", title: "Plantain Production Manual", fileName: "plantain.pdf", fileType: "PDF", chunkCount: 58, agentName: "General Farm Advisor", uploadedAt: "Nov 2, 2025" },
  { id: "42", title: "Garden Egg Cultivation", fileName: "garden-egg.pdf", fileType: "PDF", chunkCount: 27, agentName: "General Farm Advisor", uploadedAt: "Oct 31, 2025" },
  { id: "43", title: "Grasshopper Control Guide", fileName: "grasshopper.pdf", fileType: "PDF", chunkCount: 23, agentName: "Pest Management", uploadedAt: "Oct 29, 2025" },
  { id: "44", title: "Maize Market Price Analysis", fileName: "price-analysis.pdf", fileType: "PDF", chunkCount: 44, agentName: "Maize Expert", uploadedAt: "Oct 27, 2025" },
  { id: "45", title: "Cowpea Production Guide", fileName: "cowpea.pdf", fileType: "PDF", chunkCount: 36, agentName: "General Farm Advisor", uploadedAt: "Oct 25, 2025" },
  { id: "46", title: "Rodent Control in Storage", fileName: "rodent-control.pdf", fileType: "PDF", chunkCount: 28, agentName: "Pest Management", uploadedAt: "Oct 23, 2025" },
  { id: "47", title: "Sweet Potato Cultivation", fileName: "sweet-potato.pdf", fileType: "PDF", chunkCount: 42, agentName: "General Farm Advisor", uploadedAt: "Oct 21, 2025" },
  { id: "48", title: "Maize Disease Identification", fileName: "maize-diseases.pdf", fileType: "PDF", chunkCount: 68, agentName: "Maize Expert", uploadedAt: "Oct 19, 2025" },
  { id: "49", title: "Lettuce Farming Techniques", fileName: "lettuce.pdf", fileType: "PDF", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Oct 17, 2025" },
  { id: "50", title: "Thrips Management Strategies", fileName: "thrips.pdf", fileType: "PDF", chunkCount: 25, agentName: "Pest Management", uploadedAt: "Oct 15, 2025" },
  { id: "51", title: "Maize Climate Adaptation", fileName: "climate-adapt.pdf", fileType: "PDF", chunkCount: 51, agentName: "Maize Expert", uploadedAt: "Oct 13, 2025" },
  { id: "52", title: "Onion Production Manual", fileName: "onion.pdf", fileType: "PDF", chunkCount: 38, agentName: "General Farm Advisor", uploadedAt: "Oct 11, 2025" },
];

const agents = ["All Agents", "General Farm Advisor", "Pest Management", "Maize Expert"];

export default function KnowledgeView() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("All Agents");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Filter by agent and search query
  const filteredDocs = mockDocuments.filter(doc => {
    const matchesAgent = selectedAgent === "All Agents" || doc.agentName === selectedAgent;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.agentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleAgentChange = (agent: string) => {
    setSelectedAgent(agent);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section - stays at top */}
      <div className="flex-shrink-0 bg-[#1E1E1E] z-10 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Knowledge Base</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockDocuments.length} documents uploaded</p>
          </div>  
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#85b878] text-white rounded-lg hover:bg-[#536d3d] transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center gap-3 mb-6">
          {/* Agent Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] pointer-events-none" />
            <select
              value={selectedAgent}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-[#C2C0B6] focus:outline-none focus:border-[#85b878] cursor-pointer appearance-none min-w-[200px]"
            >
              {agents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-[78.5%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
            />
          </div>
        </div>

        {/* Document Count */}
        <div className="mb-4 px-1">
          <p className="text-sm text-[#9C9A92]">
            {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
            {(searchQuery || selectedAgent !== "All Agents") && (
              <span className="text-[#6B6B6B]"> &middot; filtered from {mockDocuments.length} total</span>
            )}
          </p>
        </div>

        {/* Table Header - part of fixed section */}
        <div className="grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3 mr-2 border-b border-[#3B3B3B]">
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Document</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Agent</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Chunks</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Uploaded</span>
          <span></span>
        </div>
      </div>

      {/* PART 2: Scrollable Table Rows */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6 thin-scrollbar scrollbar-outset">
        {/* Table Rows */}
        {paginatedDocs.map((doc) => (
          <div
            key={doc.id}
            className="grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3.5 mr-3 border-b border-[#3B3B3B] hover:bg-[#2B2B2B]/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-[#3B3B3B] rounded-lg flex items-center justify-center flex-shrink-0">
                {doc.fileType === "PDF" ? (
                  <FileText className="w-4 h-4 text-[#e8c8ab]" />
                ) : (
                  <File className="w-4 h-4 text-[#608e96]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{doc.title}</p>
                <p className="text-xs text-[#6B6B6B] truncate">{doc.fileName}</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-[#9C9A92] truncate">{doc.agentName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-[#9C9A92]">{doc.chunkCount}</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-[#6B6B6B]">{doc.uploadedAt}</span>
            </div>
            <div className="flex items-center relative">
              <button
                onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-[#C2C0B6]" />
              </button>

              {openMenuId === doc.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-1 z-50 min-w-[140px]">
                    <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      Download
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
        ))}

        {paginatedDocs.length === 0 && (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
            <p className="text-sm text-[#6B6B6B]">
              {searchQuery || selectedAgent !== "All Agents" 
                ? "No documents match your filters." 
                : "No documents uploaded yet."}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredDocs.length > 0 && (
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-t border-[#3B3B3B] mt-2">
            <div className="text-sm text-[#9C9A92]">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredDocs.length)} of {filteredDocs.length}
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
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowUploadModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Upload Knowledge Base</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Maize Farming Best Practices"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Assign to Agent</label>
                  <select className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white focus:outline-none focus:border-[#85b878]">
                    <option value="">Select an agent...</option>
                    <option>General Farm Advisor</option>
                    <option>Maize Expert</option>
                    <option>Pest Management</option>
                  </select>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragOver ? 'border-[#85b878] bg-[#85b878]/5' : 'border-[#3B3B3B]'
                  }`}
                >
                  <Upload className="w-8 h-8 text-[#6B6B6B] mx-auto mb-3" />
                  <p className="text-sm text-[#C2C0B6] mb-1">Drag and drop your file here</p>
                  <p className="text-xs text-[#6B6B6B] mb-3">or</p>
                  <button className="px-4 py-2 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-[#C2C0B6] hover:border-[#85b878] transition-colors">
                    Browse Files
                  </button>
                  <p className="text-xs text-[#6B6B6B] mt-3">Supports PDF, DOCX, TXT (max 25MB)</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-[#85b878] text-white rounded-lg hover:bg-[#536d3d] transition-colors text-sm">
                  Upload
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
