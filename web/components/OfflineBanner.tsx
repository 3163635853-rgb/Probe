"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function handleOffline() { setOffline(true); }
    function handleOnline() { setOffline(false); }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-destructive py-2 text-center text-sm text-destructive-foreground font-medium">
      网络已断开，请检查连接
    </div>
  );
}
