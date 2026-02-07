"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Bot, BookOpen, Flag, BarChart3,
  Plus, ChevronDown, Settings, HelpCircle, LogOut,
  PanelLeft, MoreHorizontal, Upload, Eye,
} from "lucide-react";
import { signOut } from "next-auth/react";
import AgentsView from "./views/agents-view";
import KnowledgeView from "./views/knowledge-view";
import FlaggedView from "./views/flagged-view";

interface DashboardProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function DashboardClient({ user }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeNav, setActiveNav] = useState("overview");

  const getInitials = (name: string) => {
    return name[0]?.toUpperCase() || "U";
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
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
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`group relative w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                  !sidebarOpen ? 'justify-center' : ''
                } ${
                  activeNav === item.id
                    ? 'bg-[#141413] text-white'
                    : 'text-[#C2C0B6] hover:bg-[#141413] hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#2B2B2B] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Recent Agents Section */}
          {sidebarOpen && (
            <div className="mt-4">
              <div className="text-[11px] text-[#9C9A92] px-2 mb-1.5">
                Recent Agents
              </div>
              <div className="space-y-0.5">
                {recentAgents.map((agent) => (
                  <div key={agent} className="group flex items-stretch rounded-lg hover:bg-[#141413] has-[button:hover]:bg-transparent transition-colors cursor-pointer">
                    <span className="flex-1 truncate text-sm text-[#C2C0B6] group-hover:text-white flex items-center pl-2 py-2">
                      {agent}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-2 hover:bg-[#141413] rounded-lg flex items-center">
                      <MoreHorizontal className="w-4 h-4 text-[#C2C0B6]" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
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
                    {user.role === "ADMIN" ? "Admin" : "Agronomist"}
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <ChevronDown className={`w-4 h-4 text-[#C2C0B6] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            )}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="max-w-5xl w-full mx-auto px-8 py-8">
          {activeNav === "overview" && (
            <>
              {/* Greeting */}
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-[#C2C0B6] mb-1">
                  Welcome, {user.name?.split(" ")[0]}
                </h1>
                <p className="text-sm text-[#9C9A92]">
                  Manage your AI agents and knowledge bases
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onClick={() => setActiveNav("agents")} className="bg-[#2B2B2B] rounded-xl p-5 text-left hover:border-[#85b878] border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[#9C9A92]">Active Agents</span>
                    <div className="w-9 h-9 bg-[#85b878]/20 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-[#85b878]" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">0</p>
                </button>

                <button onClick={() => setActiveNav("knowledge")} className="bg-[#2B2B2B] rounded-xl p-5 text-left hover:border-[#608e96] border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[#9C9A92]">Knowledge Docs</span>
                    <div className="w-9 h-9 bg-[#608e96]/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[#608e96]" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">0</p>
                </button>

                <button onClick={() => setActiveNav("flagged")} className="bg-[#2B2B2B] rounded-xl p-5 text-left hover:border-[#e8c8ab] border border-transparent transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[#9C9A92]">Pending Flags</span>
                    <div className="w-9 h-9 bg-[#e8c8ab]/20 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-[#e8c8ab]" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-white">0</p>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-sm text-[#9C9A92] mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={() => setActiveNav("agents")} className="group p-4 bg-[#2B2B2B] rounded-xl border border-[#3B3B3B] hover:border-[#85b878] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#85b878]/20 rounded-lg flex items-center justify-center group-hover:bg-[#85b878]/30 transition-colors">
                        <Plus className="w-5 h-5 text-[#85b878]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#C2C0B6]">Create New Agent</p>
                        <p className="text-xs text-[#6B6B6B]">Set up a new AI agent with custom knowledge</p>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setActiveNav("knowledge")} className="group p-4 bg-[#2B2B2B] rounded-xl border border-[#3B3B3B] hover:border-[#608e96] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#608e96]/20 rounded-lg flex items-center justify-center group-hover:bg-[#608e96]/30 transition-colors">
                        <Upload className="w-5 h-5 text-[#608e96]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#C2C0B6]">Upload Knowledge Base</p>
                        <p className="text-xs text-[#6B6B6B]">Add PDFs or documents to train your agents</p>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setActiveNav("flagged")} className="group p-4 bg-[#2B2B2B] rounded-xl border border-[#3B3B3B] hover:border-[#e8c8ab] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#e8c8ab]/20 rounded-lg flex items-center justify-center group-hover:bg-[#e8c8ab]/30 transition-colors">
                        <Eye className="w-5 h-5 text-[#e8c8ab]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#C2C0B6]">Review Flagged Queries</p>
                        <p className="text-xs text-[#6B6B6B]">Check low-confidence farmer questions</p>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setActiveNav("analytics")} className="group p-4 bg-[#2B2B2B] rounded-xl border border-[#3B3B3B] hover:border-[#536d3d] transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#536d3d]/20 rounded-lg flex items-center justify-center group-hover:bg-[#536d3d]/30 transition-colors">
                        <BarChart3 className="w-5 h-5 text-[#536d3d]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#C2C0B6]">View Analytics</p>
                        <p className="text-xs text-[#6B6B6B]">See usage stats and API costs</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-sm text-[#9C9A92] mb-3">Recent Activity</h2>
                <div className="bg-[#2B2B2B] rounded-xl p-6 text-center">
                  <p className="text-sm text-[#6B6B6B]">No activity yet. Create your first agent to get started.</p>
                </div>
              </div>
            </>
          )}

          {activeNav === "agents" && <AgentsView />}
          {activeNav === "knowledge" && <KnowledgeView />}
          {activeNav === "flagged" && <FlaggedView sidebarOpen={sidebarOpen} />}

          {activeNav === "analytics" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-serif text-[#C2C0B6]">Analytics</h1>
                <p className="text-sm text-[#9C9A92] mt-1">Usage stats and insights</p>
              </div>
              <div className="bg-[#2B2B2B] rounded-xl p-8 text-center">
                <BarChart3 className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
                <p className="text-sm text-[#6B6B6B]">Analytics coming soon.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
