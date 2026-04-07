/**
 * Themed toast helpers — dark bg, green/red accent, consistent with design system.
 * Use these instead of calling `toast.success/error` directly.
 */
import toast from "react-hot-toast";

const BASE = {
  duration: 3000,
  style: {
    background: "#2B2B2B",
    color: "#C2C0B6",
    border: "1px solid #3B3B3B",
    borderRadius: "10px",
    fontSize: "14px",
  },
};

export const notify = {
  success: (message: string) =>
    toast.success(message, {
      ...BASE,
      iconTheme: { primary: "#85b878", secondary: "#2B2B2B" },
    }),
  error: (message: string) =>
    toast.error(message, {
      ...BASE,
      duration: 4000,
      iconTheme: { primary: "#f87171", secondary: "#2B2B2B" },
    }),
};
