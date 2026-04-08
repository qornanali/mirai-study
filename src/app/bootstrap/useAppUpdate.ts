import { useEffect, useState } from "react";

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (
        event.source instanceof ServiceWorker &&
        event.data?.type === "APP_UPDATED"
      ) {
        setUpdateAvailable(true);
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return { updateAvailable };
}
