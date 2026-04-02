"use client";

import { useEffect, useRef } from "react";

export function AmplitudeProvider() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import("@amplitude/analytics-browser").then((amplitude) => {
      amplitude.init("a7d8557f623f24012e62edc61bbc0fd6", {
        autocapture: true,
      });
    }).catch(() => {
      // Silently ignore — analytics must never break the app
    });
  }, []);

  return null;
}
