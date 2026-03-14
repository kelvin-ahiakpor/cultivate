"use client";

import { ReactNode, useState } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-cultivate-bg-hover-extreme rounded text-xs text-white whitespace-nowrap pointer-events-none z-50">
          {content}
        </div>
      )}
    </div>
  );
}
