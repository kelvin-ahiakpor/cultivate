"use client";

import { useState } from "react";
import { Layers, Search, Package, Calendar, CheckCircle, Clock, ExternalLink, ChevronLeft, Plus, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GlassCircleButton, Dropdown, SystemListSkeleton } from "@/components/cultivate-ui";
import { useSystems, type FarmerSystemItem } from "@/lib/hooks/use-systems";
import { DEMO_SYSTEMS } from "@/lib/demo-data";
import { notify } from "@/lib/toast";

interface System {
  id: string;
  name: string;
  type: string;
  purchaseDate: string;
  status: "ACTIVE" | "PENDING_SETUP" | "INACTIVE";
  description: string;
  specifications?: {
    size?: string;
    capacity?: string;
    material?: string;
  } | null;
  installationDate?: string | null;
  warrantyUntil?: string | null;
}

// Mock data — sourced from lib/demo-data.ts, used only in demo mode
const mockSystems: System[] = DEMO_SYSTEMS as System[];

function toSystem(item: FarmerSystemItem): System {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    description: item.description,
    status: item.status,
    purchaseDate: item.purchaseDate,
    installationDate: item.installationDate,
    warrantyUntil: item.warrantyUntil,
    specifications: item.specifications as System["specifications"],
  };
}

interface SystemsViewProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (value: boolean) => void;
  onBackToChat?: () => void;
  demoMode?: boolean;
}

