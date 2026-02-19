"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sprout, Plus, ChevronDown, Leaf, Bug, CloudRain, Calendar, Settings, HelpCircle, LogOut, MessageCircle, Layers, PanelLeft, MoreHorizontal, CircleEllipsis, Pencil, Trash2, Share, Unlink, Download } from "lucide-react";
import { signOut } from "next-auth/react";
import { CabbageIcon, PaperPlaneIcon, SproutIcon } from "@/components/send-icons";
import ChatsView, { mockChats } from "./views/chats-view";
import SystemsView from "./views/systems-view";

interface ChatPageProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function ChatPageClient({ user }: ChatPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Open sidebar by default on desktop, keep closed on mobile
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("General Farm Advisor");
  const [sendIcon, setSendIcon] = useState<"cabbage" | "plane" | "sprout">("cabbage");
  const [activeView, setActiveView] = useState<"chat" | "chats" | "systems">("chat");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowInstallModal(false);
  };

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

  const handleSidebarChatClick = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveView("chats");
  };

  const handleAllChatsClick = () => {
    setSelectedChatId(null);
    setActiveView("chats");
  };

  // Keep selectedChatId in sync — no longer clear it so sidebar holds active state
  const handleChatOpened = () => {
    // intentionally keep selectedChatId so sidebar highlights the opened chat
  };

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Mobile: button to open sidebar when it's closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-50 lg:hidden w-9 h-9 flex items-center justify-center bg-[#2B2B2B] hover:bg-[#3B3B3B] rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <PanelLeft className="w-4 h-4 text-[#C2C0B6] rotate-180" />
        </button>
      )}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1C1C1C] border-r border-[#2B2B2B] flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 ${sidebarOpen ? 'lg:w-72' : 'lg:w-14'}`}
      >
        {/* Logo */}
        <div className={`p-2 min-h-[53px] flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
              <span className="pl-2 text-xl font-serif font-semibold text-white">Cultivate</span>
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
              onClick={() => setActiveView("chat")}
              className={`group relative w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chat" ? "bg-[#141413] text-white" : "text-[#C2C0B6] hover:bg-[#141413] hover:text-white"
              }`}
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
              onClick={() => { setSelectedChatId(null); setActiveView("chats"); }}
              className={`group relative w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "chats" && !selectedChatId ? "bg-[#141413] text-white" : "text-[#C2C0B6] hover:bg-[#141413] hover:text-white"
              }`}
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
              onClick={() => setActiveView("systems")}
              className={`group relative w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${!sidebarOpen ? 'justify-center' : ''} ${
                activeView === "systems" ? "bg-[#141413] text-white" : "text-[#C2C0B6] hover:bg-[#141413] hover:text-white"
              }`}
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
              {/* Sidebar chat items — Claude-style pattern (see sidebar-chat-patterns.md)
                  Row states: active (bg), menu-open (no row bg, only button bg), default (hover bg)
                  Text: truncate when idle → gradient fade on hover/active (via mask-image)
                  Button: hidden → visible on hover/active/menu-open, near-black bg when menu open
                  Hover zones: has-[button:hover]:bg-transparent keeps row & button independent */}
              <div className="space-y-0.5">
                {mockChats.slice(0, 30).map((chat) => {
                  const isActive = activeView === "chats" && selectedChatId === chat.id;
                  const isMenuOpen = chatMenuId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleSidebarChatClick(chat.id)}
                      className={`group flex items-stretch rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#141413]'
                          : isMenuOpen
                            ? '' /* menu open on non-active: no row bg, only button gets bg */
                            : 'hover:bg-[#141413] has-[button:hover]:bg-transparent'
                      }`}
                    >
                      {/* Text label — min-w-0 is critical for flex child truncation */}
                      <span
                        className={`flex-1 min-w-0 text-sm py-1.5 pl-1.5 overflow-hidden whitespace-nowrap ${
                          isActive
                            ? 'text-white [mask-image:linear-gradient(to_right,black_75%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_75%,transparent_100%)]'
                            : 'text-[#C2C0B6] group-hover:text-white truncate group-hover:[text-overflow:clip] group-hover:[mask-image:linear-gradient(to_right,black_75%,transparent_100%)] group-hover:[-webkit-mask-image:linear-gradient(to_right,black_75%,transparent_100%)]'
                        }`}
                      >
                        {chat.title}
                      </span>
                      {/* Three-dot menu — self-stretch fills row height via items-stretch parent */}
                      <div className="relative flex-shrink-0 flex items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setChatMenuId(isMenuOpen ? null : chat.id); }}
                          className={`${isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isMenuOpen ? 'bg-[#0a0a0a]' : 'hover:bg-[#141413]'} transition-all px-2 self-stretch rounded-lg flex items-center`}
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#9C9A92] hover:text-white transition-colors" strokeWidth={2.5} />
                        </button>

                        {/* Dropdown: Share, Rename, [Remove from system], Delete */}
                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }} />
                            <div className="absolute right-0 top-full mt-1 bg-[#1C1C1C] rounded-lg shadow-lg border border-[#2B2B2B] py-1 z-50 min-w-[200px] whitespace-nowrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Share className="w-3.5 h-3.5" />
                                Share
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              {/* Conditional: only for chats linked to a Farmitecture system */}
                              {chat.systemName && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                  className="w-full px-3 py-2 text-left text-sm text-[#C2C0B6] hover:bg-[#141413] hover:text-white flex items-center gap-2.5 transition-colors"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                  Remove from system
                                </button>
                              )}
                              <div className="border-t border-[#2B2B2B] my-1 mx-3" />
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatMenuId(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#141413] hover:text-red-300 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All Chats link */}
              {mockChats.length > 30 && (
                <button
                  onClick={handleAllChatsClick}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-[#9C9A92] hover:text-white hover:bg-[#141413] rounded-lg transition-colors"
                >
                  <CircleEllipsis className="w-4 h-4 flex-shrink-0" />
                  All chats
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`border-t border-[#2B2B2B] p-2 relative hover:bg-black hover:border-black transition-colors ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          {/* div instead of button so the nested Download button is valid HTML */}
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`group relative flex items-center rounded-lg p-1.5 cursor-pointer ${sidebarOpen ? 'w-full justify-between' : 'justify-center'}`}
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
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInstallModal(true); }}
                  className="p-1.5 border border-[#3B3B3B] hover:border-[#5a7048] rounded-md transition-colors text-[#9C9A92] hover:text-[#C2C0B6]"
                  title="Install app"
                >
                  <Download className="w-4 h-4" />
                </button>
                <ChevronDown className={`w-4 h-4 text-[#C2C0B6] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </div>
            )}
            {/* Tooltip when collapsed */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {user.name?.split(" ")[0]}
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
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

          {/* PWA Install Modal */}
          {showInstallModal && (
            <>
              <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowInstallModal(false)} />
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl p-6 w-80 shadow-xl">
                <div className="mb-4">
                  <div className="w-10 h-10 bg-[#5a7048] rounded-full flex items-center justify-center mb-3">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-white font-semibold text-base mb-1.5">Install Cultivate</h2>
                  <p className="text-[#9C9A92] text-sm leading-relaxed">
                    Add Cultivate to your home screen for quick access and offline support.
                  </p>
                  <p className="text-[#6B6B6B] text-xs mt-2 leading-relaxed">
                    On iOS: tap the Share button in Safari, then &ldquo;Add to Home Screen&rdquo;.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="px-4 py-2 text-sm text-[#9C9A92] hover:text-white transition-colors rounded-lg"
                  >
                    Not now
                  </button>
                  <button
                    onClick={handleInstall}
                    className="px-4 py-2 bg-[#5a7048] hover:bg-[#4a5d38] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Install
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Conditional rendering based on active view */}
        {/* Conversation view: full-width (header spans edge-to-edge like Claude)
            Chat list view: padded with max-w-5xl container */}
        {activeView === "chats" && (
          <div className={`flex-1 min-h-0 overflow-hidden ${
            selectedChatId ? '' : 'max-w-5xl w-full mx-auto px-4 sm:px-8 py-8'
          }`}>
            <ChatsView initialChatId={selectedChatId} onChatOpened={handleChatOpened} onChatSelect={(chatId) => setSelectedChatId(chatId)} />
          </div>
        )}

        {activeView === "systems" && (
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 min-h-0 overflow-hidden">
            <SystemsView />
          </div>
        )}

        {activeView === "chat" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
