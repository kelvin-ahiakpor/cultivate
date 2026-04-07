"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Upload, Search, FileText, File, MoreHorizontal, Trash2, Download, Eye, Filter, X, ExternalLink, PanelLeft, Loader2, WifiOff, Plus } from "lucide-react";
import { GlassCircleButton, Dropdown } from "@/components/cultivate-ui";
import { InlineEditableText } from "@/components/inline-editable-text";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useKnowledgeBases, uploadDocument, deleteDocument, renameDocument, assignDocumentToAgent, KnowledgeBaseUploadError, type KnowledgeDoc } from "@/lib/hooks/use-knowledge-bases";
import { useAgents } from "@/lib/hooks/use-agents";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { saveAgroCache, getAgroCache } from "@/lib/offline-storage";
import { DEMO_AGENTS, DEMO_KNOWLEDGE } from "@/lib/demo-data";
import { notify } from "@/lib/toast";

// Mock data for demo mode — sourced from lib/demo-data.ts
const mockDocuments = DEMO_KNOWLEDGE;

// Demo-only hardcoded agent names for filter dropdown and upload form
const demoAgentNames = ["All Agents", "General Farm Advisor", "Pest Management", "Maize Expert"];

export default function KnowledgeView({
  sidebarOpen,
  setSidebarOpen,
  initialAgentFilter,
  demoMode = false,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  initialAgentFilter?: string | null;
  // demoMode: uses local mockDocuments, makes zero API requests. See BACKEND-PROGRESS.md § Phase 5.
  demoMode?: boolean;
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [isStandalone, setIsStandalone] = useState(false);
  const inlineTitleRef = useRef<HTMLDivElement | null>(null);
  const renameDraftRef = useRef("");
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // Chunk preview state
  const [chunks, setChunks] = useState<Array<{ chunkIndex: number; content: string; tokenCount: number; id: string }>>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState("");

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
  const [duplicateDoc, setDuplicateDoc] = useState<Pick<KnowledgeDoc, "id" | "title" | "fileName" | "agentId" | "agentName"> | null>(null);
  const [assigningDuplicate, setAssigningDuplicate] = useState(false);
  const [showAllAssignedAgents, setShowAllAssignedAgents] = useState(false);
  const [showAssignAgentControl, setShowAssignAgentControl] = useState(false);
  const [panelAssignAgentId, setPanelAssignAgentId] = useState("");
  const [assigningPanelAgent, setAssigningPanelAgent] = useState(false);
  const [processingPollUntil, setProcessingPollUntil] = useState<number | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  const isOnline = useOnlineStatus();
  const [offlineDocs, setOfflineDocs] = useState<KnowledgeDoc[]>([]);

  // Fetch documents — disabled in demo mode (null SWR key → zero requests)
  const apiData = useKnowledgeBases(
    searchQuery,
    agentFilter,
    currentPage,
    itemsPerPage,
    demoMode
  );
  const { documents: onlineDocuments, mutate: mutateKnowledgeBases } = apiData;

  // Fetch real agents for filter dropdown and upload form — also disabled in demo
  const { agents: realAgents } = useAgents("", 1, 100, demoMode);

  // Write-through: cache documents when online data arrives
  useEffect(() => {
    if (demoMode || !isOnline || onlineDocuments.length === 0) return;
    saveAgroCache("knowledge_bases", onlineDocuments).catch(() => {});
  }, [onlineDocuments, isOnline, demoMode]);

  // Read from IndexedDB when offline
  useEffect(() => {
    if (demoMode || isOnline) return;
    getAgroCache<KnowledgeDoc[]>("knowledge_bases").then(r => { if (r) setOfflineDocs(r.data); }).catch(() => {});
  }, [isOnline, demoMode]);

  // Demo: filter mockDocuments client-side. Real online: API filtered. Real offline: IndexedDB filtered.
  const sourceData: KnowledgeDoc[] = demoMode
    ? (mockDocuments as KnowledgeDoc[])
    : isOnline ? onlineDocuments : offlineDocs;

  const filteredDocs: KnowledgeDoc[] = demoMode
    ? sourceData.filter((doc) => {
        const matchesAgent = !agentFilter || doc.agentName === agentFilter;
        const matchesSearch =
          !searchQuery ||
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.agentName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesAgent && matchesSearch;
      })
    : isOnline
      ? onlineDocuments
      : offlineDocs.filter((doc) => {
          const matchesAgent = !agentFilter || doc.agentName === agentFilter;
          const matchesSearch =
            !searchQuery ||
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.agentName.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesAgent && matchesSearch;
        });

  const totalCount = demoMode ? mockDocuments.length : isOnline ? apiData.total : offlineDocs.length;
  const filteredCount = demoMode ? filteredDocs.length : isOnline ? apiData.total : filteredDocs.length;
  const totalPages = demoMode
    ? Math.ceil(filteredDocs.length / itemsPerPage)
    : isOnline ? apiData.totalPages : Math.ceil(filteredDocs.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  // Demo/offline: slice client-side. Online: already paginated from server.
  const paginatedDocs = (demoMode || !isOnline) ? filteredDocs.slice(startIndex, endIndex) : filteredDocs;

  const getChunkCountLabel = (doc: KnowledgeDoc) => {
    if (doc.processingState === "FAILED") return "Failed";
    if (doc.processingState === "PROCESSING") return "Processing";
    return String(doc.chunkCount);
  };

  const getChunkCountTone = (doc: KnowledgeDoc) => {
    if (doc.processingState === "FAILED") return "text-red-400";
    if (doc.processingState === "PROCESSING") return "text-cultivate-beige";
    return "text-cultivate-text-secondary";
  };

  const getSegmentSummary = (doc: KnowledgeDoc) => {
    if (doc.processingState === "FAILED") return "Processing failed";
    if (doc.processingState === "PROCESSING") return "Processing document";
    return `${doc.chunkCount} ${doc.chunkCount === 1 ? "segment" : "segments"}`;
  };

  const handleViewDocument = (doc: KnowledgeDoc) => {
    setViewPanelDoc(doc);
  };

  const handleCloseViewPanel = () => {
    setViewPanelDoc(null);
    setEditingTitleDocId(null);
    setRenameTitle("");
    setShowAllAssignedAgents(false);
    setShowAssignAgentControl(false);
    setPanelAssignAgentId("");
  };

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
    if (!initialAgentFilter) return;
    if (demoMode) {
      const demoAgent = DEMO_AGENTS.find((agent) => agent.id === initialAgentFilter);
      setAgentFilter(demoAgent?.name || "");
    } else {
      setAgentFilter(initialAgentFilter);
    }
    setCurrentPage(1);
  }, [initialAgentFilter, demoMode]);

  useEffect(() => {
    if (!viewPanelDoc || demoMode) return;
    const latestDoc = onlineDocuments.find((doc) => doc.id === viewPanelDoc.id);
    if (latestDoc) {
      setViewPanelDoc(latestDoc);
    }
  }, [onlineDocuments, viewPanelDoc, demoMode]);

  useEffect(() => {
    setShowAllAssignedAgents(false);
    setShowAssignAgentControl(false);
    setPanelAssignAgentId("");
  }, [viewPanelDoc?.id]);

  useEffect(() => {
    if (demoMode || !isOnline) return;

    const hasProcessingDocs = onlineDocuments.some((doc) => doc.processingState === "PROCESSING");
    const shouldKeepPolling = Boolean(processingPollUntil && Date.now() < processingPollUntil);

    if (!hasProcessingDocs && !shouldKeepPolling) {
      return;
    }

    const interval = window.setInterval(() => {
      void mutateKnowledgeBases();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [demoMode, isOnline, mutateKnowledgeBases, onlineDocuments, processingPollUntil]);

  useEffect(() => {
    if (demoMode || !isOnline || !processingDocId) return;

    const stopPollingAt = processingPollUntil ?? Date.now() + 120000;

    const pollDocument = async () => {
      try {
        const response = await fetch(`/api/knowledge-bases/${processingDocId}`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        const chunkCount = typeof data?.chunkCount === "number" ? data.chunkCount : 0;

        if (chunkCount !== 0) {
          setProcessingDocId(null);
          setProcessingPollUntil(null);
        }

        await mutateKnowledgeBases();
      } catch {
        // Ignore transient polling failures; the next interval will retry.
      }
    };

    void pollDocument();

    const interval = window.setInterval(() => {
      if (Date.now() >= stopPollingAt) {
        setProcessingDocId(null);
        setProcessingPollUntil(null);
        window.clearInterval(interval);
        return;
      }

      void pollDocument();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [demoMode, isOnline, mutateKnowledgeBases, processingDocId, processingPollUntil]);

  const getPublicDocumentUrl = (doc: KnowledgeDoc) => doc.fileUrl;

  const getDownloadUrl = (doc: KnowledgeDoc) => {
    const url = new URL(getPublicDocumentUrl(doc));
    url.searchParams.set("download", doc.fileName);
    return url.toString();
  };

  const openDocumentInline = (doc: KnowledgeDoc) => {
    const url = getPublicDocumentUrl(doc);

    if (isStandalone) {
      window.location.assign(url);
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDocument = (doc: KnowledgeDoc) => {
    const link = document.createElement("a");
    link.href = getDownloadUrl(doc);
    link.download = doc.fileName;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalDoc) return;
    if (demoMode) { setDeleteModalDoc(null); return; }
    setDeleting(true);
    try {
      await deleteDocument(deleteModalDoc.id);
      mutateKnowledgeBases();
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
      await mutateKnowledgeBases();
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

  useEffect(() => {
    if (!viewPanelDoc || demoMode) {
      setChunks([]);
      setLoadingChunks(false);
      setChunksError("");
      return;
    }

    let cancelled = false;
    setLoadingChunks(true);
    setChunksError("");

    fetch(`/api/knowledge-bases/${viewPanelDoc.id}/chunks`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error("Document processing failed");
        }
        if (!res.ok) {
          throw new Error(data.error || "Failed to load chunks");
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setChunks(data.chunks || []);
        if (data.processing) {
          setChunksError("Document is still processing. Chunks will appear automatically when ready.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setChunks([]);
        setChunksError(err instanceof Error ? err.message : "Failed to load chunks");
      })
      .finally(() => {
        if (!cancelled) setLoadingChunks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewPanelDoc, demoMode]);

  const handleStartUpdate = (doc: KnowledgeDoc) => {
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
    setDuplicateDoc(null);
    setAssigningDuplicate(false);
    if (uploadFileInputRef.current) {
      uploadFileInputRef.current.value = "";
    }
  };

  const handleSelectUploadFile = (file: File | null) => {
    setUploadFile(file);
    if (file && !uploadTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setUploadTitle(nameWithoutExt);
    }
    if (uploadFileInputRef.current) {
      uploadFileInputRef.current.value = "";
    }
  };

  const handleAssignDuplicateDocument = async () => {
    if (!duplicateDoc || !uploadAgentId) {
      notify.error("Select an agent before assigning this document.");
      return;
    }

    setAssigningDuplicate(true);
    try {
      const result = await assignDocumentToAgent(duplicateDoc.id, uploadAgentId);
      await mutateKnowledgeBases();
      notify.success(
        typeof result?.message === "string"
          ? result.message
          : `Assigned "${duplicateDoc.title}" to the selected agent.`
      );
      handleCloseUploadModal();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigningDuplicate(false);
    }
  };

  const handleAssignPanelDocument = async () => {
    if (!viewPanelDoc || !panelAssignAgentId) {
      notify.error("Select an agent before assigning this document.");
      return;
    }

    if (demoMode) {
      notify.success("Assignment is disabled in demo mode.");
      return;
    }

    setAssigningPanelAgent(true);
    try {
      const result = await assignDocumentToAgent(viewPanelDoc.id, panelAssignAgentId);
      await mutateKnowledgeBases();
      notify.success(
        typeof result?.message === "string"
          ? result.message
          : `Assigned "${viewPanelDoc.title}" to the selected agent.`
      );
      setShowAssignAgentControl(false);
      setPanelAssignAgentId("");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigningPanelAgent(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (demoMode) { handleCloseUploadModal(); return; }
    if (!uploadTitle.trim() || !uploadAgentId || !uploadFile) {
      setUploadError("Please fill in the title, assign an agent, and select a file.");
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
      const result = await uploadDocument(fd);
      setProcessingPollUntil(Date.now() + 120000);
      if (typeof result?.id === "string") {
        setProcessingDocId(result.id);
      }
      void mutateKnowledgeBases();
      notify.success("Document uploaded. Processing has started in the background.");
      handleCloseUploadModal();
    } catch (e) {
      if (e instanceof KnowledgeBaseUploadError && e.code === "DUPLICATE_DOCUMENT" && e.document) {
        setDuplicateDoc(e.document);
      } else {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      }
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
  const sortedDocuments = [...(demoMode ? (mockDocuments as KnowledgeDoc[]) : onlineDocuments)]
    .sort((a, b) => a.title.localeCompare(b.title));

  // Filtered docs for selector modal search
  const filteredSelectorDocs = sortedDocuments.filter(doc =>
    doc.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const visibleAssignedAgents = viewPanelDoc
    ? (showAllAssignedAgents ? viewPanelDoc.agents : viewPanelDoc.agents.slice(0, 2))
    : [];

  const agentFilterOptions = demoMode
    ? [{ value: "", label: "All Agents" }, ...demoAgentNames.slice(1).map((name) => ({ value: name, label: name }))]
    : [{ value: "", label: "All Agents" }, ...realAgents.map((agent) => ({ value: agent.id, label: agent.name }))];

  const uploadAgentOptions = demoMode
    ? demoAgentNames.slice(1).map((name) => ({ value: name, label: name }))
    : realAgents.map((agent) => ({ value: agent.id, label: agent.name }));

  const assignableAgentOptions = viewPanelDoc
    ? (demoMode
      ? demoAgentNames
          .slice(1)
          .filter((name) => !viewPanelDoc.agents.some((agent) => agent.name === name))
          .map((name) => ({ value: name, label: name }))
      : realAgents
          .filter((agent) => !viewPanelDoc.agents.some((assignedAgent) => assignedAgent.id === agent.id))
          .map((agent) => ({ value: agent.id, label: agent.name })))
    : [];

  // Reset to page 1 when filters change
  const handleAgentChange = (value: string) => {
    setAgentFilter(value);
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
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-serif text-cultivate-text-primary">Knowledge Base</h1>
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </div>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} documents uploaded</p>
          </div>
          <div className="absolute right-0">
            {isOnline && (
              <button
                onClick={handleOpenUploadModal}
                className="w-11 h-11 bg-cultivate-button-primary hover:bg-cultivate-button-primary-hover rounded-full flex items-center justify-center transition-colors"
                aria-label="Upload document"
              >
                <Upload className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif text-cultivate-text-primary">Knowledge Base</h1>
              {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary" />}
            </div>
            <p className="text-sm text-cultivate-text-secondary mt-1">{totalCount} documents uploaded</p>
          </div>
          {isOnline && (
            <button
              onClick={handleOpenUploadModal}
              className="flex items-center gap-2 px-4 py-2 bg-cultivate-button-primary text-white rounded-lg hover:bg-cultivate-button-primary-hover transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          )}
        </div>

        {/* Filter and Search */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Agent Filter — demo: hardcoded names, real: from API */}
          <div className="relative w-full lg:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary pointer-events-none" />
            <Dropdown
              variant="field"
              value={agentFilter}
              onChange={handleAgentChange}
              options={agentFilterOptions}
              className="w-full min-w-0 pl-10 bg-cultivate-bg-elevated lg:min-w-[200px]"
            />
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm standalone:text-base lg:text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-green-light"
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
        <div className="lg:hidden space-y-3 px-1.5">
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
                <div className="w-8 h-8 bg-cultivate-border-element rounded-lg flex items-center justify-center flex-shrink-0">
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
                <div className="w-8 h-8 bg-cultivate-border-element rounded-lg flex items-center justify-center flex-shrink-0">
                  {doc.fileType === "PDF" ? (
                    <FileText className="w-4 h-4 text-cultivate-beige" />
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
                <span className={`text-xs ${getChunkCountTone(doc)}`}>{getChunkCountLabel(doc)}</span>
              </div>
              <div onClick={() => handleViewDocument(doc)} className="flex items-center">
                <span className="text-xs text-cultivate-text-tertiary">{doc.uploadedAt}</span>
              </div>
              <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    disabled={!isOnline}
                    className="p-1 hover:bg-cultivate-border-element rounded transition-colors disabled:opacity-30"
                  >
                    <MoreHorizontal className="w-4 h-4 text-cultivate-text-primary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl shadow-xl py-1.5 min-w-[160px]">
                  <DropdownMenuItem className="px-1.5 py-0 focus:bg-transparent" onSelect={() => handleViewDocument(doc)}>
                    <div className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded-lg">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="px-1.5 py-0 focus:bg-transparent" onSelect={() => handleDownloadDocument(doc)}>
                    <div className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded-lg">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="px-1.5 py-0 focus:bg-transparent" onSelect={() => handleStartUpdate(doc)}>
                    <div className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded-lg">
                      <FileText className="w-3.5 h-3.5" />
                      Update
                    </div>
                  </DropdownMenuItem>
                  <div className="border-t border-cultivate-border-subtle my-1 mx-1.5" />
                  <DropdownMenuItem className="px-1.5 py-0 focus:bg-transparent" onSelect={() => setDeleteModalDoc(doc)}>
                    <div className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-cultivate-bg-hover hover:text-red-300 flex items-center gap-2 transition-colors rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-cultivate-border-element hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-cultivate-text-tertiary">
              {startIndex + 1}–{Math.min(endIndex, filteredCount)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-cultivate-text-secondary bg-cultivate-bg-elevated border border-cultivate-border-element rounded-md hover:bg-cultivate-border-element hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) handleCloseUploadModal(); }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-0 w-full max-w-lg max-h-[90vh] flex flex-col gap-0">
          <DialogTitle className="sr-only">Upload Knowledge Base</DialogTitle>
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
                          className="accent-cultivate-button-primary"
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
                          className="accent-cultivate-button-primary"
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
                        className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-left hover:border-cultivate-button-primary transition-colors"
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
                      className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-button-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Assign to Agent</label>
                    <Dropdown
                      variant="field"
                      value={uploadAgentId}
                      onChange={setUploadAgentId}
                      options={uploadAgentOptions}
                      placeholder="Select an agent..."
                      className="bg-cultivate-bg-elevated"
                    />
                  </div>

                  {/* KB Type */}
                  <div>
                    <label className="block text-sm text-cultivate-text-secondary mb-1.5">Knowledge Type</label>
                    <Dropdown
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
                    <Dropdown
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
                    <Dropdown
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
                      className="w-full px-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-button-primary resize-none"
                    />
                  </div>

                  {/* Drop Zone - Compact version */}
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        handleSelectUploadFile(file);
                      }
                    }}
                    onClick={() => uploadFileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        uploadFileInputRef.current?.click();
                      }
                    }}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      dragOver ? 'border-cultivate-green-light bg-cultivate-green-light/5' : 'border-cultivate-border-element'
                    }`}
                  >
                    <input
                      ref={uploadFileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleSelectUploadFile(file);
                      }}
                    />
                    {uploadFile ? (
                      <>
                        <Upload className="w-6 h-6 text-cultivate-green-light mx-auto mb-2" />
                        <p className="text-sm text-cultivate-green-light mb-1">{uploadFile.name}</p>
                        <p className="text-xs text-cultivate-text-tertiary">Click anywhere here to replace this file</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-cultivate-text-tertiary mx-auto mb-2" />
                        <p className="text-sm text-cultivate-text-primary mb-1">Drag and drop your file here</p>
                        <p className="text-xs text-cultivate-text-tertiary mb-2">or</p>
                        <span className="inline-block px-3 py-1.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-xs text-cultivate-text-primary hover:border-cultivate-green-light transition-colors cursor-pointer">
                          Browse Files
                        </span>
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
                  className="px-4 py-2 bg-cultivate-button-primary text-white rounded-lg hover:bg-cultivate-button-primary-hover transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
        </DialogContent>
      </Dialog>

      {showUploadModal && duplicateDoc && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setDuplicateDoc(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-cultivate-bg-sidebar rounded-xl border border-cultivate-border-subtle w-full max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-cultivate-beige/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-cultivate-beige" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Document Already Exists</h2>
                  <p className="text-sm text-cultivate-text-secondary mt-1">
                    <span className="text-white font-medium">{duplicateDoc.fileName}</span> is already in this knowledge base.
                  </p>
                </div>
              </div>

              <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-3 space-y-2 mb-5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-cultivate-text-secondary">Existing document</span>
                  <span className="text-white text-right">{duplicateDoc.title}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-cultivate-text-secondary">Current primary agent</span>
                  <span className="text-white text-right">{duplicateDoc.agentName}</span>
                </div>
                <p className="text-xs text-cultivate-text-tertiary pt-1">
                  You can assign this existing knowledge base to another agent, or switch to “Updating an existing document” if you meant to replace the file.
                </p>
              </div>

              {!uploadAgentId && (
                <p className="text-sm text-cultivate-beige mb-4">Pick an agent in the upload form first if you want to assign this existing document.</p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDuplicateDoc(null)}
                  disabled={assigningDuplicate}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleAssignDuplicateDocument}
                  disabled={assigningDuplicate || !uploadAgentId}
                  className="px-4 py-2 bg-cultivate-button-primary text-white rounded-lg hover:bg-cultivate-button-primary-hover transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {assigningDuplicate && <Loader2 className="w-4 h-4 animate-spin" />}
                  {assigningDuplicate ? "Assigning..." : "Assign to Agent"}
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
              className="bg-cultivate-bg-sidebar rounded-xl border border-cultivate-border-subtle w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl pointer-events-auto"
            >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cultivate-border-subtle">
              <div className="flex-1 min-w-0 pr-2">
                <InlineEditableText
                  value={renameTitle || viewPanelDoc.title}
                  editing={editingTitleDocId === viewPanelDoc.id}
                  isSaving={renaming}
                  onStartEdit={() => handleStartInlineRename(viewPanelDoc)}
                  onChange={(nextValue) => {
                    renameDraftRef.current = nextValue;
                    setRenameTitle(nextValue);
                  }}
                  onConfirm={() => handleRenameConfirm(viewPanelDoc)}
                  onCancel={handleCancelInlineRename}
                  buttonAriaLabel="Edit document name"
                  inputRef={inlineTitleRef}
                  displayClassName="text-[0.875rem] leading-[1.25rem] font-medium text-white truncate"
                  editorClassName="min-w-0 bg-transparent p-0 m-0 font-sans text-[0.875rem] leading-[1.25rem] font-medium text-white outline-none"
                />
                <p className="text-xs text-cultivate-text-secondary mt-0.5 truncate">{viewPanelDoc.fileType}</p>
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
                    <span className={viewPanelDoc.processingState === "FAILED" ? "text-red-400" : "text-white"}>
                      {getSegmentSummary(viewPanelDoc)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cultivate-text-secondary">Uploaded by</span>
                    <span className="text-white">{viewPanelDoc.agronomistName}</span>
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
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide">Used by agents</h3>
                      {assignableAgentOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAssignAgentControl((current) => !current)}
                          className="inline-flex items-center gap-1 rounded-md border border-cultivate-border-subtle px-2 py-1 text-[11px] text-cultivate-text-secondary hover:text-white hover:border-cultivate-green-light transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add agent
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cultivate-text-tertiary">
                        {viewPanelDoc.agents.length} {viewPanelDoc.agents.length === 1 ? "agent" : "agents"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-cultivate-bg-elevated rounded-lg p-3 space-y-2">
                    {showAssignAgentControl && assignableAgentOptions.length > 0 && (
                      <div className="rounded-lg border border-cultivate-border-subtle p-3 space-y-2">
                        <Dropdown
                          variant="field"
                          value={panelAssignAgentId}
                          onChange={setPanelAssignAgentId}
                          options={assignableAgentOptions}
                          placeholder="Select an agent..."
                          className="bg-cultivate-bg-main"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void handleAssignPanelDocument()}
                            disabled={!panelAssignAgentId || assigningPanelAgent}
                            className="inline-flex items-center gap-2 rounded-lg bg-cultivate-button-primary px-3 py-2 text-xs text-white hover:bg-cultivate-button-primary-hover disabled:opacity-40 transition-colors"
                          >
                            {assigningPanelAgent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {assigningPanelAgent ? "Assigning..." : "Assign agent"}
                          </button>
                        </div>
                      </div>
                    )}
                    {visibleAssignedAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${agent.isPrimary ? "bg-cultivate-green-light/20" : "bg-cultivate-bg-hover"}`}>
                            <span className={`text-[10px] ${agent.isPrimary ? "text-cultivate-green-light" : "text-cultivate-text-secondary"}`}>
                              {agent.isPrimary ? "P" : "A"}
                            </span>
                          </div>
                          <span className="text-sm text-white truncate">{agent.name}</span>
                        </div>
                        {agent.isPrimary && (
                          <span className="text-[10px] uppercase tracking-wide text-cultivate-green-light flex-shrink-0">Primary</span>
                        )}
                      </div>
                    ))}
                    {viewPanelDoc.agents.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllAssignedAgents((current) => !current)}
                        className="text-xs text-cultivate-green-light hover:text-cultivate-green-pale transition-colors"
                      >
                        {showAllAssignedAgents
                          ? "Show fewer agents"
                          : `Show ${viewPanelDoc.agents.length - 2} more ${viewPanelDoc.agents.length - 2 === 1 ? "agent" : "agents"}`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-3">Document Chunks</h3>
                  {loadingChunks ? (
                    <div className="flex items-center gap-2 text-sm text-cultivate-text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading chunk previews...
                    </div>
                  ) : chunksError ? (
                    <div className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                      <p className={`text-sm ${chunksError.includes("still processing") ? "text-cultivate-beige" : "text-red-400"}`}>{chunksError}</p>
                    </div>
                  ) : chunks.length === 0 ? (
                    <div className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                      <p className="text-sm text-cultivate-text-secondary">
                        No chunk previews are available for this document yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chunks.map((chunk) => (
                        <div key={chunk.id} className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                          <div className="flex items-center justify-between mb-1.5 gap-3">
                            <span className="text-xs text-cultivate-text-tertiary">Chunk {chunk.chunkIndex + 1}</span>
                            <span className="text-xs text-cultivate-text-tertiary">~{chunk.tokenCount} tokens</span>
                          </div>
                          <p className="text-xs text-cultivate-text-secondary leading-relaxed whitespace-pre-wrap">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-cultivate-border-subtle">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDocument(viewPanelDoc)}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-green-light transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleStartUpdate(viewPanelDoc)}
                  className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-green-light transition-colors flex items-center justify-center gap-2"
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
          <div className="hidden lg:flex fixed top-0 right-0 h-full w-[600px] bg-cultivate-bg-sidebar border-l border-cultivate-border-subtle z-50 flex-col shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cultivate-border-subtle">
              <div>
                <InlineEditableText
                  value={renameTitle || viewPanelDoc.title}
                  editing={editingTitleDocId === viewPanelDoc.id}
                  isSaving={renaming}
                  onStartEdit={() => handleStartInlineRename(viewPanelDoc)}
                  onChange={(nextValue) => {
                    renameDraftRef.current = nextValue;
                    setRenameTitle(nextValue);
                  }}
                  onConfirm={() => handleRenameConfirm(viewPanelDoc)}
                  onCancel={handleCancelInlineRename}
                  buttonAriaLabel="Edit document name"
                  inputRef={inlineTitleRef}
                  className="flex items-center gap-2 min-w-0 max-w-[420px]"
                  displayClassName="text-[0.875rem] leading-[1.25rem] font-medium text-white truncate"
                  editorClassName="min-w-0 bg-transparent p-0 m-0 font-sans text-[0.875rem] leading-[1.25rem] font-medium text-white outline-none"
                />
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
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-cultivate-text-secondary">Assigned agents</span>
                    {assignableAgentOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAssignAgentControl((current) => !current)}
                        className="inline-flex items-center gap-1 rounded-md border border-cultivate-border-subtle px-2 py-1 text-[11px] text-cultivate-text-secondary hover:text-white hover:border-cultivate-green-light transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add agent
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{viewPanelDoc.agents.length}</span>
                  </div>
                </div>
                {showAssignAgentControl && assignableAgentOptions.length > 0 && (
                  <div className="rounded-lg border border-cultivate-border-subtle p-3 space-y-2">
                    <Dropdown
                      variant="field"
                      value={panelAssignAgentId}
                      onChange={setPanelAssignAgentId}
                      options={assignableAgentOptions}
                      placeholder="Select an agent..."
                      className="bg-cultivate-bg-main"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleAssignPanelDocument()}
                        disabled={!panelAssignAgentId || assigningPanelAgent}
                        className="inline-flex items-center gap-2 rounded-lg bg-cultivate-button-primary px-3 py-2 text-xs text-white hover:bg-cultivate-button-primary-hover disabled:opacity-40 transition-colors"
                      >
                        {assigningPanelAgent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {assigningPanelAgent ? "Assigning..." : "Assign agent"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {visibleAssignedAgents.map((agent) => (
                    <span
                      key={agent.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${agent.isPrimary ? "bg-cultivate-green-light/15 text-cultivate-green-light border border-cultivate-green-light/20" : "bg-cultivate-bg-hover text-cultivate-text-primary border border-cultivate-border-subtle"}`}
                    >
                      {agent.name}
                      {agent.isPrimary ? <span className="text-[10px] uppercase tracking-wide">Primary</span> : null}
                    </span>
                  ))}
                  {viewPanelDoc.agents.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAssignedAgents((current) => !current)}
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs border border-cultivate-border-subtle text-cultivate-text-secondary hover:text-white hover:border-cultivate-green-light transition-colors"
                    >
                      {showAllAssignedAgents
                        ? "Show less"
                        : `+${viewPanelDoc.agents.length - 2} more`}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Chunks</span>
                <span className={viewPanelDoc.processingState === "FAILED" ? "text-red-400" : "text-white"}>
                  {getSegmentSummary(viewPanelDoc)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Uploaded by</span>
                <span className="text-white">{viewPanelDoc.agronomistName}</span>
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
              <button
                type="button"
                onClick={() => openDocumentInline(viewPanelDoc)}
                className="flex items-center gap-2 text-sm text-cultivate-green-light hover:text-cultivate-green-pale transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open original document
              </button>
            </div>

            {/* Scrollable Document Preview/Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 thin-scrollbar">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-2">Document Preview</h3>
                  <div className="text-sm text-cultivate-text-primary leading-relaxed space-y-3">
                    <p>
                      {viewPanelDoc.processingState === "FAILED"
                        ? `This knowledge base document could not be processed into searchable chunks. Re-upload it or inspect the source file format.`
                        : viewPanelDoc.processingState === "PROCESSING"
                          ? `This knowledge base document is still being processed into searchable chunks for AI retrieval.`
                          : `This knowledge base document contains comprehensive information about ${viewPanelDoc.title.toLowerCase()}. The content has been processed and chunked into ${viewPanelDoc.chunkCount} segments for optimal retrieval by the AI agent.`}
                    </p>
                    <p className="text-cultivate-text-tertiary italic">Full document preview will be available when backend integration is complete. The RAG system will use vector embeddings to retrieve relevant chunks based on farmer queries.</p>
                  </div>
                </div>

                {/* Real chunk preview */}
                <div className="pt-3 border-t border-cultivate-border-subtle">
                  <h3 className="text-xs font-medium text-cultivate-text-secondary uppercase tracking-wide mb-3">Document Chunks</h3>
                  {loadingChunks ? (
                    <div className="flex items-center gap-2 text-sm text-cultivate-text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading chunk previews...
                    </div>
                  ) : chunksError ? (
                    <div className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                      <p className={`text-sm ${chunksError.includes("still processing") ? "text-cultivate-beige" : "text-red-400"}`}>{chunksError}</p>
                    </div>
                  ) : chunks.length === 0 ? (
                    <div className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                      <p className="text-sm text-cultivate-text-secondary">
                        No chunk previews are available for this document yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chunks.map((chunk) => (
                        <div key={chunk.id} className="p-3 bg-cultivate-bg-hover border border-cultivate-border-subtle rounded-lg">
                          <div className="flex items-center justify-between mb-1.5 gap-3">
                            <span className="text-xs text-cultivate-text-tertiary">Chunk {chunk.chunkIndex + 1}</span>
                            <span className="text-xs text-cultivate-text-tertiary">~{chunk.tokenCount} tokens</span>
                          </div>
                          <p className="text-xs text-cultivate-text-secondary leading-relaxed whitespace-pre-wrap">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-3 border-t border-cultivate-border-subtle flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadDocument(viewPanelDoc)}
                className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-green-light transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={() => handleStartUpdate(viewPanelDoc)}
                className="flex-1 px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-green-light transition-colors flex items-center justify-center gap-2"
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
      <Dialog open={!!deleteModalDoc} onOpenChange={(open) => { if (!open) setDeleteModalDoc(null); }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-full max-w-md">
          <DialogTitle className="sr-only">Delete Document</DialogTitle>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Delete Document</h2>
                  <p className="text-sm text-cultivate-text-secondary mt-1">
                    Are you sure you want to delete <span className="text-white font-medium">{deleteModalDoc?.title}</span>?
                  </p>
                </div>
              </div>

              <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-3 mb-5">
                <p className="text-xs text-cultivate-text-primary leading-relaxed">
                  This will remove the document and all {deleteModalDoc?.chunkCount} associated chunks from the knowledge base.
                  The <span className="text-white">{deleteModalDoc?.agentName}</span> agent will no longer be able to reference this information.
                </p>
                <div className="mt-3 pt-3 border-t border-cultivate-border-element">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cultivate-text-secondary">Referenced in conversations:</span>
                    <span className="text-xs font-medium text-orange-400">{deleteModalDoc?.referencedInChats} chats</span>
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
        </DialogContent>
      </Dialog>

      {/* Document Selector Modal */}
      <Dialog open={showDocSelectorModal} onOpenChange={(open) => { if (!open) setShowDocSelectorModal(false); }}>
        <DialogContent showCloseButton={false} className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-full max-w-xl">
          <DialogTitle className="sr-only">Select Document to Update</DialogTitle>
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
                  className="w-full pl-9 pr-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-button-primary"
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
                          ? 'bg-cultivate-button-primary text-white'
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
