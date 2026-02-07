"use client";

import { useState } from "react";
import Link from "next/link";
import { Sprout, Plus, ChevronDown, Leaf, Bug, CloudRain, Calendar, Settings, HelpCircle, LogOut, MessageCircle, Layers, PanelLeft, MoreHorizontal } from "lucide-react";
import { signOut } from "next-auth/react";
import { CabbageIcon, PaperPlaneIcon, SproutIcon } from "@/components/send-icons";

interface ChatPageProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function ChatPageClient({ user }: ChatPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("General Farm Advisor");
  const [sendIcon, setSendIcon] = useState<"cabbage" | "plane" | "sprout">("cabbage");

  const getInitials = (name: string) => {
    return name[0]?.toUpperCase() || "U";
  };

  // Mock agents list - will be replaced with real data from API
  const agents = [
    "General Farm Advisor",
    "Maize Expert",
    "Pest Management",
    "Irrigation Specialist",
  ];

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-72' : 'w-14'} bg-[#1C1C1C] border-r border-[#2B2B2B] flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Logo */}
        <div className={`px-3 pt-4 pb-3 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
              <span className="text-xl font-serif font-semibold text-white">Cultivate</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-[#141413] rounded transition-colors"
          >
            <PanelLeft className={`w-5 h-5 text-[#C2C0B6] transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 pt-3">
          <div className="space-y-0.5">
            {/* New Chat */}
            <button
              className={`group relative w-full flex items-center gap-3 px-2 py-1.5 text-[#C2C0B6] hover:bg-[#141413] hover:text-white rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <div className="w-6 h-6 bg-[#2B2B2B] rounded-full flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              {sidebarOpen && <span className="text-sm">New chat</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  New chat
                </div>
              )}
            </button>

            {/* Chats */}
            <button
              className={`group relative w-full flex items-center gap-3 px-2 py-1.5 text-[#C2C0B6] hover:bg-[#141413] hover:text-white rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <MessageCircle className="w-5 h-5 text-white flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">Chats</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Chats
                </div>
              )}
            </button>

            {/* Systems (Farmitecture Products) */}
            <button
              className={`group relative w-full flex items-center gap-3 px-2 py-1.5 text-[#C2C0B6] hover:bg-[#141413] hover:text-white rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <Layers className="w-5 h-5 text-white flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">Systems</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Systems
                </div>
              )}
            </button>
          </div>

          {/* Recent Chats Section - Hidden when collapsed */}
          {sidebarOpen && (
            <div className="mt-4">
              <div className="text-[11px] text-[#9C9A92] px-2 mb-1.5">
                Recents
              </div>
              <div className="space-y-0.5">
                <div className="group flex items-stretch rounded-lg hover:bg-[#141413] has-[button:hover]:bg-transparent transition-colors cursor-pointer">
                  <span className="flex-1 truncate text-sm text-[#C2C0B6] group-hover:text-white flex items-center pl-2 py-2">
                    Pest identification help
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-2 hover:bg-[#141413] rounded-lg flex items-center">
                    <MoreHorizontal className="w-4 h-4 text-[#C2C0B6]" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="group flex items-stretch rounded-lg hover:bg-[#141413] has-[button:hover]:bg-transparent transition-colors cursor-pointer">
                  <span className="flex-1 truncate text-sm text-[#C2C0B6] group-hover:text-white flex items-center pl-2 py-2">
                    Maize planting season
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-2 hover:bg-[#141413] rounded-lg flex items-center">
                    <MoreHorizontal className="w-4 h-4 text-[#C2C0B6]" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="group flex items-stretch rounded-lg hover:bg-[#141413] has-[button:hover]:bg-transparent transition-colors cursor-pointer">
                  <span className="flex-1 truncate text-sm text-[#C2C0B6] group-hover:text-white flex items-center pl-2 py-2">
                    Irrigation scheduling
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-2 hover:bg-[#141413] rounded-lg flex items-center">
                    <MoreHorizontal className="w-4 h-4 text-[#C2C0B6]" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`border-t border-[#2B2B2B] p-2.5 relative hover:bg-black hover:border-black transition-colors ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`group relative flex items-center rounded-lg p-1.5 ${sidebarOpen ? 'w-full justify-between' : 'justify-center'}`}
          >
            <div className={`flex items-center ${sidebarOpen ? 'gap-2' : ''}`}>
              <div className="w-10 h-10 bg-[#85b878] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base font-medium">{getInitials(user.name)}</span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-[#C2C0B6] truncate">
                    {user.name?.split(" ")[0]}
                  </p>
                  <p className="text-xs text-[#9C9A92] truncate">
                    {user.role === "ADMIN" ? "Admin" : user.role === "AGRONOMIST" ? "Agronomist" : "Farmer"}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <ChevronDown className={`w-4 h-4 text-[#C2C0B6] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            )}
            {/* Tooltip when collapsed */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {user.name?.split(" ")[0]}
              </div>
            )}
          </button>

          {/* User Menu Modal */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className={`absolute bottom-full mb-2 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-2 z-50 ${sidebarOpen ? 'left-3 right-3' : 'left-0 min-w-[200px]'}`}>
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-[#9C9A92] truncate">{user.email}</p>
                </div>
                <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors rounded">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors rounded">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </button>
                <div className="border-t border-[#2B2B2B] mt-1 pt-1">
                  <button
                    onClick={() => signOut()}
                    className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2 transition-colors rounded"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="max-w-3xl w-full px-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif text-[#C2C0B6] mb-3 flex items-center justify-center gap-3">
                <Sprout className="w-10 h-10 text-[#85b878]" />
                Hey there, {user.name?.split(" ")[0]}
              </h1>
            </div>

            {/* Input Area - Positioned close to greeting */}
            <div className="mb-6">
              <div className="relative bg-[#2B2B2B] rounded-2xl shadow-sm p-4">
                <textarea
                  placeholder="How can I help you today?"
                  rows={1}
                  className="w-full px-2 py-2 focus:outline-none resize-none text-white placeholder-[#C2C0B6] bg-transparent"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-[#3B3B3B] rounded transition-colors">
                      <Plus className="w-5 h-5 text-[#C2C0B6]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Agent Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowAgentMenu(!showAgentMenu)}
                        className="flex items-center gap-1 text-[#C2C0B6] hover:text-white transition-colors text-sm"
                      >
                        <span>{selectedAgent}</span>
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>

                      {/* Agent Dropdown */}
                      {showAgentMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAgentMenu(false)} />
                          <div className="absolute bottom-full right-0 mb-2 bg-[#2B2B2B] rounded-lg shadow-lg border border-[#3B3B3B] py-2 z-50 min-w-[200px]">
                            {agents.map((agent) => (
                              <button
                                key={agent}
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setShowAgentMenu(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-[#3B3B3B] transition-colors ${
                                  selectedAgent === agent ? "text-[#85b878]" : "text-[#C2C0B6]"
                                }`}
                              >
                                {agent}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Cycling send icon — cycles on click; move to send handler when wired up */}
                    <button
                      onClick={() => setSendIcon(s => s === "cabbage" ? "plane" : s === "plane" ? "sprout" : "cabbage")}
                      className="p-2 bg-[#85b878] text-white rounded-xl hover:bg-[#536d3d] transition-colors"
                    >
                      {sendIcon === "cabbage" && <CabbageIcon />}
                      {sendIcon === "plane" && <PaperPlaneIcon />}
                      {sendIcon === "sprout" && <SproutIcon />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Below Input */}
            <div className="flex justify-center gap-2 flex-wrap">
              <button className="group relative px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                <Leaf className="w-4 h-4 text-[#C2C0B6]" />
                <span className="text-sm text-[#C2C0B6]">Crops</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-[#171717] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-[#3B3B3B]">
                  Best practices for your crops
                </div>
              </button>
              <button className="group relative px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                <Bug className="w-4 h-4 text-[#C2C0B6]" />
                <span className="text-sm text-[#C2C0B6]">Pests</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-[#171717] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-[#3B3B3B]">
                  Identify and manage pests
                </div>
              </button>
              <button className="group relative px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-[#C2C0B6]" />
                <span className="text-sm text-[#C2C0B6]">Weather</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-[#171717] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-[#3B3B3B]">
                  Plan based on weather
                </div>
              </button>
              <button className="group relative px-3 py-[7px] border-[0.5px] border-[#3B3B3B] bg-[#1E1E1E] rounded-lg hover:bg-[#141413] hover:border-[#141413] transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C2C0B6]" />
                <span className="text-sm text-[#C2C0B6]">Planting</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-[#171717] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-[#3B3B3B]">
                  When to plant and harvest
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-4 text-center">
          <p className="text-xs text-[#C2C0B6]">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
