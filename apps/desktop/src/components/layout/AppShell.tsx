import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar.js";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg-base)",
        overflow: "hidden",
      }}
    >
      {/* macOS titlebar drag region */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 38,
          // @ts-ignore electron-specific
          WebkitAppRegion: "drag",
          zIndex: 9999,
        }}
      />

      <Sidebar />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-base)",
          paddingTop: 38,
        }}
      >
        {children}
      </main>
    </div>
  );
}
