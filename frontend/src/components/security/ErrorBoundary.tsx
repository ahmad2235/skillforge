import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
  stack?: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Avoid logging potentially sensitive error details in production
    if (import.meta.env.DEV) {
      // In dev, surface the error and stack
      // eslint-disable-next-line no-console
      console.error("Unhandled UI error", error, info);
    }

    // Attempt to capture stack if available
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack : undefined;
    this.setState({ hasError: true, message, stack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-2xl rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
            <div className="font-semibold mb-2">Something went wrong. Please refresh the page.</div>
            {import.meta.env.DEV && (
              <details className="whitespace-pre-wrap text-xs text-red-200">
                <summary className="cursor-pointer text-sm text-red-100">Error details (dev)</summary>
                <div className="mt-2">{this.state.message}</div>
                {this.state.stack && <pre className="mt-2 text-xs">{this.state.stack}</pre>}
                <div className="mt-2">
                  <button
                    className="text-xs text-brand hover:text-brand/80 transition-colors"
                    onClick={() => {
                      const payload = `Error: ${this.state.message}\n\n${this.state.stack ?? ""}`;
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(payload);
                        // eslint-disable-next-line no-console
                        console.info("Error details copied to clipboard");
                      }
                    }}
                  >
                    Copy details
                  </button>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
