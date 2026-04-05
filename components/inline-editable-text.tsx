"use client";

import type { RefObject } from "react";
import { Loader2, Pencil } from "lucide-react";

interface InlineEditableTextProps {
  value: string;
  editing: boolean;
  isSaving?: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  buttonAriaLabel: string;
  inputRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  displayClassName?: string;
  editorClassName?: string;
}

export function InlineEditableText({
  value,
  editing,
  isSaving = false,
  onStartEdit,
  onChange,
  onConfirm,
  onCancel,
  buttonAriaLabel,
  inputRef,
  className,
  displayClassName,
  editorClassName,
}: InlineEditableTextProps) {
  return (
    <div className={className ?? "flex items-center gap-2 min-w-0"}>
      <div className="min-w-0 flex items-center gap-2 min-h-6">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => onChange(e.currentTarget.textContent || "")}
              onBlur={() => {
                if (!isSaving) void onConfirm();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onConfirm();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className={editorClassName}
            >
              {value}
            </div>
          ) : (
            <div className={displayClassName}>{value}</div>
          )}
        </div>
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          {editing ? (
            isSaving ? <Loader2 className="w-3.5 h-3.5 text-cultivate-text-secondary animate-spin" /> : null
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className="p-1 hover:bg-cultivate-bg-hover rounded-md transition-colors"
              aria-label={buttonAriaLabel}
            >
              <Pencil className="w-3.5 h-3.5 text-cultivate-text-secondary" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
