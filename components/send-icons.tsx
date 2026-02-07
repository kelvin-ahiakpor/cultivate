const iconProps = {
  className: "w-5 h-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CabbageIcon() {
  return (
    <svg {...iconProps}>
      {/* Top lobe */}
      <path d="M12 3c-2.5 0-4.5 2-4.5 4.5S9.5 12 12 12s4.5-2.5 4.5-4.5S14.5 3 12 3z" />
      {/* Top-left ear */}
      <path d="M7.5 7.5c-1.8-1.5-4-1.2-4.5.8-.5 2 1 3.5 3 3.7" />
      {/* Top-right ear */}
      <path d="M16.5 7.5c1.8-1.5 4-1.2 4.5.8.5 2-1 3.5-3 3.7" />
      {/* Bottom lobe (mirrored) */}
      <path d="M12 21c2.5 0 4.5-2 4.5-4.5S14.5 12 12 12s-4.5 2.5-4.5 4.5S9.5 21 12 21z" />
      {/* Bottom-left ear (mirrored) */}
      <path d="M7.5 16.5c-1.8 1.5-4 1.2-4.5-.8-.5-2 1-3.5 3-3.7" />
      {/* Bottom-right ear (mirrored) */}
      <path d="M16.5 16.5c1.8 1.5 4 1.2 4.5-.8.5-2-1-3.5-3-3.7" />
    </svg>
  );
}

export function SproutIcon() {
  return (
    <svg {...iconProps} strokeWidth={1.8}>
      {/* Outer leaf shape */}
      <path d="M12 21c-4-1.5-7-5-7-9.5C5 7 8 4 12 3c4 1 7 4 7 8.5 0 4.5-3 8-7 9.5z" />
      {/* Center vein */}
      <path d="M12 3v18" />
      {/* Upper veins */}
      <path d="M12 8c-2 1-3.5 3-3.5 3" />
      <path d="M12 8c2 1 3.5 3 3.5 3" />
      {/* Lower veins */}
      <path d="M12 13c-2.5 1-4 2.5-4 2.5" />
      <path d="M12 13c2.5 1 4 2.5 4 2.5" />
    </svg>
  );
}

export function PaperPlaneIcon() {
  return (
    <svg {...iconProps} strokeWidth={1.8}>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

export const SEND_ICONS = [CabbageIcon, PaperPlaneIcon, SproutIcon] as const;
