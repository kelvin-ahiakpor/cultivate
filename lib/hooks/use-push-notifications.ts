"use client";

import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/toast";

export type PushPermission = "default" | "granted" | "denied";

export interface UsePushNotifications {
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function usePushNotifications(): UsePushNotifications {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission as PushPermission);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Check existing subscription on mount
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setIsSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return;

      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(async () => {
            const existing = await navigator.serviceWorker.getRegistration().catch(() => undefined);
            const swState = existing?.active ? "active-no-claim"
              : existing?.waiting ? "waiting"
              : existing?.installing ? "installing"
              : existing ? "redundant"
              : "none";
            reject(new Error(`sw:${swState}`));
          }, 3000)
        ),
      ]);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push subscribe failed:", err);
      const e = err as { name?: string; message?: string };
      if (e?.message?.startsWith("sw:")) {
        const swState = e.message.slice(3);
        notify.error(`Notification service unavailable (sw: ${swState}). Try closing and reopening the app.`);
      } else if (e?.name === "NotAllowedError") {
        notify.error("Notification permission was denied. Enable it in your device settings.");
      } else if (e?.name === "AbortError") {
        notify.error("Couldn't connect to the push service. Check your connection and try again.");
      } else {
        notify.error("Failed to enable notifications. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      notify.error("Failed to turn off notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
