/**
 * GlassCircleButton
 *
 * Reusable glass morphism circle button — a core Cultivate mobile UI pattern.
 * Use for floating / header icon buttons that sit over content (back, new chat, etc.)
 *
 * Anatomy:
 *   - Fill:        bg-white/[0.08]  — frosted 8% white overlay
 *   - Hover fill:  bg-white/[0.13]  — brightens on press
 *   - Blur:        backdrop-blur-sm — blurs content behind circle for depth
 *   - Border:      border-white/10  — thin glass edge ring
 *   - Shape:       rounded-full     — always a perfect circle
 *
 * Sizes (use `size` prop — maps to Tailwind w/h classes):
 *   sm  → w-9  h-9  (36px) — compact contexts
 *   md  → w-11 h-11 (44px) — default, header-level buttons  ← default
 *   lg  → w-13 h-13 (52px) — prominent FABs
 *
 * Icon inside should be text-white, w-4/w-5 depending on size.
 *
 * See DESIGN-SYSTEM.md § "Glass Morphism Circle Pattern" for full spec.
 */

import { ButtonHTMLAttributes } from "react";

type GlassCircleSize = "sm" | "md" | "lg";

const sizeClasses: Record<GlassCircleSize, string> = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-[52px] h-[52px]",
};

interface GlassCircleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: GlassCircleSize;
}

export default function GlassCircleButton({
  size = "md",
  className = "",
  children,
  ...props
}: GlassCircleButtonProps) {
  return (
    <button
      {...props}
      className={`${sizeClasses[size]} flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.13] backdrop-blur-sm border border-white/10 rounded-full transition-colors flex-shrink-0 ${className}`}
    >
      {children}
    </button>
  );
}
