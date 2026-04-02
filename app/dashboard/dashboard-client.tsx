"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import Link from "next/link";
import {
  LayoutDashboard, Bot, BookOpen, Flag, BarChart3,
  Plus, Settings, HelpCircle, LogOut,
  PanelLeft, MoreHorizontal, Upload, Eye,
  CheckCircle, Pencil, ArrowRight, MessageCircle, X, Download, Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import AgentsView from "./views/agents-view";
import KnowledgeView from "./views/knowledge-view";
import FlaggedView from "./views/flagged-view";
import ChatsView from "./views/chats-view";
import GlassCircleButton from "@/components/glass-circle-button";
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats";
import { useActivity, relativeTime, type ActivityItem } from "@/lib/hooks/use-activity";

interface DashboardProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  // demoMode: when true, all child views use local mock data and make zero API requests.
  // Passed down from /demo/dashboard/page.tsx. See BACKEND-PROGRESS.md § Phase 5 for the pattern.
  demoMode?: boolean;
  initialView?: string;
}

/** Maps an API activity type to its icon + color. Used in the real-mode activity feed. */
function ActivityRow({ item, isStandalone }: { item: ActivityItem; isStandalone: boolean }) {
  const config: Record<ActivityItem["type"], { icon: React.ReactNode; color: string; accent: string }> = {
    flagged_created:     { icon: <Flag className="w-4 h-4 text-cultivate-beige" />,        color: "bg-cultivate-beige/20", accent: "text-cultivate-beige" },
    flagged_verified:    { icon: <CheckCircle className="w-4 h-4 text-cultivate-green-light" />, color: "bg-cultivate-green-light/20", accent: "text-cultivate-green-light" },
    flagged_corrected:   { icon: <Pencil className="w-4 h-4 text-cultivate-teal" />,      color: "bg-cultivate-teal/20", accent: "text-cultivate-teal" },
    conversation_started:{ icon: <MessageCircle className="w-4 h-4 text-cultivate-teal" />, color: "bg-cultivate-teal/20", accent: "text-cultivate-teal" },
    agent_created:       { icon: <Bot className="w-4 h-4 text-cultivate-green-light" />,         color: "bg-cultivate-green-light/20", accent: "text-cultivate-green-light" },
    knowledge_uploaded:  { icon: <BookOpen className="w-4 h-4 text-cultivate-teal" />,    color: "bg-cultivate-teal/20", accent: "text-cultivate-teal" },
  };
  const { icon, color } = config[item.type] ?? config.conversation_started;
  return (
    <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>{item.description}</p>
        <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>
          {item.agentName && <>{item.agentName} &middot; </>}{relativeTime(item.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardClient({ user, demoMode = false, initialView = "overview" }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Open sidebar by default on desktop, keep closed on mobile
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  // Capture the browser's PWA install prompt for the Install button
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowInstallModal(false);
  };

  const handleSignOut = async () => {
    try {
      // Use redirect: false to bypass NextAuth's server-side redirect
      await signOut({ redirect: false });
      // Manually redirect on client side to preserve network IP
      window.location.href = `${window.location.origin}/`;
    } catch {
      window.location.href = `${window.location.origin}/`;
    }
  };
  const [activeNav, setActiveNav] = useState(initialView);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  // Ref to measure the 8th item's bottom — makes the list snap to exactly 8 visible items
  const activityListRef = useRef<HTMLDivElement>(null);
  const [activityListMaxH, setActivityListMaxH] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!activityPanelOpen || !activityListRef.current) return;
    // Wait one frame so the panel has painted before measuring
    const frame = requestAnimationFrame(() => {
      const list = activityListRef.current;
      if (!list) return;
      const children = list.children;
      const snapAt = 8; // show this many items before scrolling
      if (children.length >= snapAt) {
        const nthItem = children[snapAt - 1] as HTMLElement;
        const listTop = list.getBoundingClientRect().top;
        const nthBottom = nthItem.getBoundingClientRect().bottom;
        // +16 for the py-4 (bottom padding) inside the list
        setActivityListMaxH(nthBottom - listTop + 8);
      } else {
        setActivityListMaxH(undefined); // fewer than 7 items — no cap needed
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activityPanelOpen]);

  // Sync active nav to URL so refresh restores the current view
  useEffect(() => {
    if (demoMode) return;
    const params = new URLSearchParams();
    if (activeNav !== "overview") params.set("view", activeNav);
    const query = params.toString();
    window.history.replaceState(null, "", "/dashboard" + (query ? "?" + query : ""));
  }, [activeNav, demoMode]);

  // Overview stats — disabled in demo mode (zero API requests)
  const { stats, isLoading: statsLoading } = useDashboardStats(demoMode);
  // Activity feed — disabled in demo mode (zero API requests)
  const { activities, isLoading: activityLoading } = useActivity(7, 20, demoMode);

  const handleCloseActivityPanel = () => {
    setActivityPanelOpen(false);
  };

  const getInitials = (name: string) => {
    return name[0]?.toUpperCase() || "U";
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "chats", label: "Chats", icon: MessageCircle },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
    { id: "flagged", label: "Flagged Queries", icon: Flag },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  // Mock data - will be replaced with real data from API
  const recentAgents = [
    "General Farm Advisor",
    "Maize Expert",
    "Pest Management",
  ];

  return (
    <div className="flex h-screen bg-cultivate-bg-main">
      {/* Mobile sidebar backdrop — always rendered for smooth opacity fade transition */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — slide-over paper effect matches chat sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-cultivate-bg-sidebar border-r border-cultivate-border-subtle flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${sidebarOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)]' : '-translate-x-full shadow-none'} lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'lg:w-72' : 'lg:w-14'}`}
      >
        {/* Logo — pt-16 on mobile aligns with conversation header / nav button safe area */}
        <div className={`p-2 pt-16 lg:pt-4 min-h-[53px] flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline">
              <span className={`pl-2 ${isStandalone ? "text-[1.65rem]" : "text-2xl"} lg:text-xl font-serif font-semibold text-white`}>Cultivate</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-cultivate-bg-hover rounded transition-colors"
          >
            <PanelLeft className={`w-5 h-5 text-cultivate-text-primary transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-2 pt-3">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg transition-colors ${
                  !sidebarOpen ? 'justify-center' : ''
                } ${
                  activeNav === item.id
                    ? 'bg-cultivate-bg-hover text-white'
                    : 'text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 standalone:w-6 standalone:h-6 lg:w-5 lg:h-5 flex-shrink-0" />
                {sidebarOpen && <span className={`${isStandalone ? "text-lg" : "text-sm"} lg:text-sm`}>{item.label}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Recent Agents Section */}
          {sidebarOpen && (
            <div className="mt-4">
              {/* Recent Agents label — text-sm mobile (14px), text-[11px] desktop */}
              <div className="text-[11px] standalone:text-sm lg:text-[11px] text-cultivate-text-secondary px-2 mb-1.5">
                Recent Agents
              </div>
              {/* space-y-2 on mobile for breathing room, tight on desktop */}
              <div className="space-y-0.5 standalone:space-y-2 lg:space-y-0.5">
                {recentAgents.map((agent) => (
                  <div key={agent} className="group flex items-stretch rounded-lg hover:bg-cultivate-bg-hover has-[button:hover]:bg-transparent transition-colors cursor-pointer">
                    <span className={`flex-1 truncate ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm text-cultivate-text-primary group-hover:text-white flex items-center pl-2 py-2`}>
                      {agent}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-2 hover:bg-cultivate-bg-hover rounded-lg flex items-center">
                      <MoreHorizontal className="w-4 h-4 text-cultivate-text-primary" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile — outer div, not button, to avoid nested <button> hydration error
            Click zones: avatar+name area opens menu; install button opens install modal */}
        <div className={`${isStandalone ? '' : 'border-t border-cultivate-border-subtle'} p-2 ${isStandalone ? 'pb-6 pl-3' : 'pb-2'} lg:pb-2 relative ${!sidebarOpen ? 'flex justify-center' : ''}`}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`group relative flex items-center p-1.5 ${sidebarOpen ? 'w-full justify-between gap-2' : 'justify-center'} cursor-pointer`}
          >
            {/* Avatar + name */}
            <div
              className={`flex items-center ${sidebarOpen ? 'gap-2' : ''} ${isStandalone && sidebarOpen ? 'w-auto max-w-[calc(100%-3rem)] px-2.5 py-1.5 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] transition-colors' : ''}`}
            >
              <div className="w-10 h-10 bg-cultivate-green-light rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base font-medium">{getInitials(user.name)}</span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-cultivate-text-primary truncate">
                    {user.name?.split(" ")[0]}
                  </p>
                  <p className="text-xs text-cultivate-text-secondary truncate">
                    {user.role === "ADMIN" ? "Admin" : "Agronomist"}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInstallModal(true); }}
                  className={`${isStandalone ? 'h-10 w-10 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] flex items-center justify-center' : 'p-1.5 border border-cultivate-border-element hover:border-[#5a7048] rounded-md'} transition-colors text-cultivate-text-secondary hover:text-cultivate-text-primary`}
                  title="Install app"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-cultivate-bg-elevated text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {user.name?.split(" ")[0]}
              </div>
            )}
          </div>

          {/* User Menu Modal */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className={`absolute bottom-full mb-2 bg-cultivate-bg-sidebar rounded-lg shadow-lg border border-cultivate-border-subtle py-2 z-50 ${sidebarOpen ? 'left-3 right-3' : 'left-0 min-w-[200px]'}`}>
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-cultivate-text-secondary truncate">{user.email}</p>
                </div>
                <button className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </button>
                <div className="border-t border-cultivate-border-subtle mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded"
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-hidden overflow-x-clip">
        <div
          className={`max-w-5xl w-full mx-auto px-4 sm:px-8 pt-8 pb-3 flex-1 min-h-0 ${
            ["knowledge", "agents", "flagged", "overview", "chats"].includes(activeNav)
              ? "overflow-y-hidden overflow-x-clip"
              : "overflow-y-auto"
          }`}
        >
          {activeNav === "overview" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* PART 1: Fixed greeting
                  Follows SCROLLING-LAYOUT.md + farmer chat pattern:
                  Parent has overflow-hidden so this flex-shrink-0 div never moves.
                  Mobile: GlassCircleButton inline with welcome text + pt-8 safe area.
                  Desktop: static heading, no button (sidebar always visible). */}
              <div className="relative flex-shrink-0 bg-cultivate-bg-main pt-8 pb-6 lg:pt-0 lg:pb-0 lg:bg-transparent">
                <div className="flex items-center gap-3 lg:hidden">
                  {!sidebarOpen && (
                    <GlassCircleButton
                      onClick={() => setSidebarOpen(true)}
                      aria-label="Open menu"
                      className="flex-shrink-0"
                    >
                      <PanelLeft className="w-5 h-5 text-white rotate-180" />
                    </GlassCircleButton>
                  )}
                  <div>
                    <h1 className="text-3xl font-serif text-cultivate-text-primary mb-0.5">
                      Welcome, {user.name?.split(" ")[0]}
                    </h1>
                    <p className="text-sm text-cultivate-text-secondary">Manage your AI agents and knowledge bases</p>
                  </div>
                </div>
                <div className="hidden lg:block mb-8">
                  <h1 className="text-3xl font-serif text-cultivate-text-primary mb-1">
                    Welcome, {user.name?.split(" ")[0]}
                  </h1>
                  <p className="text-sm text-cultivate-text-secondary">
                    Manage your AI agents and knowledge bases
                  </p>
                </div>

              </div>

              {/* PART 2: Scrollable content area — farmer chat pattern
                  flex-1 min-h-0 relative: establishes scroll zone below the fixed greeting
                  Inner div: mobile = single overflow-y-auto for everything
                             desktop = overflow-hidden, splits into flex-shrink-0 stats + flex-1 activity */}
              <div className="flex-1 min-h-0 relative flex flex-col lg:overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col thin-scrollbar scrollbar-outset">

              {/* Stats + Quick Actions + Activity Header — flex-shrink-0 on desktop, scrolls on mobile */}
              <div className="lg:flex-shrink-0">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onClick={() => setActiveNav("agents")} className="bg-cultivate-bg-elevated rounded-xl p-5 text-left hover:border-[#85b878] border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cultivate-text-secondary">Active Agents</span>
                    <div className="w-9 h-9 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-cultivate-green-light" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">
                    {demoMode ? 5 : statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-cultivate-text-tertiary" /> : (stats?.activeAgents ?? "—")}
                  </p>
                </button>

                <button onClick={() => setActiveNav("knowledge")} className="bg-cultivate-bg-elevated rounded-xl p-5 text-left hover:border-[#608e96] border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cultivate-text-secondary">Knowledge Docs</span>
                    <div className="w-9 h-9 bg-cultivate-teal/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-cultivate-teal" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">
                    {demoMode ? 18 : statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-cultivate-text-tertiary" /> : (stats?.knowledgeDocs ?? "—")}
                  </p>
                </button>

                <button onClick={() => setActiveNav("flagged")} className="bg-cultivate-bg-elevated rounded-xl p-5 text-left hover:border-[#e8c8ab] border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cultivate-text-secondary">Pending Flags</span>
                    <div className="w-9 h-9 bg-cultivate-beige/20 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-cultivate-beige" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">
                    {demoMode ? 4 : statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-cultivate-text-tertiary" /> : (stats?.pendingFlags ?? "—")}
                  </p>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-sm text-cultivate-text-secondary mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={() => setActiveNav("agents")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-[#85b878] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center group-hover:bg-cultivate-green-light/30 transition-colors">
                        <Plus className="w-5 h-5 text-cultivate-green-light" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cultivate-text-primary">Create New Agent</p>
                        <p className="text-xs text-cultivate-text-tertiary">Set up a new AI agent with custom knowledge</p>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setActiveNav("knowledge")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-[#608e96] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-cultivate-teal/20 rounded-lg flex items-center justify-center group-hover:bg-cultivate-teal/30 transition-colors">
                        <Upload className="w-5 h-5 text-cultivate-teal" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cultivate-text-primary">Upload Knowledge Base</p>
                        <p className="text-xs text-cultivate-text-tertiary">Add PDFs or documents to train your agents</p>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setActiveNav("flagged")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-[#e8c8ab] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-cultivate-beige/20 rounded-lg flex items-center justify-center group-hover:bg-cultivate-beige/30 transition-colors">
                        <Eye className="w-5 h-5 text-cultivate-beige" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cultivate-text-primary">Review Flagged Queries</p>
                        <p className="text-xs text-cultivate-text-tertiary">Check low-confidence farmer questions</p>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setActiveNav("analytics")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-[#536d3d] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-cultivate-green-dark/20 rounded-lg flex items-center justify-center group-hover:bg-cultivate-green-dark/30 transition-colors">
                        <BarChart3 className="w-5 h-5 text-cultivate-green-dark" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cultivate-text-primary">View Analytics</p>
                        <p className="text-xs text-cultivate-text-tertiary">See usage stats and API costs</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity Header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm text-cultivate-text-secondary">Recent Activity</h2>
                <span className="text-xs text-cultivate-text-tertiary">Last 7 days</span>
              </div>
              </div>

              {/* PART 2: Scrollable Recent Activity List */}
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pb-6">
              <div className="mr-3">

                {/* Loading state — only in real mode */}
                {!demoMode && activityLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-cultivate-text-tertiary animate-spin" />
                  </div>
                )}

                {/* Demo mode: hardcoded activity items that show what a mature account looks like */}
                {demoMode && (
                  <>
                <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-cultivate-green-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        You <span className="text-cultivate-green-light">verified</span> a response about maize aphid identification
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>Pest Management &middot; 12 hours ago</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Pencil className="w-4 h-4 text-cultivate-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        You <span className="text-cultivate-teal">corrected</span> a response about okra planting schedule
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>General Farm Advisor &middot; 2 days ago</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-beige/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Flag className="w-4 h-4 text-cultivate-beige" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        New <span className="text-cultivate-beige">flagged query</span> from Kwame Asante about cassava disease
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>General Farm Advisor &middot; 2 hours ago &middot; 45% confidence</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-cultivate-green-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        <span className="text-cultivate-green-light">Cocoa Specialist</span> agent was created
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>4 knowledge bases attached &middot; 1 day ago</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageCircle className="w-4 h-4 text-cultivate-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        Ama Mensah started a <span className="text-cultivate-teal">new conversation</span> about tomato fertilizer
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>General Farm Advisor &middot; 5 hours ago</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-beige/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Flag className="w-4 h-4 text-cultivate-beige" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        New <span className="text-cultivate-beige">flagged query</span> from Abena Darkwa about cocoa pod disease
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>General Farm Advisor &middot; 6 hours ago &middot; 41% confidence</p>
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 pl-1.5 pr-1.5 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                    <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4 text-cultivate-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${isStandalone ? "text-base" : "text-sm"} lg:text-sm text-cultivate-text-primary`}>
                        <span className="text-cultivate-teal">Cocoa Farming Guide 2026.pdf</span> uploaded to knowledge base
                      </p>
                      <p className={`${isStandalone ? "text-sm" : "text-xs"} lg:text-xs text-cultivate-text-tertiary mt-0.5`}>Cocoa Specialist &middot; 3 days ago &middot; 42 chunks</p>
                    </div>
                  </div>
                  </>
                )}

                {/* Real mode: dynamic activity items from API */}
                {!demoMode && !activityLoading && activities.map((item: ActivityItem, i: number) => (
                  <ActivityRow key={i} item={item} isStandalone={isStandalone} />
                ))}

                {/* Empty state — real mode, no activity yet */}
                {!demoMode && !activityLoading && activities.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-cultivate-text-tertiary">No activity in the last 7 days.</p>
                  </div>
                )}

                {/* View all footer */}
                <div className="pl-1.5 pr-1.5 py-3">
                  <button
                    onClick={() => setActivityPanelOpen(true)}
                    className="flex items-center gap-1 text-xs text-cultivate-text-secondary hover:text-white transition-colors"
                  >
                    View all activity
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              </div>
                </div>{/* closes scroll container: overflow-y-auto lg:overflow-hidden */}
                </div>{/* closes scroll zone: flex-1 min-h-0 relative */}
            </div>
          )}

          {activeNav === "chats" && <ChatsView sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} demoMode={demoMode} />}
          {/* demoMode disables SWR fetch — view uses local mockAgents instead */}
          {activeNav === "agents" && <AgentsView sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} demoMode={demoMode} />}
          {activeNav === "knowledge" && <KnowledgeView sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} demoMode={demoMode} />}
          {/* demoMode disables SWR fetch — view uses initialFlagged local state */}
          {activeNav === "flagged" && <FlaggedView sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} demoMode={demoMode} />}

          {activeNav === "analytics" && (
            <div>
              {/* Mobile header — glass button absolute left, title centered */}
              <div className="relative flex items-center justify-center mb-6 pt-8 lg:hidden">
                {!sidebarOpen && (
                  <div className="absolute left-0">
                    <GlassCircleButton onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                      <PanelLeft className="w-5 h-5 text-white rotate-180" />
                    </GlassCircleButton>
                  </div>
                )}
                <div className="text-center">
                  <h1 className="text-2xl font-serif text-cultivate-text-primary">Analytics</h1>
                  <p className="text-sm text-cultivate-text-secondary mt-1">Usage stats and insights</p>
                </div>
              </div>
              {/* Desktop header */}
              <div className="hidden lg:block mb-6">
                <h1 className="text-2xl font-serif text-cultivate-text-primary">Analytics</h1>
                <p className="text-sm text-cultivate-text-secondary mt-1">Usage stats and insights</p>
              </div>
              <div className="bg-cultivate-bg-elevated rounded-xl p-8 text-center">
                <BarChart3 className="w-10 h-10 text-cultivate-text-tertiary mx-auto mb-3" />
                <p className="text-sm text-cultivate-text-tertiary">Analytics coming soon.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Panel - Slide-out */}
      {activityPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={handleCloseActivityPanel}
          />
          {/* Mobile: centered dialog that grows with content. Desktop: right-side panel. */}
          <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-[calc(env(safe-area-inset-top)+12px)] lg:p-0 lg:block lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:h-full">
            <div className="w-full max-w-sm mx-auto max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-24px)] bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl lg:rounded-none lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:max-w-none lg:h-full lg:max-h-none flex flex-col shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cultivate-border-subtle">
              <div>
                <h2 className="text-sm font-medium text-white">Recent Activity</h2>
                <p className="text-xs text-cultivate-text-secondary mt-0.5">Last 30 days</p>
              </div>
              <button
                type="button"
                onClick={handleCloseActivityPanel}
                className="p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-cultivate-text-secondary" />
              </button>
            </div>

            {/* Scrollable Activity List — height snaps to 8th item, scrolls beyond */}
            <div
              ref={activityListRef}
              style={activityListMaxH ? { maxHeight: `${activityListMaxH}px` } : undefined}
              className="overflow-y-auto thin-scrollbar px-5 py-2 lg:max-h-none lg:flex-1"
            >
              {/* Demo mode: hardcoded items showing a mature account's history */}
              {demoMode && (
                <>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-cultivate-green-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">You <span className="text-cultivate-green-light">verified</span> a response about maize aphid identification</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">Pest Management &middot; 12 hours ago</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Pencil className="w-4 h-4 text-cultivate-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">You <span className="text-cultivate-teal">corrected</span> a response about okra planting schedule</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">General Farm Advisor &middot; 2 days ago</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-beige/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Flag className="w-4 h-4 text-cultivate-beige" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">New <span className="text-cultivate-beige">flagged query</span> from Kwame Asante about cassava disease</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">General Farm Advisor &middot; 2 hours ago &middot; 45% confidence</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-cultivate-green-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary"><span className="text-cultivate-green-light">Cocoa Specialist</span> agent was created</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">4 knowledge bases attached &middot; 1 day ago</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4 text-cultivate-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">Ama Mensah started a <span className="text-cultivate-teal">new conversation</span> about tomato fertilizer</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">General Farm Advisor &middot; 5 hours ago</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-beige/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Flag className="w-4 h-4 text-cultivate-beige" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">New <span className="text-cultivate-beige">flagged query</span> from Abena Darkwa about cocoa pod disease</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">General Farm Advisor &middot; 6 hours ago &middot; 41% confidence</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-cultivate-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary"><span className="text-cultivate-teal">Cocoa Farming Guide 2026.pdf</span> uploaded to knowledge base</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">Cocoa Specialist &middot; 3 days ago &middot; 42 chunks</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-cultivate-green-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">You <span className="text-cultivate-green-light">verified</span> a response about tomato blight treatment</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">Pest Management &middot; 4 days ago</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-teal/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4 text-cultivate-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary">Kofi Mensah started a <span className="text-cultivate-teal">new conversation</span> about armyworm outbreak</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">Pest Management &middot; 5 days ago</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 py-1.5 lg:py-2.5 border-b border-cultivate-border-element ${isStandalone ? "border-none" : ""} lg:border-b lg:border-cultivate-border-element`}>
                <div className="w-8 h-8 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-cultivate-green-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cultivate-text-primary"><span className="text-cultivate-green-light">Maize Expert</span> agent was updated with new system prompt</p>
                  <p className="text-xs text-cultivate-text-tertiary mt-0.5">6 days ago</p>
                </div>
              </div>
                </>
              )}

              {/* Real mode: same activities array fetched for the overview — no second API call */}
              {!demoMode && activityLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-cultivate-text-tertiary animate-spin" />
                </div>
              )}
              {!demoMode && !activityLoading && activities.map((item: ActivityItem, i: number) => (
                <ActivityRow key={i} item={item} isStandalone={isStandalone} />
              ))}
              {!demoMode && !activityLoading && activities.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-cultivate-text-tertiary">No activity in the last 30 days.</p>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-3 border-t border-cultivate-border-subtle">
              <button
                type="button"
                onClick={handleCloseActivityPanel}
                className="w-full px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-[#C2C0B6] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          </div>
        </>
      )}

      {/* PWA Install Modal — outside sidebar to avoid transform containing block issues with fixed positioning */}
      {showInstallModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowInstallModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-6 w-80 shadow-xl">
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#5a7048] rounded-full flex items-center justify-center mb-3">
                <Download className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white font-semibold text-base mb-1.5">Install Cultivate</h2>
              <p className="text-cultivate-text-secondary text-sm leading-relaxed">
                Add Cultivate to your home screen for quick access and offline support.
              </p>
              <p className="text-cultivate-text-tertiary text-xs mt-2 leading-relaxed">
                On iOS: tap the Share button in Safari, then &ldquo;Add to Home Screen&rdquo;.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2 text-sm text-cultivate-text-secondary hover:text-white transition-colors rounded-lg"
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
  );
}
