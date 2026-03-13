"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** "pill" = compact bordered pill (sort by bar), "field" = full-width form field */
  variant?: "pill" | "field";
  className?: string;
}

/**
 * Reusable custom dropdown — dark-themed, inset hover rounded-rect (no background highlight on selection, just a ✓).
 * variant="pill": compact inline pill used in Sort by bars.
 * variant="field": full-width form field replacing <select> in modals/forms.
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  variant = "field",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  if (variant === "pill") {
    return (
      <div className={`relative flex items-center ${className}`}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#C2C0B6] border border-[#3B3B3B] hover:border-[#5a7048] transition-colors focus:outline-none"
        >
          {selected?.label ?? placeholder}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#9C9A92] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] bg-[#2B2B2B] border border-[#3B3B3B] rounded-xl shadow-xl py-1.5">
              {options.map((opt) => (
                <div key={opt.value} className="px-1.5">
                  <button
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#C2C0B6] hover:bg-[#141413] transition-colors focus:outline-none"
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && (
                      <Check className="w-3.5 h-3.5 text-[#C2C0B6] shrink-0 ml-3" />
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
        className="w-full flex items-center justify-between px-2.5 py-2 bg-[#1E1E1E] text-sm border border-[#3B3B3B] rounded-lg focus:outline-none focus:border-[#85b878] transition-colors"
      >
        <span className={selected ? "text-[#C2C0B6]" : "text-[#6B6B6B]"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#9C9A92] transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#2B2B2B] border border-[#3B3B3B] rounded-xl shadow-xl py-1.5 max-h-56 overflow-y-auto thin-scrollbar">
            {options.map((opt) => (
              <div key={opt.value} className="px-1.5">
                <button
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#C2C0B6] hover:bg-[#141413] transition-colors focus:outline-none"
                >
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 text-[#C2C0B6] shrink-0 ml-3" />
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
