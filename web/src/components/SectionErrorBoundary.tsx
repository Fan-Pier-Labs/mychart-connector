'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary that catches render errors in a section and shows a
 * fallback instead of crashing the whole page. Use this to wrap each
 * data section in scrape-results so one bad section doesn't kill the UI.
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          {this.props.section ? `Error rendering ${this.props.section}` : 'Error rendering this section'}
          {this.state.error && (
            <p className="text-xs text-red-500 mt-1">{this.state.error.message}</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
