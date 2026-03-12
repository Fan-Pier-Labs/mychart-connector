'use client';

import { useEffect, useState } from 'react';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/update-check')
      .then((res) => res.json())
      .then((data: UpdateInfo) => {
        if (data.updateAvailable) setUpdate(data);
      })
      .catch(() => {
        // silently ignore
      });
  }, []);

  if (!update || dismissed) return null;

  return (
    <div className="bg-blue-600 text-white text-sm px-4 py-2 text-center flex items-center justify-center gap-2">
      <span>
        Update available: v{update.currentVersion} &rarr; v{update.latestVersion} &mdash;{' '}
        <a
          href="https://github.com/Fan-Pier-Labs/mychart-connector/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          see releases
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 hover:opacity-75 text-white font-bold"
        aria-label="Dismiss update banner"
      >
        &times;
      </button>
    </div>
  );
}
