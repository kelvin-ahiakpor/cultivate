"use client";

import { useState } from "react";
import { BookOpen, Upload, Search, FileText, File, MoreHorizontal, Trash2, Download, Eye, Filter, X, ExternalLink, ChevronDown, PanelLeft } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";

// Mock data - expanded for pagination
const mockDocuments = [
  { id: "1", title: "Maize Farming Best Practices", fileName: "maize-guide-2025.pdf", fileType: "PDF", chunkCount: 42, agentName: "General Farm Advisor", uploadedAt: "Jan 28, 2026", referencedInChats: 124 },
  { id: "2", title: "Pest Identification Guide - West Africa", fileName: "pest-id-guide.pdf", fileType: "PDF", chunkCount: 78, agentName: "Pest Management", uploadedAt: "Jan 25, 2026", referencedInChats: 89 },
  { id: "3", title: "Irrigation Scheduling Manual", fileName: "irrigation-manual.docx", fileType: "DOCX", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Jan 20, 2026", referencedInChats: 56 },
  { id: "4", title: "Soil Health & Fertilizer Guide", fileName: "soil-health.pdf", fileType: "PDF", chunkCount: 56, agentName: "Maize Expert", uploadedAt: "Jan 15, 2026", referencedInChats: 203 },
  { id: "5", title: "Cassava Disease Management", fileName: "cassava-diseases.pdf", fileType: "PDF", chunkCount: 64, agentName: "Pest Management", uploadedAt: "Jan 14, 2026", referencedInChats: 72 },
  { id: "6", title: "Tomato Cultivation Guide", fileName: "tomato-guide.pdf", fileType: "PDF", chunkCount: 48, agentName: "General Farm Advisor", uploadedAt: "Jan 12, 2026", referencedInChats: 34 },
  { id: "7", title: "Integrated Pest Management Strategies", fileName: "ipm-strategies.pdf", fileType: "PDF", chunkCount: 92, agentName: "Pest Management", uploadedAt: "Jan 10, 2026", referencedInChats: 167 },
  { id: "8", title: "Maize Hybrid Varieties Guide", fileName: "maize-hybrids.pdf", fileType: "PDF", chunkCount: 38, agentName: "Maize Expert", uploadedAt: "Jan 8, 2026", referencedInChats: 91 },
  { id: "9", title: "Water Conservation Techniques", fileName: "water-conservation.docx", fileType: "DOCX", chunkCount: 27, agentName: "General Farm Advisor", uploadedAt: "Jan 6, 2026", referencedInChats: 45 },
  { id: "10", title: "Organic Fertilizer Production", fileName: "organic-fert.pdf", fileType: "PDF", chunkCount: 44, agentName: "General Farm Advisor", uploadedAt: "Jan 5, 2026", referencedInChats: 78 },
  { id: "11", title: "Post-Harvest Handling Guide", fileName: "post-harvest.pdf", fileType: "PDF", chunkCount: 53, agentName: "General Farm Advisor", uploadedAt: "Jan 3, 2026", referencedInChats: 102 },
  { id: "12", title: "Armyworm Control Strategies", fileName: "armyworm-control.pdf", fileType: "PDF", chunkCount: 35, agentName: "Pest Management", uploadedAt: "Dec 30, 2025", referencedInChats: 88 },
  { id: "13", title: "Rice Production Manual", fileName: "rice-production.pdf", fileType: "PDF", chunkCount: 71, agentName: "General Farm Advisor", uploadedAt: "Dec 28, 2025", referencedInChats: 143 },
  { id: "14", title: "Seed Selection and Storage", fileName: "seed-guide.pdf", fileType: "PDF", chunkCount: 29, agentName: "Maize Expert", uploadedAt: "Dec 26, 2025", referencedInChats: 67 },
  { id: "15", title: "Crop Rotation Best Practices", fileName: "crop-rotation.pdf", fileType: "PDF", chunkCount: 41, agentName: "General Farm Advisor", uploadedAt: "Dec 24, 2025", referencedInChats: 112 },
  { id: "16", title: "Greenhouse Management Guide", fileName: "greenhouse.pdf", fileType: "PDF", chunkCount: 58, agentName: "General Farm Advisor", uploadedAt: "Dec 22, 2025", referencedInChats: 54 },
  { id: "17", title: "Fall Armyworm Identification", fileName: "faw-id.pdf", fileType: "PDF", chunkCount: 33, agentName: "Pest Management", uploadedAt: "Dec 20, 2025", referencedInChats: 134 },
  { id: "18", title: "Maize Weeding Techniques", fileName: "maize-weeding.pdf", fileType: "PDF", chunkCount: 24, agentName: "Maize Expert", uploadedAt: "Dec 18, 2025", referencedInChats: 76 },
  { id: "19", title: "Cocoa Farming in Ghana", fileName: "cocoa-guide.pdf", fileType: "PDF", chunkCount: 67, agentName: "General Farm Advisor", uploadedAt: "Dec 16, 2025", referencedInChats: 189 },
  { id: "20", title: "Poultry Integration on Farms", fileName: "poultry-integration.pdf", fileType: "PDF", chunkCount: 45, agentName: "General Farm Advisor", uploadedAt: "Dec 14, 2025", referencedInChats: 62 },
  { id: "21", title: "Soil pH Management", fileName: "soil-ph.pdf", fileType: "PDF", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Dec 12, 2025", referencedInChats: 95 },
  { id: "22", title: "Biological Pest Control Methods", fileName: "bio-pest-control.pdf", fileType: "PDF", chunkCount: 54, agentName: "Pest Management", uploadedAt: "Dec 10, 2025", referencedInChats: 121 },
  { id: "23", title: "Maize Storage and Preservation", fileName: "maize-storage.pdf", fileType: "PDF", chunkCount: 37, agentName: "Maize Expert", uploadedAt: "Dec 8, 2025", referencedInChats: 108 },
  { id: "24", title: "Okra Production Guide", fileName: "okra-guide.pdf", fileType: "PDF", chunkCount: 28, agentName: "General Farm Advisor", uploadedAt: "Dec 6, 2025", referencedInChats: 43 },
  { id: "25", title: "Compost Making Techniques", fileName: "compost.pdf", fileType: "PDF", chunkCount: 22, agentName: "General Farm Advisor", uploadedAt: "Dec 4, 2025", referencedInChats: 81 },
  { id: "26", title: "Aphid Control Strategies", fileName: "aphid-control.pdf", fileType: "PDF", chunkCount: 26, agentName: "Pest Management", uploadedAt: "Dec 2, 2025", referencedInChats: 73 },
  { id: "27", title: "Soybean Cultivation Manual", fileName: "soybean.pdf", fileType: "PDF", chunkCount: 49, agentName: "General Farm Advisor", uploadedAt: "Nov 30, 2025", referencedInChats: 97 },
  { id: "28", title: "Maize Planting Density Guide", fileName: "planting-density.pdf", fileType: "PDF", chunkCount: 19, agentName: "Maize Expert", uploadedAt: "Nov 28, 2025", referencedInChats: 84 },
  { id: "29", title: "Drip Irrigation Setup", fileName: "drip-irrigation.pdf", fileType: "PDF", chunkCount: 43, agentName: "General Farm Advisor", uploadedAt: "Nov 26, 2025", referencedInChats: 69 },
  { id: "30", title: "Locust Swarm Management", fileName: "locust-management.pdf", fileType: "PDF", chunkCount: 36, agentName: "Pest Management", uploadedAt: "Nov 24, 2025", referencedInChats: 38 },
  { id: "31", title: "Yam Production Techniques", fileName: "yam-production.pdf", fileType: "PDF", chunkCount: 52, agentName: "General Farm Advisor", uploadedAt: "Nov 22, 2025", referencedInChats: 116 },
  { id: "32", title: "Maize Fertilizer Application Schedule", fileName: "maize-fertilizer.pdf", fileType: "PDF", chunkCount: 34, agentName: "Maize Expert", uploadedAt: "Nov 20, 2025", referencedInChats: 152 },
  { id: "33", title: "Banana Farming Guide", fileName: "banana-guide.pdf", fileType: "PDF", chunkCount: 61, agentName: "General Farm Advisor", uploadedAt: "Nov 18, 2025", referencedInChats: 87 },
  { id: "34", title: "Whitefly Control Methods", fileName: "whitefly-control.pdf", fileType: "PDF", chunkCount: 29, agentName: "Pest Management", uploadedAt: "Nov 16, 2025", referencedInChats: 61 },
  { id: "35", title: "Groundnut Cultivation", fileName: "groundnut.pdf", fileType: "PDF", chunkCount: 47, agentName: "General Farm Advisor", uploadedAt: "Nov 14, 2025", referencedInChats: 94 },
  { id: "36", title: "Maize Harvesting Guidelines", fileName: "maize-harvest.pdf", fileType: "PDF", chunkCount: 25, agentName: "Maize Expert", uploadedAt: "Nov 12, 2025", referencedInChats: 128 },
  { id: "37", title: "Pepper Farming Best Practices", fileName: "pepper-guide.pdf", fileType: "PDF", chunkCount: 39, agentName: "General Farm Advisor", uploadedAt: "Nov 10, 2025", referencedInChats: 71 },
  { id: "38", title: "Integrated Nutrient Management", fileName: "nutrient-mgmt.pdf", fileType: "PDF", chunkCount: 55, agentName: "General Farm Advisor", uploadedAt: "Nov 8, 2025", referencedInChats: 139 },
  { id: "39", title: "Stem Borer Management", fileName: "stem-borer.pdf", fileType: "PDF", chunkCount: 32, agentName: "Pest Management", uploadedAt: "Nov 6, 2025", referencedInChats: 92 },
  { id: "40", title: "Maize Drought Tolerance", fileName: "drought-tolerance.pdf", fileType: "PDF", chunkCount: 41, agentName: "Maize Expert", uploadedAt: "Nov 4, 2025", referencedInChats: 156 },
  { id: "41", title: "Plantain Production Manual", fileName: "plantain.pdf", fileType: "PDF", chunkCount: 58, agentName: "General Farm Advisor", uploadedAt: "Nov 2, 2025", referencedInChats: 103 },
  { id: "42", title: "Garden Egg Cultivation", fileName: "garden-egg.pdf", fileType: "PDF", chunkCount: 27, agentName: "General Farm Advisor", uploadedAt: "Oct 31, 2025", referencedInChats: 49 },
  { id: "43", title: "Grasshopper Control Guide", fileName: "grasshopper.pdf", fileType: "PDF", chunkCount: 23, agentName: "Pest Management", uploadedAt: "Oct 29, 2025", referencedInChats: 57 },
  { id: "44", title: "Maize Market Price Analysis", fileName: "price-analysis.pdf", fileType: "PDF", chunkCount: 44, agentName: "Maize Expert", uploadedAt: "Oct 27, 2025", referencedInChats: 214 },
  { id: "45", title: "Cowpea Production Guide", fileName: "cowpea.pdf", fileType: "PDF", chunkCount: 36, agentName: "General Farm Advisor", uploadedAt: "Oct 25, 2025", referencedInChats: 68 },
  { id: "46", title: "Rodent Control in Storage", fileName: "rodent-control.pdf", fileType: "PDF", chunkCount: 28, agentName: "Pest Management", uploadedAt: "Oct 23, 2025", referencedInChats: 82 },
  { id: "47", title: "Sweet Potato Cultivation", fileName: "sweet-potato.pdf", fileType: "PDF", chunkCount: 42, agentName: "General Farm Advisor", uploadedAt: "Oct 21, 2025", referencedInChats: 75 },
  { id: "48", title: "Maize Disease Identification", fileName: "maize-diseases.pdf", fileType: "PDF", chunkCount: 68, agentName: "Maize Expert", uploadedAt: "Oct 19, 2025", referencedInChats: 187 },
  { id: "49", title: "Lettuce Farming Techniques", fileName: "lettuce.pdf", fileType: "PDF", chunkCount: 31, agentName: "General Farm Advisor", uploadedAt: "Oct 17, 2025", referencedInChats: 41 },
  { id: "50", title: "Thrips Management Strategies", fileName: "thrips.pdf", fileType: "PDF", chunkCount: 25, agentName: "Pest Management", uploadedAt: "Oct 15, 2025", referencedInChats: 63 },
  { id: "51", title: "Maize Climate Adaptation", fileName: "climate-adapt.pdf", fileType: "PDF", chunkCount: 51, agentName: "Maize Expert", uploadedAt: "Oct 13, 2025", referencedInChats: 178 },
  { id: "52", title: "Onion Production Manual", fileName: "onion.pdf", fileType: "PDF", chunkCount: 38, agentName: "General Farm Advisor", uploadedAt: "Oct 11, 2025", referencedInChats: 52 },
];

const agents = ["All Agents", "General Farm Advisor", "Pest Management", "Maize Expert"];

export default function KnowledgeView({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("All Agents");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  
  // View and Delete modals
  const [viewPanelDoc, setViewPanelDoc] = useState<typeof mockDocuments[0] | null>(null);
  const [deleteModalDoc, setDeleteModalDoc] = useState<typeof mockDocuments[0] | null>(null);
  
  // Upload modal states
  const [uploadType, setUploadType] = useState<'new' | 'update'>('new');
  const [updateDocId, setUpdateDocId] = useState<string>('');
  const [showDocSelectorModal, setShowDocSelectorModal] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  const handleViewDocument = (doc: typeof mockDocuments[0]) => {
    setViewPanelDoc(doc);
    setOpenMenuId(null);
  };

  const handleDownloadDocument = (doc: typeof mockDocuments[0]) => {
    // Client-side download simulation (no endpoint for now)
    const link = document.createElement('a');
    link.href = '#'; // Replace with actual file URL when backend is ready
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = () => {
    // Perform delete action here (API call when backend is ready)
    console.log('Deleting document:', deleteModalDoc?.id);
    setDeleteModalDoc(null);
  };

  const handleOpenUploadModal = () => {
    setUploadType('new');
    setUpdateDocId('');
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setUploadType('new');
    setUpdateDocId('');
    setDocSearchQuery('');
    setShowUploadModal(false);
  };

  const handleSelectDocument = (docId: string, docTitle: string) => {
    setUpdateDocId(docId);
    setShowDocSelectorModal(false);
    setDocSearchQuery('');
  };

  // Alphabetically sorted documents
  const sortedDocuments = [...mockDocuments].sort((a, b) => a.title.localeCompare(b.title));
  
  // Filtered documents for selector modal
  const filteredSelectorDocs = sortedDocuments.filter(doc =>
    doc.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

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
      <div className="flex-shrink-0 bg-[#1E1E1E] z-10 pt-8 lg:pt-0">
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
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Knowledge Base</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockDocuments.length} documents uploaded</p>
          </div>
          <div className="absolute right-0">
            <button
              onClick={handleOpenUploadModal}
              className="w-11 h-11 bg-[#5a7048] hover:bg-[#4a5d38] rounded-full flex items-center justify-center transition-colors"
              aria-label="Upload Document"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Knowledge Base</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockDocuments.length} documents uploaded</p>
          </div>
          <button
            onClick={handleOpenUploadModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm"
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

        {/* Table Header - Desktop only */}
        <div className="hidden lg:grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3 mr-2 border-b border-[#3B3B3B]">
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Document</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Agent</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Chunks</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Uploaded</span>
          <span></span>
        </div>
      </div>

      {/* PART 2: Scrollable Table Rows / Card List */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6 thin-scrollbar scrollbar-outset">
        {/* Mobile: Card layout */}
        <div className="lg:hidden space-y-3 pl-1.5 pr-1.5 mr-3">
          {paginatedDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setViewPanelDoc(doc)}
              className="bg-[#2B2B2B] rounded-lg p-4 hover:bg-[#2B2B2B]/70 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate mb-1">{doc.title}</p>
                  <p className="text-xs text-[#6B6B6B] truncate">{doc.fileName}</p>
                </div>
                <div className="w-8 h-8 bg-[#3B3B3B] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-[#85b878]" />
                </div>
              </div>
              <p className="text-xs text-[#9C9A92] truncate">{doc.agentName}</p>
            </div>
          ))}
        </div>

        {/* Desktop: Table Rows */}
        <div className="hidden lg:block">
          {paginatedDocs.map((doc, index) => (
            <div
              key={doc.id}
              className={`grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3.5 mr-3 hover:bg-[#2B2B2B]/30 transition-colors ${
                index === paginatedDocs.length - 1 ? '' : 'border-b border-[#3B3B3B]'
              }`}
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
                    <button 
                      onClick={() => handleViewDocument(doc)}
                      className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button 
                      onClick={() => handleDownloadDocument(doc)}
                      className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button 
                      onClick={() => { /* Handle update */ setOpenMenuId(null); }}
                      className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Update
                    </button>
                    <div className="border-t border-[#2B2B2B] my-1" />
                    <button 
                      onClick={() => { setDeleteModalDoc(doc); setOpenMenuId(null); }}
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
        ))}
        </div>

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

        {/* Pagination */}
        {filteredDocs.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-[#9C9A92] bg-[#2B2B2B] border border-[#3B3B3B] rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-[#6B6B6B]">
              {startIndex + 1}–{Math.min(endIndex, filteredDocs.length)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-[#9C9A92] bg-[#2B2B2B] border border-[#3B3B3B] rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={handleCloseUploadModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4">Upload Knowledge Base</h2>

              <div className="space-y-4">
                {/* Update or New Document */}
                <div className="bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg p-3">
                  <label className="block text-sm text-[#9C9A92] mb-2">What are you doing?</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="uploadType" 
                        value="new" 
                        checked={uploadType === 'new'}
                        onChange={() => setUploadType('new')}
                        className="accent-[#5a7048]" 
                      />
                      <span className="text-sm text-white">Uploading a new document</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="uploadType" 
                        value="update" 
                        checked={uploadType === 'update'}
                        onChange={() => setUploadType('update')}
                        className="accent-[#5a7048]" 
                      />
                      <span className="text-sm text-white">Updating an existing document</span>
                    </label>
                  </div>
                </div>

                {/* Show document selector when updating */}
                {uploadType === 'update' && (
                  <div>
                    <label className="block text-sm text-[#9C9A92] mb-1.5">Select document to update</label>
                    <button
                      type="button"
                      onClick={() => setShowDocSelectorModal(true)}
                      className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-left hover:border-[#5a7048] transition-colors"
                    >
                      {updateDocId ? (
                        <span className="text-white">{mockDocuments.find(d => d.id === updateDocId)?.title}</span>
                      ) : (
                        <span className="text-[#6B6B6B]">Click to select a document...</span>
                      )}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Maize Farming Best Practices"
                    className="w-full px-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#5a7048]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#9C9A92] mb-1.5">Assign to Agent</label>
                  <div className="relative">
                  <select className="w-full px-3 py-2.5 pr-10 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white focus:outline-none focus:border-[#5a7048] appearance-none">
                      <option value="">Select an agent...</option>
                      <option>General Farm Advisor</option>
                      <option>Maize Expert</option>
                      <option>Pest Management</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] pointer-events-none" />
                  </div>
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
                  onClick={handleCloseUploadModal}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm">
                  Upload
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Document Panel - Mobile: Full screen modal, Desktop: Side panel */}
      {viewPanelDoc && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setViewPanelDoc(null)}
          />
          {/* Mobile: Centered modal */}
          <div className="lg:hidden fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl pointer-events-auto"
            >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2B2B]">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-sm font-medium text-white truncate">{viewPanelDoc.title}</h2>
                <p className="text-xs text-[#9C9A92] mt-0.5 truncate">{viewPanelDoc.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewPanelDoc(null)}
                className="p-1.5 hover:bg-[#2B2B2B] rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-[#9C9A92]" />
              </button>
            </div>

            {/* Document Metadata */}
            <div className="flex-1 overflow-y-auto px-4 py-4 thin-scrollbar">
              <div className="space-y-4">
                <div className="bg-[#2B2B2B] rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9C9A92]">Chunks</span>
                    <span className="text-white">{viewPanelDoc.chunkCount} segments</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9C9A92]">Uploaded</span>
                    <span className="text-white">{viewPanelDoc.uploadedAt}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9C9A92]">Last updated</span>
                    <span className="text-white">{viewPanelDoc.uploadedAt}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9C9A92]">Referenced in</span>
                    <span className="text-white">{viewPanelDoc.referencedInChats} chats</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-[#9C9A92] uppercase tracking-wide mb-2">Used by agents</h3>
                  <div className="bg-[#2B2B2B] rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#85b878]/20 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-[#85b878]">✓</span>
                      </div>
                      <span className="text-sm text-white">{viewPanelDoc.agentName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[#2B2B2B]">
              <button
                onClick={() => setViewPanelDoc(null)}
                className="w-full px-4 py-2 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#C2C0B6] transition-colors"
              >
                Close
              </button>
            </div>
            </div>
          </div>

          {/* Desktop: Side panel */}
          <div className="hidden lg:flex fixed top-0 right-0 h-full w-[600px] bg-[#1C1C1C] border-l border-[#2B2B2B] z-50 flex-col shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B2B2B]">
              <div>
                <h2 className="text-sm font-medium text-white">{viewPanelDoc.title}</h2>
                <p className="text-xs text-[#9C9A92] mt-0.5">{viewPanelDoc.fileName} · {viewPanelDoc.fileType}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewPanelDoc(null)}
                className="p-1.5 hover:bg-[#2B2B2B] rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-[#9C9A92]" />
              </button>
            </div>

            {/* Document Metadata */}
            <div className="px-5 py-4 border-b border-[#2B2B2B] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9C9A92]">Primary Agent</span>
                <span className="text-white">{viewPanelDoc.agentName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9C9A92]">Chunks</span>
                <span className="text-white">{viewPanelDoc.chunkCount} segments</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9C9A92]">Uploaded</span>
                <span className="text-white">{viewPanelDoc.uploadedAt}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9C9A92]">Last updated</span>
                <span className="text-white">{viewPanelDoc.uploadedAt}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9C9A92]">Referenced in chats</span>
                <span className="text-white">{viewPanelDoc.referencedInChats} conversations</span>
              </div>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); /* Open actual file when backend ready */ }}
                className="flex items-center gap-2 text-sm text-[#85b878] hover:text-[#9dcf84] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open original document
              </a>
            </div>

            {/* Scrollable Document Preview/Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 thin-scrollbar">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-[#9C9A92] uppercase tracking-wide mb-2">Document Preview</h3>
                  <div className="text-sm text-[#C2C0B6] leading-relaxed space-y-3">
                    <p>This knowledge base document contains comprehensive information about {viewPanelDoc.title.toLowerCase()}. The content has been processed and chunked into {viewPanelDoc.chunkCount} segments for optimal retrieval by the AI agent.</p>
                    <p className="text-[#6B6B6B] italic">Full document preview will be available when backend integration is complete. The RAG system will use vector embeddings to retrieve relevant chunks based on farmer queries.</p>
                  </div>
                </div>

                {/* Mock chunk preview */}
                <div className="pt-3 border-t border-[#2B2B2B]">
                  <h3 className="text-xs font-medium text-[#9C9A92] uppercase tracking-wide mb-3">Sample Chunks (Preview)</h3>
                  <div className="space-y-2">
                    {Array.from({ length: Math.min(5, viewPanelDoc.chunkCount) }).map((_, i) => (
                      <div key={i} className="p-3 bg-[#141413] border border-[#2B2B2B] rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-[#6B6B6B]">Chunk {i + 1}</span>
                          <span className="text-xs text-[#6B6B6B]">~250 tokens</span>
                        </div>
                        <p className="text-xs text-[#9C9A92] leading-relaxed">
                          Sample content from chunk {i + 1} will appear here once the document is processed by the RAG pipeline...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-3 border-t border-[#2B2B2B] flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadDocument(viewPanelDoc)}
                className="flex-1 px-4 py-2 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={() => setViewPanelDoc(null)}
                className="flex-1 px-4 py-2 text-sm text-[#C2C0B6] hover:text-white border border-[#3B3B3B] rounded-lg hover:border-[#C2C0B6] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalDoc && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDeleteModalDoc(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Delete Document</h2>
                  <p className="text-sm text-[#9C9A92] mt-1">
                    Are you sure you want to delete <span className="text-white font-medium">{deleteModalDoc.title}</span>?
                  </p>
                </div>
              </div>

              <div className="bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg p-3 mb-5">
                <p className="text-xs text-[#C2C0B6] leading-relaxed">
                  This will remove the document and all {deleteModalDoc.chunkCount} associated chunks from the knowledge base. 
                  The <span className="text-white">{deleteModalDoc.agentName}</span> agent will no longer be able to reference this information.
                </p>
                <div className="mt-3 pt-3 border-t border-[#3B3B3B]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9C9A92]">Referenced in conversations:</span>
                    <span className="text-xs font-medium text-orange-400">{deleteModalDoc.referencedInChats} chats</span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-1.5">
                    Note: This document is actively used. Consider creating a new version instead of deleting.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteModalDoc(null)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Delete Document
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Document Selector Modal */}
      {showDocSelectorModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowDocSelectorModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2B2B2B] w-full max-w-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Select Document to Update</h2>
                <button
                  type="button"
                  onClick={() => setShowDocSelectorModal(false)}
                  className="p-1 hover:bg-[#2B2B2B] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#9C9A92]" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#5a7048]"
                />
              </div>

              {/* Documents List */}
              <div className="max-h-[400px] overflow-y-auto thin-scrollbar scrollbar-outset pr-2 space-y-1">
                {filteredSelectorDocs.length === 0 ? (
                  <div className="text-center py-8 text-[#6B6B6B] text-sm">
                    No documents found
                  </div>
                ) : (
                  filteredSelectorDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDocument(doc.id, doc.title)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        updateDocId === doc.id
                          ? 'bg-[#5a7048] text-white'
                          : 'hover:bg-[#2B2B2B] text-[#C2C0B6]'
                      }`}
                    >
                      <div className="font-medium text-sm">{doc.title}</div>
                      <div className="text-xs text-[#9C9A92] mt-0.5">
                        {doc.fileName} · {doc.agentName}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#2B2B2B]">
                <button
                  onClick={() => setShowDocSelectorModal(false)}
                  className="px-4 py-2 text-sm text-[#C2C0B6] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
