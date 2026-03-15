/**
 * Mastra Agent Builder for Cultivate
 *
 * Creates dynamic AI agents with configurable system prompts, tools, and user context.
 * Follows Mastra framework pattern (MASTRA-GUIDE.md Section 2).
 */

import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { getWeatherTool } from "@/lib/tools/weather";

interface AgentConfig {
  systemPrompt: string;
  responseStyle?: string;
  knowledgeContext?: string;
  userContext: {
    location?: string;
    coordinates?: string;
    name?: string;
  };
}

/**
 * Builds a Mastra Agent with weather tool access
 *
 * @param config - Agent configuration (system prompt, user context, etc.)
 * @returns Configured Mastra Agent ready for chat
 */
export function buildAgent(config: AgentConfig) {
  const { systemPrompt, responseStyle, knowledgeContext, userContext } = config;

  // Build complete instructions combining all context
  const instructions = buildInstructions(
    systemPrompt,
    responseStyle,
    knowledgeContext,
    userContext
  );

  return new Agent({
    name: "cultivate-agent",

    instructions,

    // Claude Sonnet 4.5 (same as current implementation)
    model: anthropic("claude-sonnet-4-5-20250929"),

    // Tools available to agent
    tools: {
      getWeather: getWeatherTool,
      // Future tools: searchKnowledgeBase, identifyPest, etc.
    },
  });
}

/**
 * Builds the complete agent instructions (system prompt)
 *
 * Combines: base prompt + response style + knowledge context + tool usage guidance + user context
 */
function buildInstructions(
  systemPrompt: string,
  responseStyle?: string,
  knowledgeContext?: string,
  userContext?: { location?: string; coordinates?: string; name?: string }
): string {
  let instructions = systemPrompt;

  // Add response style if provided
  if (responseStyle) {
    instructions += `\n\nCOMMUNICATION STYLE:\n${responseStyle}`;
  }

  // Add knowledge context if provided
  if (knowledgeContext) {
    instructions += `\n\nRELEVANT KNOWLEDGE:\n${knowledgeContext}`;
  }

  // Add tool usage intelligence
  instructions += `

TOOL USAGE INTELLIGENCE:
- Use getWeather() for: planting timing, harvest decisions, pest risk (when humidity/rain matters), irrigation planning, direct weather questions
- DON'T use getWeather() for: crop varieties (unless timing-related), pest identification, fertilizer advice, general how-to questions
- Simple questions you can answer directly = answer without tools
- Complex questions that need real-time data = use tools

OFFERING CAPABILITIES (Proactive Suggestions):
When relevant, mention what you CAN do:
- "I can check the current weather forecast for your area if you'd like — just let me know when you're planning to plant."
- "If you share your location, I can give you region-specific planting dates."

Be helpful but not pushy. Only suggest tool usage when it's genuinely useful.`;

  // Add user context
  if (userContext?.location || userContext?.coordinates) {
    instructions += `\n\nUSER CONTEXT:`;

    if (userContext.location) {
      instructions += `\n- Location: ${userContext.location}`;
      instructions += `\n  ✅ Use this location for region-specific advice and weather queries.`;
    }

    if (userContext.coordinates) {
      instructions += `\n- GPS Coordinates: ${userContext.coordinates}`;
    }

    if (userContext.name) {
      instructions += `\n- Farmer's name: ${userContext.name}`;
    }
  } else {
    instructions += `\n\nUSER CONTEXT:`;
    instructions += `\n- Location: Not set`;
    instructions += `\n  ❌ Ask user to share their location for personalized advice.`;
  }

  // Add guardrails (keep agent focused on farming)
  instructions += `

CONSTITUTIONAL AI GUARDRAILS:
You are an agricultural extension agent for Ghana. Your purpose is to help farmers with farming questions ONLY.

IF the user asks about topics unrelated to farming/agriculture (e.g., politics, sports, entertainment, personal advice):
1. Politely acknowledge the question
2. Gently redirect to your expertise: "I'm specifically designed to help with farming and agricultural questions. Is there anything about your crops, livestock, or farm management I can help you with today?"
3. Do NOT attempt to answer off-topic questions

Stay focused on: crops, livestock, pests, diseases, soil, fertilizer, planting, harvesting, weather, irrigation, farm tools, agricultural markets, farm management.`;

  return instructions;
}
