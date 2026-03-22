import React, { Component, type ReactNode, type ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { trpc, trpcClient } from "./lib/trpc.js";
import { routeTree } from "./routeTree.gen.js";
import "./styles/globals.css";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-base)",
            color: "var(--text-primary)",
            padding: 32,
            gap: 16,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: 36 }}>💥</div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 420 }}>
            {err.message}
          </p>
          <pre
            style={{
              fontSize: 10,
              color: "#6b7280",
              fontFamily: "JetBrains Mono, monospace",
              background: "#0a0d12",
              padding: "12px 16px",
              borderRadius: 8,
              maxWidth: 560,
              maxHeight: 200,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {err.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: "8px 20px",
              borderRadius: 7,
              border: "none",
              background: "var(--accent)",
              color: "white",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <JotaiProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </trpc.Provider>
      </JotaiProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
