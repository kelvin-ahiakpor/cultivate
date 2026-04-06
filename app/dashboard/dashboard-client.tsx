"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import Link from "next/link";
import {
  LayoutDashboard, Bot, BookOpen, Flag, BarChart3,
  Plus, Settings, HelpCircle, LogOut,
  PanelLeft, MoreHorizontal, Upload, Eye,
  CheckCircle, Pencil, ArrowRight, MessageCircle, X, Download, Loader2,
  CircleEllipsis, WifiOff,
} from "lucide-react";
import { signOut } from "next-auth/react";
import AgentsView from "./views/agents-view";
import AgentEditView from "./views/agent-edit-view";
import KnowledgeView from "./views/knowledge-view";
import FlaggedView from "./views/flagged-view";
import ChatsView from "./views/chats-view";
import SettingsView from "./views/settings-view";
import { GlassCircleButton } from "@/components/cultivate-ui";
import PWAInstallModal from "@/components/pwa-install-modal";
import { useDashboardStats, type DashboardStats } from "@/lib/hooks/use-dashboard-stats";
import { useActivity, relativeTime, type ActivityItem } from "@/lib/hooks/use-activity";
import { useAgents } from "@/lib/hooks/use-agents";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { saveAgroCache, getAgroCache, formatCacheAge } from "@/lib/offline-storage";
import { DEMO_AGENTS, DEMO_DASHBOARD_CHATS, DEMO_ACTIVITY } from "@/lib/demo-data";

interface DashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    location?: string | null;
    gpsCoordinates?: string | null;
  };
  // demoMode: when true, all child views use local mock data and make zero API requests.
  // Passed down from /demo/dashboard/page.tsx. See BACKEND-PROGRESS.md § Phase 5 for the pattern.
  demoMode?: boolean;
  initialView?: string;
  initialAgentId?: string | null;
  initialChatId?: string | null;
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

