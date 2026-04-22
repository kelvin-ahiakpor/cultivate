// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import { Serwist, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // navigationPreload disabled: StaleWhileRevalidate serves from cache immediately,
  // so preloading a network request in parallel is wasteful and can trigger iOS's
  // "no internet" error before the SW serves the cached response.
  navigationPreload: false,
  runtimeCaching: [
    // StaleWhileRevalidate for navigation: serves cached HTML immediately (no network
    // attempt), then updates the cache in background when online. This prevents iOS
    // from showing "Safari can't open the page" on offline relaunch — NetworkFirst
    // would try the network first and let iOS intercept the failure.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new StaleWhileRevalidate({
        cacheName: "pages",
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag ?? "cultivate",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      data: { url: url ?? "/" },
    })
  );
});

// Notification click — focus existing window or open new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
