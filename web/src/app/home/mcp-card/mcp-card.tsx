"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
import { useMcp } from "./use-mcp";

export function McpCard() {
  const ctx = useAppContext();
  const mcp = useMcp();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect to AI Assistant</CardTitle>
        <CardDescription>
          Generate an API key to use your health data with Claude Desktop, OpenClaw, or any MCP client. One URL works for all your MyChart accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ctx.mcpUrl ? (
          <div className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={mcp.generateApiKey}
              disabled={mcp.mcpLoading}
            >
              {mcp.mcpLoading ? "Generating..." : mcp.hasExistingKey ? "Regenerate API Key" : "Generate API Key"}
            </Button>
            {mcp.hasExistingKey && !mcp.mcpKeyGenerated && (
              <p className="text-xs text-muted-foreground text-center">
                You already have an API key. Regenerating will revoke the old one.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {mcp.mcpKeyGenerated && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                Copy this URL now — the API key is only shown once.
              </div>
            )}
            {ctx.mcpUrlSsl && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-green-600">HTTPS (for Claude Desktop)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={ctx.mcpUrlSsl} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={mcp.copyMcpSslUrl}>
                    {mcp.mcpSslCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {ctx.mcpUrlSsl && <Label className="text-xs font-medium text-muted-foreground">HTTP</Label>}
              <div className="flex gap-2">
                <Input readOnly value={ctx.mcpUrl} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={mcp.copyMcpUrl}>
                  {mcp.mcpCopied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Claude Desktop:</strong> Settings &rarr; MCP Servers &rarr; Add &rarr; paste {ctx.mcpUrlSsl ? "HTTPS " : ""}URL</p>
              <p><strong>OpenClaw:</strong> Add to your plugin config as <code>mcpUrl</code></p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={mcp.revokeApiKey}
            >
              Revoke API Key
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
