"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Upload, Search, FileText, File, MoreHorizontal, Trash2, Download, Eye, Filter, X, ExternalLink, ChevronDown, PanelLeft, Loader2, Pencil } from "lucide-react";
import GlassCircleButton from "@/components/glass-circle-button";
import { useKnowledgeBases, uploadDocument, deleteDocument, renameDocument, type KnowledgeDoc } from "@/lib/hooks/use-knowledge-bases";
import { useAgents } from "@/lib/hooks/use-agents";
import { DEMO_KNOWLEDGE } from "@/lib/demo-data";
import CustomSelect from "@/components/custom-select";
import { notify } from "@/lib/toast";

// Mock data for demo mode — sourced from lib/demo-data.ts
const mockDocuments = DEMO_KNOWLEDGE;

// Demo-only hardcoded agent names for filter dropdown and upload form
const demoAgentNames = ["All Agents", "General Farm Advisor", "Pest Management", "Maize Expert"];

export default function KnowledgeView({
  sidebarOpen,
  setSidebarOpen,
  demoMode = false,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  // demoMode: uses local mockDocuments, makes zero API requests. See BACKEND-PROGRESS.md § Phase 5.
  demoMode?: boolean;
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // agentFilter: demo = agent name string, real = agent ID string (empty = all)
  const [agentFilter, setAgentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // View and Delete modals
  const [viewPanelDoc, setViewPanelDoc] = useState<KnowledgeDoc | null>(null);
  const [deleteModalDoc, setDeleteModalDoc] = useState<KnowledgeDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingTitleDocId, setEditingTitleDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const inlineTitleRef = useRef<HTMLDivElement | null>(null);
  const renameDraftRef = useRef("");

  // Chunk preview state
  const [chunks, setChunks] = useState<Array<{ chunkIndex: number; content: string; tokenCount: number; id: string }>>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAgentId, setUploadAgentId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadKbType, setUploadKbType] = useState("RELATED");
  const [uploadContentType, setUploadContentType] = useState("");
  const [uploadSourceType, setUploadSourceType] = useState("PDF_UPLOAD");
  const [uploadDescription, setUploadDescription] = useState("");
  
  // Upload modal states
  const [uploadType, setUploadType] = useState<'new' | 'update'>('new');
  const [updateDocId, setUpdateDocId] = useState<string>('');
  const [showDocSelectorModal, setShowDocSelectorModal] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Fetch documents — disabled in demo mode (null SWR key → zero requests)
  const apiData = useKnowledgeBases(
    searchQuery,
    agentFilter,
    currentPage,
    itemsPerPage,
    demoMode
  );

  // Fetch real agents for filter dropdown and upload form — also disabled in demo
  const { agents: realAgents } = useAgents("", 1, 100, demoMode);

  // Demo: filter mockDocuments client-side. Real: API already filtered + paginated.
  const filteredDocs: KnowledgeDoc[] = demoMode
    ? (mockDocuments as KnowledgeDoc[]).filter((doc) => {
        const matchesAgent = !agentFilter || doc.agentName === agentFilter;
        const matchesSearch =
          !searchQuery ||
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.agentName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesAgent && matchesSearch;
      })
    : apiData.documents;

  const totalCount = demoMode ? mockDocuments.length : apiData.total;
  const filteredCount = demoMode ? filteredDocs.length : apiData.total;
  const totalPages = demoMode
    ? Math.ceil(filteredDocs.length / itemsPerPage)
    : apiData.totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  // Demo: slice client-side. Real: already paginated from server.
  const paginatedDocs = demoMode ? filteredDocs.slice(startIndex, endIndex) : filteredDocs;

  const handleViewDocument = (doc: KnowledgeDoc) => {
    setViewPanelDoc(doc);
    setOpenMenuId(null);
  };

  const handleCloseViewPanel = () => {
    setViewPanelDoc(null);
    setEditingTitleDocId(null);
    setRenameTitle("");
  };

  const handleDownloadDocument = (doc: KnowledgeDoc) => {
    // No file URL available yet — placeholder
    const link = document.createElement('a');
    link.href = '#';
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalDoc) return;
    if (demoMode) { setDeleteModalDoc(null); return; }
    setDeleting(true);
    try {
      await deleteDocument(deleteModalDoc.id);
      apiData.mutate();
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeleting(false);
      setDeleteModalDoc(null);
    }
  };

  const handleStartInlineRename = (doc: KnowledgeDoc) => {
    setViewPanelDoc(doc);
    setEditingTitleDocId(doc.id);
    setRenameTitle(doc.title);
    renameDraftRef.current = doc.title;
    setOpenMenuId(null);
  };

  const handleRenameConfirm = async (doc: KnowledgeDoc) => {
    if (renaming) return;

    const activeDoc = viewPanelDoc?.id === doc.id ? viewPanelDoc : doc;
    const trimmedTitle = renameDraftRef.current.trim();
    if (!trimmedTitle) {
      notify.error("Document title cannot be empty.");
      return;
    }

    if (trimmedTitle === activeDoc.title) {
      setEditingTitleDocId(null);
      return;
    }

    if (demoMode) {
      notify.success("Rename is disabled in demo mode.");
      setEditingTitleDocId(null);
      return;
    }

    setRenaming(true);
    try {
      await renameDocument(doc.id, trimmedTitle);
      await apiData.mutate();
      notify.success("Document name updated.");

      if (viewPanelDoc?.id === doc.id) {
        setViewPanelDoc({ ...viewPanelDoc, title: trimmedTitle });
      }

      setRenameTitle(trimmedTitle);
      setEditingTitleDocId(null);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setRenaming(false);
    }
  };

  const handleCancelInlineRename = () => {
    setEditingTitleDocId(null);
    setRenameTitle("");
    renameDraftRef.current = "";
  };

  useEffect(() => {
    if (!editingTitleDocId || !inlineTitleRef.current) return;
    const el = inlineTitleRef.current;
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingTitleDocId]);

  useEffect(() => {
    if (!editingTitleDocId || renaming) return;
    const currentDoc = viewPanelDoc;
    if (!currentDoc || currentDoc.id !== editingTitleDocId) return;

    const timeout = window.setTimeout(() => {
      void handleRenameConfirm(currentDoc);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [renameTitle, editingTitleDocId, renaming, viewPanelDoc]);

  const handleStartUpdate = (doc: KnowledgeDoc) => {
    setOpenMenuId(null);
    handleCloseViewPanel();
    setUploadType('update');
    setUpdateDocId(doc.id);
    setUploadTitle(doc.title);
    setUploadAgentId(doc.agentId);
    setUploadFile(null);
    setUploadError('');
    setShowUploadModal(true);
  };

  const handleOpenUploadModal = () => {
    setUploadType('new');
    setUpdateDocId('');
    setUploadTitle('');
    setUploadAgentId('');
    setUploadFile(null);
    setUploadError('');
    // Reset KB categorization fields
    setUploadKbType("RELATED");
    setUploadContentType("");
    setUploadSourceType("PDF_UPLOAD");
    setUploadDescription("");
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setUploadType('new');
    setUpdateDocId('');
    setDocSearchQuery('');
    setUploadTitle('');
    setUploadAgentId('');
    setUploadFile(null);
    setUploadError('');
    // Reset KB categorization fields
    setUploadKbType("RELATED");
    setUploadContentType("");
    setUploadSourceType("PDF_UPLOAD");
    setUploadDescription("");
    setShowUploadModal(false);
  };

  const handleUploadSubmit = async () => {
    if (demoMode) { handleCloseUploadModal(); return; }
    if (!uploadTitle.trim() || !uploadAgentId || !uploadFile) {
      setUploadError("Please fill in the title, assign an agent, and select a file.");
      return;
    }

    // Check for duplicate file name
    const duplicate = apiData.documents.find(
      (doc) => doc.fileName.toLowerCase() === uploadFile.name.toLowerCase()
    );
    if (duplicate) {
      notify.error(
        `A file named "${uploadFile.name}" already exists. Use "Update Existing" to replace it.`
      );
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("title", uploadTitle.trim());
      fd.append("agentId", uploadAgentId);
      fd.append("kbType", uploadKbType);
      if (uploadContentType) fd.append("contentType", uploadContentType);
      fd.append("sourceType", uploadSourceType);
      if (uploadDescription.trim()) fd.append("description", uploadDescription.trim());
      fd.append("file", uploadFile);
      await uploadDocument(fd);
      apiData.mutate();
      handleCloseUploadModal();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDocument = (docId: string) => {
    setUpdateDocId(docId);
    setShowDocSelectorModal(false);
    setDocSearchQuery('');
  };

  // Alphabetically sorted docs for selector modal (demo: mockDocuments, real: current page)
  const sortedDocuments = [...(demoMode ? (mockDocuments as KnowledgeDoc[]) : apiData.documents)]
    .sort((a, b) => a.title.localeCompare(b.title));

  // Filtered docs for selector modal search
  const filteredSelectorDocs = sortedDocuments.filter(doc =>
    doc.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  // Reset to page 1 when filters change
  const handleAgentChange = (value: string) => {
    setAgentFilter(value === "All Agents" ? "" : value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full overflow-y-hidden overflow-x-clip">
      {/* PART 1: Fixed Section - stays at top */}
      <div className="flex-shrink-0 bg-cultivate-bg-main z-10 pt-8 lg:pt-0">
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
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Knowledge Base</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} documents uploaded</p>
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
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Knowledge Base</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} documents uploaded</p>
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
          {/* Agent Filter — demo: hardcoded names, real: from API */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary pointer-events-none" />
            <select
              value={agentFilter || "All Agents"}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-cultivate-text-primary focus:outline-none focus:border-[#85b878] cursor-pointer appearance-none min-w-[200px]"
            >
              <option value="All Agents">All Agents</option>
              {demoMode
                ? demoAgentNames.slice(1).map(name => <option key={name} value={name}>{name}</option>)
                : realAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
              }
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-[78.5%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878]"
            />
          </div>
        </div>

        {/* Document Count */}
        <div className="mb-4 px-1">
          <p className="text-sm text-cultivate-text-secondary">
            {filteredCount} {filteredCount === 1 ? 'document' : 'documents'}
            {(searchQuery || agentFilter) && (
              <span className="text-cultivate-text-tertiary"> &middot; filtered from {totalCount} total</span>
            )}
          </p>
        </div>

        {/* Table Header - Desktop only */}
        <div className="hidden lg:grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3 mr-2 border-b border-cultivate-border-element">
          <span className="text-xs text-cultivate-text-tertiary uppercase tracking-wide">Document</span>
          <span className="text-xs text-cultivate-text-tertiary uppercase tracking-wide">Agent</span>
          <span className="text-xs text-cultivate-text-tertiary uppercase tracking-wide">Chunks</span>
          <span className="text-xs text-cultivate-text-tertiary uppercase tracking-wide">Uploaded</span>
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
              className="bg-cultivate-bg-elevated rounded-lg p-4 hover:bg-cultivate-bg-elevated/70 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate mb-1">{doc.title}</p>
                </div>
                <div className="w-8 h-8 bg-[#3B3B3B] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-cultivate-green-light" />
                </div>
              </div>
              <p className="text-xs text-cultivate-text-secondary truncate">{doc.agentName}</p>
            </div>
          ))}
        </div>

        {/* Desktop: Table Rows */}
        <div className="hidden lg:block">
          {paginatedDocs.map((doc, index) => (
            <div
              key={doc.id}
              className={`grid grid-cols-[1fr_120px_80px_140px_40px] gap-4 px-5 py-3.5 mr-3 hover:bg-cultivate-bg-elevated/30 transition-colors ${
                index === paginatedDocs.length - 1 ? '' : 'border-b border-cultivate-border-element'
              } cursor-pointer`}
            >
              <div onClick={() => handleViewDocument(doc)} className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-[#3B3B3B] rounded-lg flex items-center justify-center flex-shrink-0">
                  {doc.fileType === "PDF" ? (
                    <FileText className="w-4 h-4 text-[#e8c8ab]" />
                  ) : (
                    <File className="w-4 h-4 text-cultivate-teal" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{doc.title}</p>
                  <p className="text-xs text-cultivate-text-tertiary truncate">{doc.fileName}</p>
                </div>
              </div>
              <div onClick={() => handleViewDocument(doc)} className="flex items-center">
                <span className="text-xs text-cultivate-text-secondary truncate">{doc.agentName}</span>
              </div>
              <div onClick={() => handleViewDocument(doc)} className="flex items-center">
                <span className="text-xs text-cultivate-text-secondary">{doc.chunkCount}</span>
              </div>
              <div onClick={() => handleViewDocument(doc)} className="flex items-center">
                <span className="text-xs text-cultivate-text-tertiary">{doc.uploadedAt}</span>
              </div>
              <div className="flex items-center relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                }}
                className="p-1 hover:bg-[#3B3B3B] rounded transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-cultivate-text-primary" />
              </button>

              {openMenuId === doc.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-cultivate-border-subtle py-1 z-50 min-w-[140px]">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDocument(doc);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocument(doc);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartUpdate(doc);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Update
                    </button>
                    <div className="border-t border-cultivate-border-subtle my-1" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalDoc(doc);
                        setOpenMenuId(null);
                      }}
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
        ))}
        </div>

        {paginatedDocs.length === 0 && (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-cultivate-text-tertiary">
              {searchQuery || agentFilter
                ? "No documents match your filters."
                : "No documents uploaded yet."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredCount > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-0 mt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-[#3B3B3B] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-cultivate-text-tertiary">
              {startIndex + 1}–{Math.min(endIndex, filteredCount)}
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
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={handleCloseUploadModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-lg max-h-[90vh] flex flex-col">
              {/* Fixed header */}
              <div className="px-6 pt-5 pb-4 flex-shrink-0">
                <h2 className="text-lg font-medium text-white">Upload Knowledge Base</h2>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 pb-4 thin-scrollbar">
                <div className="space-y-3">
                  {/* Update or New Document */}
                  <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-2.5">
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">What are you doing?</label>
                    <div className="space-y-1.5">
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
                      <label className="block text-sm text-cultivate-text-secondary mb-1.5">Select document to update</label>
                      <button
                        type="button"
                        onClick={() => setShowDocSelectorModal(true)}
                        className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-left hover:border-[#5a7048] transition-colors"
                      >
                        {updateDocId ? (
                          <span className="text-white">{sortedDocuments.find(d => d.id === updateDocId)?.title}</span>
                        ) : (
                          <span className="text-cultivate-text-tertiary">Click to select a document...</span>
                        )}
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Document Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Maize Farming Best Practices"
                      className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#5a7048]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Assign to Agent</label>
                    <div className="relative">
                      <select
                        value={uploadAgentId}
                        onChange={(e) => setUploadAgentId(e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white focus:outline-none focus:border-[#5a7048] appearance-none"
                      >
                        <option value="">Select an agent...</option>
                        {demoMode
                          ? demoAgentNames.slice(1).map(name => <option key={name} value={name}>{name}</option>)
                          : realAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                        }
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary pointer-events-none" />
                    </div>
                  </div>

                  {/* KB Type */}
                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Knowledge Type</label>
                    <CustomSelect
                      variant="field"
                      value={uploadKbType}
                      onChange={setUploadKbType}
                      options={[
                        { value: "CORE", label: "Core — Farmitecture-specific" },
                        { value: "RELATED", label: "Related — Adjacent techniques" },
                        { value: "GENERAL", label: "General — Broad ag knowledge" },
                      ]}
                    />
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Content Type (Optional)</label>
                    <CustomSelect
                      variant="field"
                      value={uploadContentType}
                      onChange={setUploadContentType}
                      options={[
                        { value: "", label: "Not specified" },
                        { value: "FAQ", label: "FAQ" },
                        { value: "MANUAL", label: "Manual" },
                        { value: "TROUBLESHOOTING", label: "Troubleshooting" },
                        { value: "GUIDE", label: "Guide" },
                        { value: "THEORETICAL", label: "Theoretical" },
                        { value: "PRACTICAL", label: "Practical" },
                        { value: "MIXED", label: "Mixed" },
                        { value: "REFERENCE", label: "Reference" },
                      ]}
                    />
                  </div>

                  {/* Source Type */}
                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Source Type</label>
                    <CustomSelect
                      variant="field"
                      value={uploadSourceType}
                      onChange={setUploadSourceType}
                      options={[
                        { value: "INTERNAL_SOP", label: "Internal SOP" },
                        { value: "INTERNAL_FAQ", label: "Internal FAQ" },
                        { value: "INTERNAL_MANUAL", label: "Internal Manual" },
                        { value: "GOV_DOCUMENT", label: "Government Doc" },
                        { value: "EXTENSION_GUIDE", label: "University Extension" },
                        { value: "RESEARCH_PAPER", label: "Research Paper" },
                        { value: "WHITE_PAPER", label: "White Paper" },
                        { value: "BLOG_POST", label: "Blog Post" },
                        { value: "PDF_UPLOAD", label: "PDF Upload" },
                        { value: "OTHER", label: "Other" },
                      ]}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Description (Optional)</label>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="What does this document cover?"
                      rows={3}
                      className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#5a7048] resize-none"
                    />
                  </div>

                  {/* Drop Zone - Compact version */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        setUploadFile(file);
                        // Auto-fill title from filename (remove extension)
                        if (!uploadTitle) {
                          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                          setUploadTitle(nameWithoutExt);
                        }
                      }
                    }}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      dragOver ? 'border-[#85b878] bg-cultivate-green-light/5' : 'border-cultivate-border-element'
                    }`}
                  >
                    {uploadFile ? (
                      <>
                        <Upload className="w-6 h-6 text-cultivate-green-light mx-auto mb-2" />
                        <p className="text-sm text-cultivate-green-light mb-1">{uploadFile.name}</p>
                        <p className="text-xs text-cultivate-text-tertiary">Ready to upload</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-cultivate-text-tertiary mx-auto mb-2" />
                        <p className="text-sm text-cultivate-text-primary mb-1">Drag and drop your file here</p>
                        <p className="text-xs text-cultivate-text-tertiary mb-2">or</p>
                        <label className="inline-block px-3 py-1.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-xs text-cultivate-text-primary hover:border-[#85b878] transition-colors cursor-pointer">
                          Browse Files
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setUploadFile(file);
                              // Auto-fill title from filename (remove extension)
                              if (file && !uploadTitle) {
                                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                setUploadTitle(nameWithoutExt);
                              }
                            }}
                          />
                        </label>
                        <p className="text-xs text-cultivate-text-tertiary mt-2">PDF, DOCX, TXT (max 25MB)</p>
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-400">{uploadError}</p>
                  )}
                </div>
              </div>

              {/* Fixed footer */}
              <div className="px-6 py-3 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                  className="px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? "Uploading..." : "Upload"}
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
            onClick={handleCloseViewPanel}
          />
          {/* Mobile: Centered modal */}
          <div className="lg:hidden fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl pointer-events-auto"
            >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cultivate-border-subtle">
              <div className="flex-1 min-w-0 pr-2">
                {editingTitleDocId === viewPanelDoc.id ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      ref={inlineTitleRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const nextValue = e.currentTarget.textContent || "";
                        renameDraftRef.current = nextValue;
                        setRenameTitle(nextValue);
                      }}
                      onBlur={() => {
                        if (!renaming) void handleRenameConfirm(viewPanelDoc);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleRenameConfirm(viewPanelDoc);
                        }
                        if (e.key === "Escape") handleCancelInlineRename();
                      }}
                      className="min-w-0 flex-1 bg-transparent p-0 m-0 font-sans text-[0.875rem] leading-[1.25rem] font-medium text-white outline-none"
                    >
                      {renameTitle}
                    </div>
                    {renaming ? (
                      <Loader2 className="w-3.5 h-3.5 text-cultivate-text-secondary animate-spin flex-shrink-0" />
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-[0.875rem] leading-[1.25rem] font-medium text-white truncate">{viewPanelDoc.title}</h2>
                      <button
                        type="button"
                        onClick={() => handleStartInlineRename(viewPanelDoc)}
                        className="p-1 hover:bg-cultivate-bg-elevated rounded-md transition-colors flex-shrink-0"
                        aria-label="Edit document name"
                      >
                        <Pencil className="w-3.5 h-3.5 text-cultivate-text-secondary" />
                      </button>
                    </div>
                    <p className="text-xs text-cultivate-text-secondary mt-0.5 truncate">{viewPanelDoc.fileType}</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseViewPanel}
                className="p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-cultivate-text-secondary" />
              </button>
            </div>

            {/* Document Metadata */}
            <div className="flex-1 overflow-y-auto px-4 py-4 thin-scrollbar">
              <div className="space-y-4">
                <div className="bg-cultivate-bg-elevated rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cultivate-text-secondary">Chunks</span>
                    <span className="text-white">{viewPanelDoc.chunkCount} segments</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cultivate-text-secondary">Uploaded</span>
                    <span className="text-white">{viewPanelDoc.uploadedAt}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cultivate-text-secondary">Last updated</span>
                    <span className="text-white">{viewPanelDoc.uploadedAt}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cultivate-text-secondary">Referenced in</span>
                    <span className="text-white">{viewPanelDoc.referencedInChats} chats</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-2">Used by agents</h3>
                  <div className="bg-cultivate-bg-elevated rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-cultivate-green-light/20 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-cultivate-green-light">✓</span>
                      </div>
                      <span className="text-sm text-white">{viewPanelDoc.agentName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-cultivate-border-subtle">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDocument(viewPanelDoc)}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleStartUpdate(viewPanelDoc)}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalDoc(viewPanelDoc)}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:border-red-500/60 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* Desktop: Side panel */}
          <div className="hidden lg:flex fixed top-0 right-0 h-full w-[600px] bg-[#1C1C1C] border-l border-cultivate-border-subtle z-50 flex-col shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cultivate-border-subtle">
              <div>
                {editingTitleDocId === viewPanelDoc.id ? (
                  <div className="flex items-center gap-2 min-w-0 max-w-[420px]">
                    <div
                      ref={inlineTitleRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const nextValue = e.currentTarget.textContent || "";
                        renameDraftRef.current = nextValue;
                        setRenameTitle(nextValue);
                      }}
                      onBlur={() => {
                        if (!renaming) void handleRenameConfirm(viewPanelDoc);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleRenameConfirm(viewPanelDoc);
                        }
                        if (e.key === "Escape") handleCancelInlineRename();
                      }}
                      className="min-w-0 flex-1 bg-transparent p-0 m-0 font-sans text-[0.875rem] leading-[1.25rem] font-medium text-white outline-none"
                    >
                      {renameTitle}
                    </div>
                    {renaming ? (
                      <Loader2 className="w-3.5 h-3.5 text-cultivate-text-secondary animate-spin flex-shrink-0" />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 max-w-[420px]">
                    <h2 className="text-[0.875rem] leading-[1.25rem] font-medium text-white truncate">{viewPanelDoc.title}</h2>
                    <button
                      type="button"
                      onClick={() => handleStartInlineRename(viewPanelDoc)}
                      className="p-1 hover:bg-cultivate-bg-elevated rounded-md transition-colors flex-shrink-0"
                      aria-label="Edit document name"
                    >
                      <Pencil className="w-3.5 h-3.5 text-cultivate-text-secondary" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-cultivate-text-secondary mt-0.5">{viewPanelDoc.fileName} · {viewPanelDoc.fileType}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseViewPanel}
                className="p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-cultivate-text-secondary" />
              </button>
            </div>

            {/* Document Metadata */}
            <div className="px-5 py-4 border-b border-cultivate-border-subtle space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Primary Agent</span>
                <span className="text-white">{viewPanelDoc.agentName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Chunks</span>
                <span className="text-white">{viewPanelDoc.chunkCount} segments</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Uploaded</span>
                <span className="text-white">{viewPanelDoc.uploadedAt}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Last updated</span>
                <span className="text-white">{viewPanelDoc.uploadedAt}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Referenced in chats</span>
                <span className="text-white">{viewPanelDoc.referencedInChats} conversations</span>
              </div>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); /* Open actual file when backend ready */ }}
                className="flex items-center gap-2 text-sm text-cultivate-green-light hover:text-[#9dcf84] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open original document
              </a>
            </div>

            {/* Scrollable Document Preview/Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 thin-scrollbar">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-2">Document Preview</h3>
                  <div className="text-sm text-cultivate-text-primary leading-relaxed space-y-3">
                    <p>This knowledge base document contains comprehensive information about {viewPanelDoc.title.toLowerCase()}. The content has been processed and chunked into {viewPanelDoc.chunkCount} segments for optimal retrieval by the AI agent.</p>
                    <p className="text-cultivate-text-tertiary italic">Full document preview will be available when backend integration is complete. The RAG system will use vector embeddings to retrieve relevant chunks based on farmer queries.</p>
                  </div>
                </div>

                {/* Mock chunk preview */}
                <div className="pt-3 border-t border-cultivate-border-subtle">
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-3">Sample Chunks (Preview)</h3>
                  <div className="space-y-2">
                    {Array.from({ length: Math.min(5, viewPanelDoc.chunkCount) }).map((_, i) => (
                      <div key={i} className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-cultivate-text-tertiary">Chunk {i + 1}</span>
                          <span className="text-xs text-cultivate-text-tertiary">~250 tokens</span>
                        </div>
                        <p className="text-xs text-cultivate-text-secondary leading-relaxed">
                          Sample content from chunk {i + 1} will appear here once the document is processed by the RAG pipeline...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-3 border-t border-cultivate-border-subtle flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadDocument(viewPanelDoc)}
                className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={() => handleStartUpdate(viewPanelDoc)}
                className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#85b878] transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Update
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalDoc(viewPanelDoc)}
                className="flex-1 px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:border-red-500/60 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
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
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Delete Document</h2>
                  <p className="text-sm text-cultivate-text-secondary mt-1">
                    Are you sure you want to delete <span className="text-white font-medium">{deleteModalDoc.title}</span>?
                  </p>
                </div>
              </div>

              <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-3 mb-5">
                <p className="text-xs text-cultivate-text-primary leading-relaxed">
                  This will remove the document and all {deleteModalDoc.chunkCount} associated chunks from the knowledge base. 
                  The <span className="text-white">{deleteModalDoc.agentName}</span> agent will no longer be able to reference this information.
                </p>
                <div className="mt-3 pt-3 border-t border-cultivate-border-element">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cultivate-text-secondary">Referenced in conversations:</span>
                    <span className="text-xs font-medium text-orange-400">{deleteModalDoc.referencedInChats} chats</span>
                  </div>
                  <p className="text-xs text-cultivate-text-tertiary mt-1.5">
                    Note: This document is actively used. Consider creating a new version instead of deleting.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteModalDoc(null)}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deleting ? "Deleting..." : "Delete Document"}
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
            <div className="bg-[#1C1C1C] rounded-xl border border-cultivate-border-subtle w-full max-w-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Select Document to Update</h2>
                <button
                  type="button"
                  onClick={() => setShowDocSelectorModal(false)}
                  className="p-1 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-cultivate-text-secondary" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search docs..."
                  className="w-full pl-9 pr-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#5a7048]"
                />
              </div>

              {/* Documents List */}
              <div className="max-h-[400px] overflow-y-auto thin-scrollbar scrollbar-outset pr-2 space-y-1">
                {filteredSelectorDocs.length === 0 ? (
                  <div className="text-center py-8 text-cultivate-text-tertiary text-sm">
                    No documents found
                  </div>
                ) : (
                  filteredSelectorDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDocument(doc.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        updateDocId === doc.id
                          ? 'bg-[#5a7048] text-white'
                          : 'hover:bg-cultivate-bg-elevated text-cultivate-text-primary'
                      }`}
                    >
                      <div className="font-medium text-sm">{doc.title}</div>
                      <div className="text-xs text-cultivate-text-secondary mt-0.5">
                        {doc.fileName} · {doc.agentName}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-cultivate-border-subtle">
                <button
                  onClick={() => setShowDocSelectorModal(false)}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors"
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
