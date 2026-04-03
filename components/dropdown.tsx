"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** "pill" = compact bordered pill (sort by bar), "field" = full-width form field */
  variant?: "pill" | "field";
  className?: string;
}

/**
 * Reusable dark-themed dropdown.
 * variant="pill"  — compact inline pill used in Sort by bars.
 * variant="field" — full-width form field replacing <select> in modals/forms.
 */
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  variant = "field",
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  if (variant === "pill") {
    return (
      <div className={`relative flex items-center ${className}`}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-cultivate-text-primary border border-cultivate-border-element hover:border-[#5a7048] transition-colors focus:outline-none"
        >
          {selected?.label ?? placeholder}
          <ChevronDown
            className={`w-3.5 h-3.5 text-cultivate-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl shadow-xl py-1.5">
              {options.map((opt) => (
                <div key={opt.value} className="px-1.5">
                  <button
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover transition-colors focus:outline-none"
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && (
                      <Check className="w-3.5 h-3.5 text-cultivate-text-primary shrink-0 ml-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // variant="field"
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-2 bg-cultivate-bg-main text-sm border border-cultivate-border-element rounded-lg focus:outline-none focus:border-cultivate-green-light transition-colors"
      >
        <span className={selected ? "text-cultivate-text-primary" : "text-cultivate-text-tertiary"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-cultivate-text-secondary transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl shadow-xl py-1.5 max-h-56 overflow-y-auto thin-scrollbar">
            {options.map((opt) => (
              <div key={opt.value} className="px-1.5">
                <button
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-cultivate-text-primary hover:bg-cultivate-bg-hover transition-colors focus:outline-none"
                >
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 text-cultivate-text-primary shrink-0 ml-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
