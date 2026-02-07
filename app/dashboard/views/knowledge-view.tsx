"use client";

import { useState } from "react";
import { BookOpen, Upload, Search, FileText, File, MoreHorizontal, Trash2, Download, Eye } from "lucide-react";

// Mock data
const mockDocuments = [
  {
    id: "1",
    title: "Maize Farming Best Practices",
    fileName: "maize-guide-2025.pdf",
    fileType: "PDF",
    chunkCount: 42,
    agentName: "General Farm Advisor",
    uploadedAt: "Jan 28, 2026",
  },
  {
    id: "2",
    title: "Pest Identification Guide - West Africa",
    fileName: "pest-id-guide.pdf",
    fileType: "PDF",
    chunkCount: 78,
    agentName: "Pest Management",
    uploadedAt: "Jan 25, 2026",
  },
  {
    id: "3",
    title: "Irrigation Scheduling Manual",
    fileName: "irrigation-manual.docx",
    fileType: "DOCX",
    chunkCount: 31,
    agentName: "General Farm Advisor",
    uploadedAt: "Jan 20, 2026",
  },
  {
    id: "4",
    title: "Soil Health & Fertilizer Guide",
    fileName: "soil-health.pdf",
    fileType: "PDF",
    chunkCount: 56,
    agentName: "Maize Expert",
    uploadedAt: "Jan 15, 2026",
  },
];

export default function KnowledgeView() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const filteredDocs = mockDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.agentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
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

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
        <input
          type="text"
          placeholder="Search documents or agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
        />
      </div>

      {/* Documents Table */}
      <div className="bg-[#2B2B2B] rounded-xl border border-[#3B3B3B] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3 border-b border-[#3B3B3B]">
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Document</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Agent</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Chunks</span>
          <span className="text-xs text-[#6B6B6B] uppercase tracking-wide">Uploaded</span>
          <span></span>
        </div>

        {/* Table Rows */}
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3.5 border-b border-[#3B3B3B] last:border-b-0 hover:bg-[#333333] transition-colors"
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

        {filteredDocs.length === 0 && (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
            <p className="text-sm text-[#6B6B6B]">
              {searchQuery ? "No documents match your search." : "No documents uploaded yet."}
            </p>
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
