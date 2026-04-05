"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const EMPTY_OPTION_VALUE = "__cultivate_empty__";

/**
 * Reusable dark-themed dropdown backed by Radix UI Select.
 * Gains: keyboard navigation (arrows, type-ahead), aria roles, focus management.
 * External API unchanged — callers don't need to update.
 *
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
  const isPill = variant === "pill";
  const normalizedOptions = options.map((opt) => ({
    ...opt,
    value: opt.value === "" ? EMPTY_OPTION_VALUE : opt.value,
  }));
  const normalizedValue = value === "" ? EMPTY_OPTION_VALUE : value;

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) => onChange(nextValue === EMPTY_OPTION_VALUE ? "" : nextValue)}
    >
      <SelectTrigger
        className={cn(
          "gap-2 text-sm text-cultivate-text-primary border border-cultivate-border-element bg-transparent transition-colors",
          // Remove shadcn's default focus ring in favour of the border change
          "focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          isPill
            ? "w-auto px-3 py-1.5 rounded-lg hover:border-[#5a7048]"
            : "w-full px-2.5 py-2 bg-cultivate-bg-main rounded-lg focus:border-cultivate-green-light",
          className
        )}
      >
        <SelectValue
          placeholder={
            <span className="text-cultivate-text-tertiary">{placeholder}</span>
          }
        />
      </SelectTrigger>
      <SelectContent
        className={cn(
          "z-50 bg-cultivate-bg-elevated border border-cultivate-border-element rounded-xl shadow-xl py-1.5",
          isPill ? "min-w-[160px]" : ""
        )}
      >
        {normalizedOptions.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className={cn(
              // Reset shadcn defaults and apply Cultivate dark theme.
              // [&>span:first-child]:hidden hides the built-in absolute checkmark indicator
              // which otherwise reserves pr-8 (32px) on the right, making rows look right-shifted.
              "mx-1.5 px-3 py-2 rounded-lg text-sm text-cultivate-text-primary cursor-pointer",
              "focus:bg-cultivate-bg-hover focus:text-cultivate-text-primary",
              "data-[state=checked]:text-cultivate-text-primary",
              "[&>span:first-child]:hidden"
            )}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
