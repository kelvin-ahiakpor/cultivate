"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bot, Loader2, Save } from "lucide-react";
import { useAgent, updateAgent } from "@/lib/hooks/use-agents";
import { DEMO_AGENTS } from "@/lib/demo-data";
import { notify } from "@/lib/toast";

interface AgentEditViewProps {
  agentId: string | null;
  onBack: () => void;
  demoMode?: boolean;
}

export default function AgentEditView({ agentId, onBack, demoMode = false }: AgentEditViewProps) {
  // Real mode: fetch via SWR. Demo mode: find in DEMO_AGENTS.
  const { agent: apiAgent, isLoading } = useAgent(demoMode ? null : agentId);
  const agent = demoMode ? DEMO_AGENTS.find(a => a.id === agentId) ?? null : apiAgent ?? null;

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [threshold, setThreshold] = useState(0.7);
  const [submitting, setSubmitting] = useState(false);

  // Populate form when agent loads
  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setPrompt(agent.systemPrompt);
    setStyle(agent.responseStyle || "");
    setThreshold(agent.confidenceThreshold);
  }, [agent]);

  const handleSave = async () => {
    if (!agentId || !name.trim() || !prompt.trim()) {
      notify.error("Please fill in all required fields");
      return;
    }
    if (demoMode) {
      notify.success("Changes saved (demo mode — not persisted)");
      onBack();
      return;
    }
    try {
      setSubmitting(true);
      await updateAgent(agentId, {
        name,
        systemPrompt: prompt,
        responseStyle: style || undefined,
        confidenceThreshold: threshold,
      });
      notify.success("Agent updated");
      onBack();
    } catch {
      notify.error("Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  };

  const loading = !demoMode && isLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 lg:px-8 pt-8 lg:pt-6 pb-4 border-b border-cultivate-border-element flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-cultivate-bg-elevated rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-cultivate-text-primary" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-cultivate-green-light/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-cultivate-green-light" />
          </div>
          <h1 className="text-base font-medium text-white truncate">
            {loading ? "Loading…" : (agent?.name ?? "Edit Agent")}
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-cultivate-text-secondary animate-spin" />
          </div>
        ) : !agent ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-cultivate-text-secondary text-sm">Agent not found.</p>
            <button onClick={onBack} className="text-sm text-cultivate-green-light hover:text-white transition-colors">
              ← Back to agents
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 space-y-5">

            {/* Agent Name */}
            <div>
              <label className="block text-sm text-cultivate-text-secondary mb-1.5">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Maize Expert"
                disabled={submitting}
                className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] disabled:opacity-40"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm text-cultivate-text-secondary mb-1.5">System Prompt</label>
              <textarea
                rows={6}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe the agent's role, expertise, and how it should respond…"
                disabled={submitting}
                className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] resize-none disabled:opacity-40"
              />
            </div>

            {/* Response Style */}
            <div>
              <label className="block text-sm text-cultivate-text-secondary mb-1.5">Response Style <span className="text-cultivate-text-tertiary">(optional)</span></label>
              <input
                type="text"
                value={style}
                onChange={e => setStyle(e.target.value)}
                placeholder="e.g. Friendly, concise, uses local examples"
                disabled={submitting}
                className="w-full px-3 py-2.5 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg text-sm text-white placeholder-[#6B6B6B] focus:outline-none focus:border-[#85b878] disabled:opacity-40"
              />
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm text-cultivate-text-secondary mb-1.5">Confidence Threshold</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={threshold}
                  onChange={e => setThreshold(parseFloat(e.target.value))}
                  disabled={submitting}
                  className="flex-1 accent-[#5a7048]"
                  style={{ background: `linear-gradient(to right, #5a7048 0%, #5a7048 ${threshold * 100}%, #3B3B3B ${threshold * 100}%, #3B3B3B 100%)` }}
                />
                <span className="text-sm text-white w-10 text-right">{threshold.toFixed(2)}</span>
              </div>
              <p className="text-xs text-cultivate-text-tertiary mt-1">Queries below this confidence will be flagged for review</p>
            </div>

            {/* Knowledge Bases */}
            <div>
              <label className="block text-sm text-cultivate-text-secondary mb-1.5">Knowledge Bases</label>
              <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-3">
                <p className="text-xs text-cultivate-text-tertiary mb-2">{agent.knowledgeBases || 0} knowledge bases assigned</p>
                <button className="text-xs text-cultivate-green-light hover:text-[#9dcf84] transition-colors">
                  Manage knowledge bases →
                </button>
              </div>
            </div>

            {/* Status info */}
            <div className="bg-cultivate-bg-elevated border border-cultivate-border-element rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Status</span>
                <span className={agent.isActive ? "text-cultivate-green-light" : "text-cultivate-text-tertiary"}>
                  {agent.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cultivate-text-secondary">Conversations</span>
                <span className="text-white">{agent.conversations || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 pb-8">
              <button
                onClick={onBack}
                disabled={submitting}
                className="px-4 py-2 text-sm text-cultivate-text-primary hover:text-white transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitting || !name.trim() || !prompt.trim()}
                className="px-4 py-2 bg-[#5a7048] text-white rounded-lg hover:bg-[#4a5d38] transition-colors text-sm disabled:opacity-40 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
