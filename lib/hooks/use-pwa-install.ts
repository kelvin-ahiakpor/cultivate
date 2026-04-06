"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PWAPlatform = "ios" | "android" | "desktop" | "other";

export interface PWAInstallState {
  platform: PWAPlatform;
  isInstalled: boolean;
  canNativeInstall: boolean;
  triggerInstall: () => Promise<void>;
}

function detectPlatform(): PWAPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
  if (isIOS) return "ios";
  const isAndroid = /android/i.test(ua);
  if (isAndroid) return "android";
  // Desktop Chrome / Edge / Brave support native install
  const isDesktop = /chrome|chromium|crios/i.test(ua) && !/mobile/i.test(ua);
  if (isDesktop) return "desktop";
  return "other";
}

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

export function usePWAInstall(): PWAInstallState {
  const [platform, setPlatform] = useState<PWAPlatform>("other");
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(detectInstalled());

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => setIsInstalled(detectInstalled());
    mediaQuery.addEventListener("change", onDisplayModeChange);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", onDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return {
    platform,
    isInstalled,
    canNativeInstall: deferredPrompt !== null,
    triggerInstall,
  };
}
