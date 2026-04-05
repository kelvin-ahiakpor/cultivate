/**
 * use-online-status.ts
 * Reactive hook for browser online/offline state.
 *
 * - Reads navigator.onLine for the initial value (SSR-safe)
 * - Listens to window `online`/`offline` events
 * - On reconnect: revalidates all SWR keys so data refreshes automatically
 *   (no full page reload — serwist's reloadOnOnline is disabled)
 */

import { useState, useEffect } from "react";
import { mutate } from "swr";

export function useOnlineStatus(): boolean {
  // Start as `true` to match the server render, then sync the real value
  // after mount. Using navigator.onLine as the initial value causes a
  // hydration mismatch when the client is offline (server always renders "online").
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync with actual browser state immediately after mount
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      // Revalidate all active SWR keys so sidebar + data refresh automatically
      mutate(() => true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
