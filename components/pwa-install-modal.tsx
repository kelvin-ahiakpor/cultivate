"use client";

import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";

// iOS share icon (matches the actual Safari share button)
function IOSShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 inline-block align-text-bottom"
      aria-hidden
    >
      <path d="M8.5 5.5 12 2l3.5 3.5" />
      <path d="M12 2v13" />
      <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
    </svg>
  );
}

// Step row used across platforms
function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cultivate-bg-elevated border border-cultivate-border-element text-xs font-medium text-cultivate-text-secondary flex items-center justify-center mt-px">
        {num}
      </span>
      <p className="text-sm text-cultivate-text-secondary leading-snug">{children}</p>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PWAInstallModal({ open, onClose }: Props) {
  const { platform, canNativeInstall, triggerInstall } = usePWAInstall();

  const handleInstall = async () => {
    if (canNativeInstall) {
      await triggerInstall();
    }
    onClose();
  };

  const isIOS = platform === "ios";
  const isAndroid = platform === "android";
  const isDesktop = platform === "desktop";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="bg-cultivate-bg-sidebar border border-cultivate-border-subtle rounded-xl p-5 w-80 shadow-xl"
      >
        <DialogTitle className="sr-only">Install Cultivate</DialogTitle>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-cultivate-button-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-semibold text-base">Install Cultivate</h2>
          </div>
          <p className="text-cultivate-text-secondary text-sm leading-relaxed">
            {isIOS
              ? "Add to your home screen for quick access and offline support."
              : isAndroid
              ? "Install the app for quick access and offline support."
              : "Install Cultivate for quick access and offline support."}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-2.5 mb-4">
          {isIOS && (
            <>
              <Step num={1}>
                Tap the <IOSShareIcon /> <span className="text-white font-medium">Share</span> button at the bottom of Safari.
              </Step>
              <Step num={2}>
                Scroll down and tap <span className="text-white font-medium">&ldquo;Add to Home Screen&rdquo;</span>.
              </Step>
              <Step num={3}>
                Tap <span className="text-white font-medium">Add</span> in the top-right corner.
              </Step>
            </>
          )}

          {isAndroid && canNativeInstall && (
            <>
              <Step num={1}>Tap <span className="text-white font-medium">Install</span> below.</Step>
              <Step num={2}>Confirm in the browser prompt that appears.</Step>
              <Step num={3}>Find <span className="text-white font-medium">Cultivate</span> on your home screen.</Step>
            </>
          )}

          {isAndroid && !canNativeInstall && (
            <>
              <Step num={1}>
                Tap the <span className="text-white font-medium">⋮</span> menu in your browser.
              </Step>
              <Step num={2}>
                Tap <span className="text-white font-medium">&ldquo;Add to Home screen&rdquo;</span> or <span className="text-white font-medium">&ldquo;Install app&rdquo;</span>.
              </Step>
              <Step num={3}>
                Tap <span className="text-white font-medium">Add</span> to confirm.
              </Step>
            </>
          )}

          {isDesktop && canNativeInstall && (
            <>
              <Step num={1}>Tap <span className="text-white font-medium">Install</span> below.</Step>
              <Step num={2}>Confirm in the browser prompt.</Step>
              <Step num={3}><span className="text-white font-medium">Cultivate</span> opens as its own window.</Step>
            </>
          )}

          {isDesktop && !canNativeInstall && (
            <>
              <Step num={1}>
                Look for the <span className="text-white font-medium">install icon</span> <span className="text-cultivate-text-tertiary text-xs">(⊕)</span> in the browser address bar.
              </Step>
              <Step num={2}>
                Click it and select <span className="text-white font-medium">&ldquo;Install&rdquo;</span>.
              </Step>
              <Step num={3}>
                <span className="text-white font-medium">Cultivate</span> opens as its own window.
              </Step>
            </>
          )}

          {platform === "other" && (
            <p className="text-sm text-cultivate-text-secondary leading-relaxed">
              Use your browser&apos;s menu to find an <span className="text-white font-medium">&ldquo;Add to Home Screen&rdquo;</span> or <span className="text-white font-medium">&ldquo;Install&rdquo;</span> option.
            </p>
          )}
        </div>

        {/* Actions */}
        {canNativeInstall && (
          <div className="flex justify-end">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-cultivate-button-primary hover:bg-cultivate-button-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Install
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
