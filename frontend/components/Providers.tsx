"use client";

import { useEffect } from "react";
import { checkHomeAlerts, requestNotificationPermission, getPreferences } from "@/lib/notifications";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      const prefs = getPreferences();
      if (!prefs?.homeLat) return;

      // Request permission on first load if user has home set
      await requestNotificationPermission();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Check immediately on load
      await checkHomeAlerts(apiUrl);

      // Then check every 15 minutes
      const interval = setInterval(() => {
        checkHomeAlerts(apiUrl);
      }, 15 * 60 * 1000);

      return () => clearInterval(interval);
    };
    init();
  }, []);

  return <>{children}</>;
}
