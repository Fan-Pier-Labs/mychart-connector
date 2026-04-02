"use client";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";

export function ProfileCard() {
  const ctx = useAppContext();

  if (!ctx.activeSessionKey || !ctx.profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ctx.profile.name}</CardTitle>
        <CardDescription>
          Connected to {ctx.hostname}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Date of Birth</span>
            <p className="font-medium">{ctx.profile.dob}</p>
          </div>
          <div>
            <span className="text-muted-foreground">MRN</span>
            <p className="font-medium">{ctx.profile.mrn}</p>
          </div>
          {ctx.profile.pcp && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Primary Care Provider</span>
              <p className="font-medium">{ctx.profile.pcp}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
