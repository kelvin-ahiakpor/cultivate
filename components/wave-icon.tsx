/**
 * Wave Icon for Voice Input
 * Matches Claude.ai's voice mode icon
 */

export function WaveIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 10H5M8 7V13M11 4V16M14 7V13M17 10H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Animated Dots for Connecting/Listening states
 */
export function AnimatedDots({ type }: { type: "pulse" | "wave" }) {
  if (type === "pulse") {
    // Connecting: dots pulse left to right
    return (
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
    );
  }

  // Listening: dots wave up and down
  return (
    <div className="flex items-center gap-0.5 h-5">
      <div className="w-1 bg-white rounded-full animate-wave-1" style={{ animationDelay: "0ms" }} />
      <div className="w-1 bg-white rounded-full animate-wave-2" style={{ animationDelay: "150ms" }} />
      <div className="w-1 bg-white rounded-full animate-wave-3" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
