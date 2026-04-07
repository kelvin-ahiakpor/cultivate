"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

export default function AppToaster() {
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsMobile(window.innerWidth < 768);
      setIsStandalone(detectStandalone());
    };

    sync();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    window.addEventListener("resize", sync);
    mediaQuery.addEventListener("change", sync);

    return () => {
      window.removeEventListener("resize", sync);
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  const topOffset = isStandalone
    ? "calc(env(safe-area-inset-top, 0px) + 12px)"
    : "16px";

  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      containerStyle={{
        top: topOffset,
        left: isMobile ? "12px" : undefined,
        right: isMobile ? "12px" : undefined,
      }}
      toastOptions={{
        style: {
          maxWidth: isMobile ? "min(92vw, 420px)" : "420px",
          width: isMobile ? "100%" : undefined,
        },
      }}
    />
  );
}
