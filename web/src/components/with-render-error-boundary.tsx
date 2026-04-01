"use client";

import React from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

function renderFallback(data: unknown): React.ReactNode {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground text-xs">No data</span>;
  }
  if (Array.isArray(data)) {
    return (
      <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
  if (typeof data === "object") {
    return (
      <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
  return <span className="text-xs">{String(data)}</span>;
}

class RenderErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName: string; data?: unknown },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; componentName: string; data?: unknown }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[RenderErrorBoundary] ${this.props.componentName} threw:`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="border border-red-200 rounded-md p-3 bg-red-50 space-y-2">
          <p className="text-xs font-medium text-red-600">
            Render error in <span className="font-mono">{this.props.componentName}</span>:{" "}
            {this.state.error.message}
          </p>
          {this.props.data !== undefined && renderFallback(this.props.data)}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Direct error boundary component for wrapping arbitrary JSX blocks. */
export function ErrorBoundary({
  children,
  name,
  data,
}: {
  children: React.ReactNode;
  name: string;
  data?: unknown;
}) {
  return (
    <RenderErrorBoundary componentName={name} data={data}>
      {children}
    </RenderErrorBoundary>
  );
}

export function withRenderErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  getData?: (props: P) => unknown,
) {
  const displayName = componentName ?? WrappedComponent.displayName ?? WrappedComponent.name ?? "Component";

  function WithErrorBoundary(props: P) {
    const data = getData ? getData(props) : undefined;
    return (
      <RenderErrorBoundary componentName={displayName} data={data}>
        <WrappedComponent {...props} />
      </RenderErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withRenderErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}
