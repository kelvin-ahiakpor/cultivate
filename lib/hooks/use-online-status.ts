/**
 * use-online-status.ts
 * Reactive hook for browser online/offline state.
 *
 * - Reads navigator.onLine for the initial value (SSR-safe)
 * - Listens to window `online`/`offline` events
 * - On reconnect: revalidates all SWR keys so data refreshes automatically
 *   (no full page reload — serwist's reloadOnOnline is disabled)
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { mutate } from "swr";
import { notify } from "@/lib/toast";

export function useOnlineStatus(): boolean {
  const isOnline = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("online", onStoreChange);
      window.addEventListener("offline", onStoreChange);

      return () => {
        window.removeEventListener("online", onStoreChange);
        window.removeEventListener("offline", onStoreChange);
      };
    },
    () => navigator.onLine,
    () => true
  );
  const previousOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (!previousOnlineRef.current && isOnline) {
      notify.success("Back online. Syncing latest updates.");
      // Revalidate all active SWR keys so sidebar + data refresh automatically
      void mutate(() => true);
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  return isOnline;
}