export default function SystemsView({ sidebarOpen = true, setSidebarOpen, onBackToChat, demoMode = false }: SystemsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Add system modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"purchaseDate" | "name" | "status" | "warranty">("purchaseDate");

  const sortOptions: { value: typeof sortBy; label: string }[] = [
    { value: "purchaseDate", label: "Purchase date" },
    { value: "name", label: "Name" },
    { value: "status", label: "Status" },
    { value: "warranty", label: "Warranty" },
  ];
  const [form, setForm] = useState({
    name: "",
    type: "",
    description: "",
    purchaseDate: "",
    installationDate: "",
    warrantyUntil: "",
  });

  const resetForm = () => setForm({ name: "", type: "", description: "", purchaseDate: "", installationDate: "", warrantyUntil: "" });

  const handleAddSystem = async () => {
    if (!form.name.trim() || !form.type.trim() || !form.description.trim() || !form.purchaseDate) {
      notify.error("Please fill in all required fields");
      return;
    }

    if (demoMode) {
      notify.success("System added! (demo mode)");
      setShowAddModal(false);
      resetForm();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type.trim(),
          description: form.description.trim(),
          purchaseDate: form.purchaseDate,
          installationDate: form.installationDate || undefined,
          warrantyUntil: form.warrantyUntil || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add system");
      }
      notify.success("System added successfully");
      setShowAddModal(false);
      resetForm();
      apiSystems.mutate();
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "Failed to add system");
    } finally {
      setIsSubmitting(false);
    }
  };

  const apiSystems = useSystems(demoMode);
  const allSystems: System[] = demoMode ? mockSystems : apiSystems.systems.map(toSystem);

  const statusOrder = { ACTIVE: 0, PENDING_SETUP: 1, INACTIVE: 2 };
  const filteredSystems = allSystems
    .filter(system => {
      const matchesStatus = selectedStatus === "all" || system.status === selectedStatus;
      const matchesSearch = system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        system.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        system.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "status") return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (sortBy === "warranty") {
        if (!a.warrantyUntil) return 1;
        if (!b.warrantyUntil) return -1;
        return new Date(a.warrantyUntil).getTime() - new Date(b.warrantyUntil).getTime();
      }
      // default: purchaseDate newest first
      return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "text-cultivate-green-light";
      case "PENDING_SETUP": return "text-orange-400";
      case "INACTIVE": return "text-cultivate-text-tertiary";
      default: return "text-cultivate-text-secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE": return "Active";
      case "PENDING_SETUP": return "Pending Setup";
      case "INACTIVE": return "Inactive";
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-cultivate-bg-main z-10 pb-4 pt-8 lg:pt-0">
        {/* Mobile header — chats-style glass back button + centered title */}
        <div className="relative flex items-center justify-center mb-6 lg:hidden">
          <div className="absolute left-0">
            {onBackToChat ? (
              <GlassCircleButton onClick={onBackToChat} aria-label="Back">
                <ChevronLeft className="w-5 h-5 text-white" />
              </GlassCircleButton>
            ) : !sidebarOpen && setSidebarOpen ? (
              <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <ChevronLeft className="w-5 h-5 text-white" />
              </GlassCircleButton>
            ) : null}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Systems</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{allSystems.length} Farmitecture products installed</p>
          </div>
          <div className="absolute right-0">
            <GlassCircleButton onClick={() => setShowAddModal(true)} aria-label="Add system">
              <Plus className="w-5 h-5 text-white" />
            </GlassCircleButton>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-cultivate-text-primary">Systems</h1>
            <p className="text-sm text-cultivate-text-secondary mt-1">{allSystems.length} Farmitecture products installed</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cultivate-button-primary text-white text-sm rounded-lg hover:bg-cultivate-button-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add System
          </button>
        </div>

        {/* Search and Filter */}
        {/* Row 1: full-width search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cultivate-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search systems..."
            className="w-full pl-9 pr-3 py-2 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm standalone:text-base lg:text-sm text-white placeholder-cultivate-text-tertiary focus:outline-none focus:border-cultivate-button-primary"
          />
        </div>
        {/* Row 2: filter pills left, sort by right */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["all", "ACTIVE", "PENDING_SETUP"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm standalone:text-base lg:text-sm transition-colors ${
                  selectedStatus === s
                    ? "bg-cultivate-border-element text-cultivate-text-primary"
                    : "text-cultivate-text-secondary hover:text-cultivate-text-primary hover:bg-cultivate-bg-elevated"
                }`}
              >
                {s === "all" ? "All" : s === "ACTIVE" ? "Active" : "Pending"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-cultivate-text-secondary">Sort by</span>
            <Dropdown
              variant="pill"
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              options={sortOptions}
            />
          </div>
        </div>
      </div>

      {/* PART 2: Scrollable Section */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto thin-scrollbar scrollbar-outset">
          {!demoMode && apiSystems.isLoading ? (
            <SystemListSkeleton count={3} />
          ) : filteredSystems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Layers className="w-16 h-16 text-cultivate-border-element mb-4" />
              <p className="text-cultivate-text-secondary text-sm">No systems found</p>
              <p className="text-cultivate-text-tertiary text-xs mt-1">Contact Farmitecture to purchase farming systems</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-4">
              {/* Card width is inherited from chat-client.tsx's content panel (no max-width set there).
                  To narrow: (a) wrap this grid in max-w-2xl mx-auto, or
                  (b) constrain the systems panel in chat-client.tsx.
                  Sizes: max-w-lg=512px, max-w-xl=576px, max-w-2xl=672px */}
              {filteredSystems.map((system) => (
                <div
                  key={system.id}
                  className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-5 hover:border-cultivate-border-element transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-cultivate-bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-cultivate-button-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-white mb-1">{system.name}</h3>
                        <p className="text-sm text-cultivate-text-secondary">{system.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getStatusColor(system.status)}`}>
                        {getStatusLabel(system.status)}
                      </span>
                      {system.status === "ACTIVE" && <CheckCircle className="w-4 h-4 text-cultivate-green-light" />}
                      {system.status === "PENDING_SETUP" && <Clock className="w-4 h-4 text-orange-400" />}
                    </div>
                  </div>

                  <p className="text-sm text-cultivate-text-primary mb-4">{system.description}</p>

                  {/* Specifications */}
                  {system.specifications && (
                    <div className="bg-cultivate-bg-elevated rounded-lg p-3 mb-4">
                      <p className="text-xs text-cultivate-text-secondary uppercase tracking-wide mb-2">Specifications</p>
                      <div className="grid grid-cols-2 gap-2">
                        {system.specifications.size && (
                          <div>
                            <p className="text-xs text-cultivate-text-tertiary">Size</p>
                            <p className="text-sm text-white">{system.specifications.size}</p>
                          </div>
                        )}
                        {system.specifications.capacity && (
                          <div>
                            <p className="text-xs text-cultivate-text-tertiary">Capacity</p>
                            <p className="text-sm text-white">{system.specifications.capacity}</p>
                          </div>
                        )}
                        {system.specifications.material && (
                          <div className="col-span-2">
                            <p className="text-xs text-cultivate-text-tertiary">Material</p>
                            <p className="text-sm text-white">{system.specifications.material}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-cultivate-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Purchased: {new Date(system.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    {system.installationDate && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Installed: {new Date(system.installationDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {system.warrantyUntil && (
                      <div className="flex items-center gap-1.5">
                        <span>Warranty until: {new Date(system.warrantyUntil).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="mt-4 pt-4 border-t border-cultivate-border-subtle flex items-center justify-between">
                    <a
                      href="#"
                      className="text-sm text-cultivate-button-primary hover:text-cultivate-green-light transition-colors flex items-center gap-1"
                    >
                      View manual
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {system.status === "PENDING_SETUP" && (
                      <button className="px-3 py-1.5 bg-cultivate-button-primary text-white rounded-lg hover:bg-cultivate-button-primary-hover transition-colors text-sm">
                        Request Setup
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-8 bg-gradient-to-t from-cultivate-bg-main/70 via-cultivate-bg-main/40 to-transparent lg:hidden" />
      </div>

      {/* Add System Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { if (!open) { setShowAddModal(false); resetForm(); } }}>
        <DialogContent
          showCloseButton={false}
          className="bg-cultivate-bg-elevated border-0 p-0 rounded-none sm:rounded-2xl shadow-none max-w-none w-auto"
        >
          <div className="bg-cultivate-bg-elevated rounded-lg border border-cultivate-border-element p-5 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto thin-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-cultivate-text-primary">Add a System</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-cultivate-text-tertiary hover:text-cultivate-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-cultivate-text-secondary mb-4">Register a Farmitecture system you&apos;ve purchased. It will appear as &quot;Pending Setup&quot; until an agronomist confirms it.</p>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs text-cultivate-text-secondary mb-1">System name <span className="text-cultivate-text-secondary">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hydroponic NFT System - Medium"
                  className="w-full px-2.5 py-2 bg-cultivate-bg-main text-cultivate-text-primary text-sm placeholder-cultivate-text-tertiary border border-cultivate-border-element rounded-lg focus:outline-none focus:border-cultivate-green-light"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-cultivate-text-secondary mb-1">Type <span className="text-cultivate-text-secondary">*</span></label>
                <Dropdown
                  value={form.type}
                  onChange={(v) => setForm(f => ({ ...f, type: v }))}
                  placeholder="Select type..."
                  options={[
                    { value: "Hydroponic System", label: "Hydroponic System" },
                    { value: "Irrigation System", label: "Irrigation System" },
                    { value: "Vertical Farm", label: "Vertical Farm" },
                    { value: "Greenhouse", label: "Greenhouse" },
                    { value: "Aquaponic System", label: "Aquaponic System" },
                    { value: "Composting System", label: "Composting System" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-cultivate-text-secondary mb-1">Description <span className="text-cultivate-text-secondary">*</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    setForm(f => ({ ...f, description: e.target.value }));
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  placeholder="Brief description of the system..."
                  rows={2}
                  style={{ minHeight: "60px" }}
                  className="w-full px-2.5 py-2 bg-cultivate-bg-main text-cultivate-text-primary text-sm placeholder-cultivate-text-tertiary border border-cultivate-border-element rounded-lg focus:outline-none focus:border-cultivate-green-light resize-none overflow-hidden"
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-xs text-cultivate-text-secondary mb-1">Purchase date <span className="text-cultivate-text-secondary">*</span></label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-cultivate-bg-main text-cultivate-text-primary text-sm border border-cultivate-border-element rounded-lg focus:outline-none focus:border-cultivate-green-light [color-scheme:dark]"
                />
              </div>

              {/* Optional dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cultivate-text-secondary mb-1">Installation date</label>
                  <input
                    type="date"
                    value={form.installationDate}
                    onChange={(e) => setForm(f => ({ ...f, installationDate: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-cultivate-bg-main text-cultivate-text-primary text-sm border border-cultivate-border-element rounded-lg focus:outline-none focus:border-cultivate-green-light [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cultivate-text-secondary mb-1">Warranty until</label>
                  <input
                    type="date"
                    value={form.warrantyUntil}
                    onChange={(e) => setForm(f => ({ ...f, warrantyUntil: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-cultivate-bg-main text-cultivate-text-primary text-sm border border-cultivate-border-element rounded-lg focus:outline-none focus:border-cultivate-green-light [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end mt-4">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-3 py-1.5 text-xs text-cultivate-text-primary hover:bg-cultivate-border-element rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSystem}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-cultivate-button-primary text-white text-xs rounded-lg hover:bg-cultivate-button-primary-hover transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Add System
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
