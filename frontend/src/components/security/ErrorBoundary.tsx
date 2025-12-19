import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Avoid logging potentially sensitive error details in production
    if (import.meta.env.DEV) {
      // In dev, surface minimal info
      // eslint-disable-next-line no-console
      console.error("Unhandled UI error", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="max-w-md rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
            Something went wrong. Please refresh the page.
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