export default function DashboardClient({ user, demoMode = false, initialView = "overview", initialAgentId = null, initialChatId = null }: DashboardProps) {
  const recentChatsLimit = 15;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Keep SSR and first client render aligned, then sync sidebar state after mount.
  useEffect(() => {
    let frame = 0;

    const syncSidebar = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };

    frame = window.requestAnimationFrame(syncSidebar);
    window.addEventListener("resize", syncSidebar);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncSidebar);
    };
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
  const [activeAgentId, setActiveAgentId] = useState<string | null>(initialAgentId);
  const [activeKnowledgeAgentId, setActiveKnowledgeAgentId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);
  const [chatListResetKey, setChatListResetKey] = useState(0);
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

  // Sync active nav (+ optional agent id) to URL so refresh restores the current view
  useEffect(() => {
    if (demoMode) return;
    const params = new URLSearchParams();
    if (activeNav !== "overview") params.set("view", activeNav);
    if (activeNav === "agent-edit" && activeAgentId) params.set("agent", activeAgentId);
    if (activeNav === "chats" && activeChatId) params.set("c", activeChatId);
    if (activeNav === "settings") params.delete("agent");
    const query = params.toString();
    window.history.replaceState(null, "", "/dashboard" + (query ? "?" + query : ""));
  }, [activeNav, activeAgentId, activeChatId, demoMode]);

  const isOnline = useOnlineStatus();
  const [offlineStats, setOfflineStats] = useState<DashboardStats | null>(null);
  const [offlineStatsCachedAt, setOfflineStatsCachedAt] = useState<number | null>(null);

  // Overview stats — disabled in demo mode (zero API requests)
  const { stats, isLoading: statsLoading } = useDashboardStats(demoMode);

  // Write-through: cache stats when online data arrives
  useEffect(() => {
    if (demoMode || !isOnline || !stats) return;
    saveAgroCache("dashboard_stats", stats).catch(() => {});
  }, [stats, isOnline, demoMode]);

  // Read cached stats when offline
  useEffect(() => {
    if (demoMode || isOnline) return;
    getAgroCache<DashboardStats>("dashboard_stats").then(r => {
      if (r) { setOfflineStats(r.data); setOfflineStatsCachedAt(r.cachedAt); }
    }).catch(() => {});
  }, [isOnline, demoMode]);

  const displayStats = isOnline ? stats : offlineStats;

  // Activity feed — disabled in demo mode (zero API requests)
  const { activities, isLoading: activityLoading } = useActivity(7, 20, demoMode);
  const [offlineActivities, setOfflineActivities] = useState<ActivityItem[]>([]);
  const [offlineActivitiesCachedAt, setOfflineActivitiesCachedAt] = useState<number | null>(null);

  // Write-through: cache activity when online data arrives
  useEffect(() => {
    if (demoMode || !isOnline || activities.length === 0) return;
    saveAgroCache("activity", activities).catch(() => {});
  }, [activities, isOnline, demoMode]);

  // Read cached activity when offline
  useEffect(() => {
    if (demoMode || isOnline) return;
    getAgroCache<ActivityItem[]>("activity").then(r => {
      if (r) { setOfflineActivities(r.data); setOfflineActivitiesCachedAt(r.cachedAt); }
    }).catch(() => {});
  }, [isOnline, demoMode]);

  const displayActivities = isOnline ? activities : offlineActivities;

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

  // Recent agents — real API data in production, demo data in demo mode
  const { agents: apiAgents } = useAgents("", 1, 5, demoMode);
  const recentAgents = demoMode
    ? DEMO_AGENTS.slice(0, 3)
    : (apiAgents ?? []).slice(0, 5);
  const { conversations: apiRecentChats } = useConversations("", 1, recentChatsLimit + 1, demoMode);
  const recentChats = demoMode
    ? DEMO_DASHBOARD_CHATS.slice(0, recentChatsLimit + 1)
    : apiRecentChats.slice(0, recentChatsLimit + 1);
  const visibleRecentChats = recentChats.slice(0, recentChatsLimit);
  const hasMoreRecentChats = recentChats.length > recentChatsLimit;

  const handleAllChatsClick = () => {
    setActiveChatId(null);
    setChatListResetKey((value) => value + 1);
    setActiveNav("chats");
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

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
        <div className="flex-1 min-h-0 px-2 pt-3 overflow-hidden flex flex-col">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              (() => {
                const isNavActive =
                  item.id === "chats"
                    ? activeNav === "chats" && !activeChatId
                    : activeNav === item.id;

                return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "chats") {
                    setActiveChatId(null);
                    setChatListResetKey((value) => value + 1);
                  }
                  setActiveNav(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`group relative w-full flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg transition-colors ${
                  !sidebarOpen ? 'justify-center' : ''
                } ${
                  isNavActive
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
                );
              })()
            ))}
          </div>

          {/* Recent Agents Section */}
          {sidebarOpen && (
            <div className="mt-4 min-h-0 flex-1 flex flex-col">
              {/* Recent Agents label — text-sm mobile (14px), text-[11px] desktop */}
              <div className="text-[11px] standalone:text-sm lg:text-[11px] text-cultivate-text-secondary px-2 mb-1.5">
                Recent Agents
              </div>
              {/* space-y-2 on mobile for breathing room, tight on desktop */}
              <div className="flex-shrink-0 space-y-0.5 standalone:space-y-2 lg:space-y-0.5">
                {recentAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => { setActiveAgentId(agent.id); setActiveNav("agent-edit"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={`group flex items-stretch rounded-lg transition-colors cursor-pointer overflow-hidden ${
                      activeNav === "agent-edit" && activeAgentId === agent.id
                        ? "bg-cultivate-bg-hover"
                        : "hover:bg-cultivate-bg-hover"
                    }`}
                  >
                    <span className={`block flex-1 min-w-0 truncate ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm pl-2 py-2 ${
                      activeNav === "agent-edit" && activeAgentId === agent.id
                        ? "text-white"
                        : "text-cultivate-text-primary group-hover:text-white"
                    }`}>
                      {agent.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] standalone:text-sm lg:text-[11px] text-cultivate-text-secondary px-2 mt-4 mb-1.5">
                Recent Chats
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
                <div className="space-y-0.5 standalone:space-y-2 lg:space-y-0.5">
                {visibleRecentChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setActiveNav("chats");
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`group flex items-stretch rounded-lg transition-colors cursor-pointer overflow-hidden ${
                      activeChatId === chat.id
                        ? "bg-cultivate-bg-hover"
                        : "hover:bg-cultivate-bg-hover"
                    }`}
                  >
                    <span className={`block flex-1 min-w-0 truncate ${isStandalone ? "text-lg" : "text-sm"} lg:text-sm pl-2 py-2 ${
                      activeChatId === chat.id
                        ? "text-white"
                        : "text-cultivate-text-primary group-hover:text-white"
                    }`}>
                      {chat.title}
                    </span>
                  </div>
                ))}
                </div>
                {hasMoreRecentChats && (
                  <button
                    onClick={handleAllChatsClick}
                    className="mt-1.5 w-full flex items-center gap-2 px-2 py-1.5 text-sm standalone:text-base lg:text-sm text-cultivate-text-secondary hover:text-white hover:bg-cultivate-bg-hover rounded-lg transition-colors"
                  >
                    <CircleEllipsis className="w-4 h-4 flex-shrink-0" />
                    All chats
                  </button>
                )}
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
            {sidebarOpen && !isStandalone && (
              <div className="flex items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInstallModal(true); }}
                  className="p-1.5 border border-cultivate-border-element hover:border-cultivate-button-primary rounded-md transition-colors text-cultivate-text-secondary hover:text-cultivate-text-primary"
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
                <button
                  onClick={() => { setActiveNav("settings"); setShowUserMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover hover:text-white flex items-center gap-2 transition-colors rounded"
                >
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
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-serif text-cultivate-text-primary mb-0.5">
                        Welcome, {user.name?.split(" ")[0]}
                      </h1>
                      {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-cultivate-text-secondary">Manage your AI agents and knowledge bases</p>
                  </div>
                </div>
                <div className="hidden lg:block mb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-serif text-cultivate-text-primary">
                      Welcome, {user.name?.split(" ")[0]}
                    </h1>
                    {!isOnline && <WifiOff className="w-4 h-4 text-cultivate-text-tertiary flex-shrink-0" />}
                  </div>
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
              {!isOnline && offlineStatsCachedAt && (
                <p className="text-xs text-cultivate-text-tertiary mb-3 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cultivate-text-tertiary" />
                  Last updated {formatCacheAge(offlineStatsCachedAt)}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onClick={() => setActiveNav("agents")} className="bg-cultivate-bg-elevated rounded-xl p-5 text-left hover:border-cultivate-green-light border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cultivate-text-secondary">Active Agents</span>
                    <div className="w-9 h-9 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-cultivate-green-light" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">
                    {demoMode ? DEMO_AGENTS.filter(a => a.isActive).length : statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-cultivate-text-tertiary" /> : (displayStats?.activeAgents ?? "—")}
                  </p>
                </button>

                <button onClick={() => setActiveNav("knowledge")} className="bg-cultivate-bg-elevated rounded-xl p-5 text-left hover:border-cultivate-teal border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cultivate-text-secondary">Knowledge Docs</span>
                    <div className="w-9 h-9 bg-cultivate-teal/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-cultivate-teal" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">
                    {demoMode ? 45 : statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-cultivate-text-tertiary" /> : (displayStats?.knowledgeDocs ?? "—")}
                  </p>
                </button>

                <button onClick={() => setActiveNav("flagged")} className="bg-cultivate-bg-elevated rounded-xl p-5 text-left hover:border-cultivate-beige border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-cultivate-text-secondary">Pending Flags</span>
                    <div className="w-9 h-9 bg-cultivate-beige/20 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-cultivate-beige" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">
                    {demoMode ? 6 : statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-cultivate-text-tertiary" /> : (displayStats?.pendingFlags ?? "—")}
                  </p>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-sm text-cultivate-text-secondary mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={() => setActiveNav("agents")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-cultivate-green-light transition-colors text-left">
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

                  <button onClick={() => setActiveNav("knowledge")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-cultivate-teal transition-colors text-left">
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

                  <button onClick={() => setActiveNav("flagged")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-cultivate-beige transition-colors text-left">
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

                  <button onClick={() => setActiveNav("analytics")} className="group p-4 bg-cultivate-bg-elevated rounded-xl border border-cultivate-border-element hover:border-cultivate-green-dark transition-colors text-left">
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
                {!isOnline && offlineActivitiesCachedAt
                  ? <span className="text-xs text-cultivate-text-tertiary flex items-center gap-1"><span className="inline-block w-1 h-1 rounded-full bg-cultivate-text-tertiary" />Last updated {formatCacheAge(offlineActivitiesCachedAt)}</span>
                  : <span className="text-xs text-cultivate-text-tertiary">Last 7 days</span>
                }
              </div>
              </div>

              {/* PART 2: Scrollable Recent Activity List */}
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pb-6">
              <div className="mr-3">

                {/* Loading state — only in real mode, only when online */}
                {!demoMode && isOnline && activityLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-cultivate-text-tertiary animate-spin" />
                  </div>
                )}

                {/* Demo mode: activity from DEMO_ACTIVITY using the same ActivityRow as real mode */}
                {demoMode && DEMO_ACTIVITY.map((item, i) => (
                  <ActivityRow key={i} item={item} isStandalone={isStandalone} />
                ))}

                {/* Real mode: dynamic activity items (online = fresh, offline = cached) */}
                {!demoMode && !activityLoading && displayActivities.map((item: ActivityItem, i: number) => (
                  <ActivityRow key={i} item={item} isStandalone={isStandalone} />
                ))}

                {/* Empty state — real mode, no activity */}
                {!demoMode && !activityLoading && displayActivities.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-cultivate-text-tertiary">
                      {isOnline ? "No activity in the last 7 days." : "No cached activity."}
                    </p>
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

          {activeNav === "chats" && (
            <ChatsView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              demoMode={demoMode}
              initialChatId={activeChatId}
              onChatSelect={setActiveChatId}
              listResetKey={chatListResetKey}
            />
          )}
          {/* demoMode disables SWR fetch — view uses local mockAgents instead */}
          {activeNav === "agents" && (
            <AgentsView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              demoMode={demoMode}
              onEditAgent={(id) => { setActiveAgentId(id); setActiveNav("agent-edit"); }}
            />
          )}
          {activeNav === "agent-edit" && (
            <AgentEditView
              agentId={activeAgentId}
              demoMode={demoMode}
              onManageKnowledgeBases={(agentId) => {
                setActiveKnowledgeAgentId(agentId);
                setActiveNav("knowledge");
              }}
              onBack={() => { setActiveAgentId(null); setActiveNav("agents"); }}
            />
          )}
          {activeNav === "knowledge" && (
            <KnowledgeView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              initialAgentFilter={activeKnowledgeAgentId}
              demoMode={demoMode}
            />
          )}
          {/* demoMode disables SWR fetch — view uses initialFlagged local state */}
          {activeNav === "flagged" && (
            <FlaggedView
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              demoMode={demoMode}
              onOpenChat={(conversationId) => {
                setActiveChatId(conversationId);
                setActiveNav("chats");
              }}
            />
          )}

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

          {activeNav === "settings" && (
            <SettingsView
              user={user}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              onBack={() => setActiveNav("overview")}
            />
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
                {!isOnline && offlineActivitiesCachedAt
                  ? <p className="text-xs text-cultivate-text-tertiary mt-0.5 flex items-center gap-1"><span className="inline-block w-1 h-1 rounded-full bg-cultivate-text-tertiary" />Last updated {formatCacheAge(offlineActivitiesCachedAt)}</p>
                  : <p className="text-xs text-cultivate-text-secondary mt-0.5">Last 30 days</p>
                }
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
              {/* Demo mode: activity from DEMO_ACTIVITY using the same ActivityRow as real mode */}
              {demoMode && DEMO_ACTIVITY.map((item, i) => (
                <ActivityRow key={i} item={item} isStandalone={isStandalone} />
              ))}

              {/* Real mode: same activities array fetched for the overview — no second API call */}
              {!demoMode && activityLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-cultivate-text-tertiary animate-spin" />
                </div>
              )}
              {!demoMode && !activityLoading && displayActivities.map((item: ActivityItem, i: number) => (
                <ActivityRow key={i} item={item} isStandalone={isStandalone} />
              ))}
              {!demoMode && !activityLoading && displayActivities.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-cultivate-text-tertiary">
                    {isOnline ? "No activity in the last 30 days." : "No cached activity."}
                  </p>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-3 border-t border-cultivate-border-subtle">
              <button
                type="button"
                onClick={handleCloseActivityPanel}
                className="w-full px-4 py-2 text-sm text-cultivate-text-primary hover:text-white border border-cultivate-border-element rounded-lg hover:border-cultivate-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          </div>
        </>
      )}

      {/* PWA Install Modal */}
      <PWAInstallModal open={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
}
