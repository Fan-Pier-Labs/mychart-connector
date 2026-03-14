"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  correlateEvents,
  categoryLabel,
  categoryColor,
  type CorrelatedGroup,
  type MedicalEvent,
} from "@/lib/correlation";
import { safeText } from "@/components/data-display";
import type { ScrapeResults } from "@/types/scrape-results";

function EventBadge({ event }: { event: MedicalEvent }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor(event.category)}`}
    >
      {categoryLabel(event.category)}
    </span>
  );
}

function GroupCard({ group }: { group: CorrelatedGroup }) {
  const formattedDate = useMemo(() => {
    const d = new Date(group.date + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [group.date]);

  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm font-semibold text-muted-foreground mb-3">
        {formattedDate}
      </div>
      <div className="space-y-2">
        {group.events.map((event, i) => (
          <div
            key={`${event.category}-${event.sourceIndex}-${i}`}
            className="flex items-start gap-3"
          >
            <div className="flex-shrink-0 mt-0.5">
              <EventBadge event={event} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{safeText(event.title)}</div>
              {event.provider && (
                <div className="text-xs text-muted-foreground">
                  {safeText(event.provider)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CorrelatedTimeline({ data }: { data: ScrapeResults }) {
  const groups = useMemo(() => correlateEvents(data), [data]);

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Related Events ({groups.length} group{groups.length !== 1 ? "s" : ""})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Events linked by date and provider across visits, billing, labs,
          imaging, letters, and more.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group, i) => (
          <GroupCard key={`${group.date}-${i}`} group={group} />
        ))}
      </CardContent>
    </Card>
  );
}
