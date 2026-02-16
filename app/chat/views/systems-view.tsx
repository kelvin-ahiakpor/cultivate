"use client";

import { useState } from "react";
import { Layers, Search, Package, Calendar, CheckCircle, Clock, ExternalLink } from "lucide-react";

interface System {
  id: string;
  name: string;
  type: string;
  purchaseDate: string;
  status: "active" | "pending_setup" | "inactive";
  description: string;
  specifications?: {
    size?: string;
    capacity?: string;
    material?: string;
  };
  installationDate?: string;
  warrantyUntil?: string;
}

export default function SystemsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Mock data - Farmitecture products/systems
  const mockSystems: System[] = [
    {
      id: "sys-1",
      name: "Hydroponic NFT System - Medium",
      type: "Hydroponic System",
      purchaseDate: "2025-11-15",
      status: "active",
      description: "Nutrient Film Technique (NFT) hydroponic setup for leafy greens",
      specifications: {
        size: "4m x 1.2m",
        capacity: "60 plant sites",
        material: "Food-grade PVC pipes",
      },
      installationDate: "2025-11-20",
      warrantyUntil: "2026-11-15",
    },
    {
      id: "sys-2",
      name: "Drip Irrigation Kit - 0.5 Acre",
      type: "Irrigation System",
      purchaseDate: "2026-01-10",
      status: "active",
      description: "Complete drip irrigation system with timer and filters",
      specifications: {
        capacity: "0.5 acre coverage",
        material: "UV-resistant polyethylene tubing",
      },
      installationDate: "2026-01-15",
      warrantyUntil: "2027-01-10",
    },
    {
      id: "sys-3",
      name: "Vertical Garden Tower",
      type: "Vertical Farming",
      purchaseDate: "2026-02-01",
      status: "pending_setup",
      description: "Stackable modular vertical garden for herbs and small vegetables",
      specifications: {
        size: "1.5m height",
        capacity: "40 plant pockets",
        material: "Recycled plastic modules",
      },
    },
    {
      id: "sys-4",
      name: "Greenhouse Structure - 100sqm",
      type: "Greenhouse",
      purchaseDate: "2025-09-20",
      status: "active",
      description: "UV-treated polyethylene greenhouse with ventilation",
      specifications: {
        size: "10m x 10m x 3m",
        material: "Galvanized steel frame, 200-micron PE cover",
      },
      installationDate: "2025-10-05",
      warrantyUntil: "2027-09-20",
    },
    {
      id: "sys-5",
      name: "Solar Water Pump - 1HP",
      type: "Water Pump",
      purchaseDate: "2025-12-10",
      status: "active",
      description: "Solar-powered submersible pump for irrigation",
      specifications: {
        capacity: "30,000 liters/day",
        material: "Stainless steel impeller",
      },
      installationDate: "2025-12-15",
      warrantyUntil: "2027-12-10",
    },
  ];

  // Filter systems
  const filteredSystems = mockSystems.filter(system => {
    const matchesStatus = selectedStatus === "all" || system.status === selectedStatus;
    const matchesSearch = system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      system.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      system.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-[#85b878]";
      case "pending_setup":
        return "text-orange-400";
      case "inactive":
        return "text-[#6B6B6B]";
      default:
        return "text-[#9C9A92]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending_setup":
        return "Pending Setup";
      case "inactive":
        return "Inactive";
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* PART 1: Fixed Section */}
      <div className="flex-shrink-0 bg-[#1E1E1E] z-10 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 mr-2">
          <div>
            <h1 className="text-2xl font-serif text-[#C2C0B6]">Systems</h1>
            <p className="text-sm text-[#9C9A92] mt-1">{mockSystems.length} Farmitecture products installed</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3 mb-6 mr-2">
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedStatus === "all"
                  ? "bg-[#5a7048] text-white"
                  : "bg-[#2B2B2B] text-[#C2C0B6] hover:bg-[#3B3B3B]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus("active")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedStatus === "active"
                  ? "bg-[#5a7048] text-white"
                  : "bg-[#2B2B2B] text-[#C2C0B6] hover:bg-[#3B3B3B]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setSelectedStatus("pending_setup")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedStatus === "pending_setup"
                  ? "bg-[#5a7048] text-white"
                  : "bg-[#2B2B2B] text-[#C2C0B6] hover:bg-[#3B3B3B]"
              }`}
            >
              Pending
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search systems..."
              className="w-full pl-9 pr-3 py-2 bg-[#2B2B2B] border border-[#3B3B3B] rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#5a7048]"
            />
          </div>
        </div>
      </div>

      {/* PART 2: Scrollable Section */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar scrollbar-outset mr-3">
        {filteredSystems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Layers className="w-16 h-16 text-[#3B3B3B] mb-4" />
            <p className="text-[#9C9A92] text-sm">No systems found</p>
            <p className="text-[#6B6B6B] text-xs mt-1">Contact Farmitecture to purchase farming systems</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-4">
            {filteredSystems.map((system) => (
              <div
                key={system.id}
                className="bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl p-5 hover:border-[#3B3B3B] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-[#2B2B2B] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-[#5a7048]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-white mb-1">{system.name}</h3>
                      <p className="text-sm text-[#9C9A92]">{system.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(system.status)}`}>
                      {getStatusLabel(system.status)}
                    </span>
                    {system.status === "active" && <CheckCircle className="w-4 h-4 text-[#85b878]" />}
                    {system.status === "pending_setup" && <Clock className="w-4 h-4 text-orange-400" />}
                  </div>
                </div>

                <p className="text-sm text-[#C2C0B6] mb-4">{system.description}</p>

                {/* Specifications */}
                {system.specifications && (
                  <div className="bg-[#2B2B2B] rounded-lg p-3 mb-4">
                    <p className="text-xs text-[#9C9A92] uppercase tracking-wide mb-2">Specifications</p>
                    <div className="grid grid-cols-2 gap-2">
                      {system.specifications.size && (
                        <div>
                          <p className="text-xs text-[#6B6B6B]">Size</p>
                          <p className="text-sm text-white">{system.specifications.size}</p>
                        </div>
                      )}
                      {system.specifications.capacity && (
                        <div>
                          <p className="text-xs text-[#6B6B6B]">Capacity</p>
                          <p className="text-sm text-white">{system.specifications.capacity}</p>
                        </div>
                      )}
                      {system.specifications.material && (
                        <div className="col-span-2">
                          <p className="text-xs text-[#6B6B6B]">Material</p>
                          <p className="text-sm text-white">{system.specifications.material}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-[#9C9A92]">
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
                <div className="mt-4 pt-4 border-t border-[#2B2B2B] flex items-center justify-between">
                  <a
                    href="#"
                    className="text-sm text-[#5a7048] hover:text-[#85b878] transition-colors flex items-center gap-1"
                  >
                    View manual
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {system.status === "pending_setup" && (
                    <button className="px-3 py-1.5 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm">
                      Request Setup
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
