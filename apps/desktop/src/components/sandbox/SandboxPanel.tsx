import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import type { FileEvent, SandboxZones } from "@supermuschel/shared";
import { trpc } from "../../lib/trpc.js";
import { sessionEventCountsAtom, sessionFileEventsAtom, sessionZonesAtom } from "../../stores/atoms.js";

const MAX_EVENTS = 200;

interface SandboxPanelProps {
  agentId: string;
  sandboxLevel: number;
}

// ─── Zone section ─────────────────────────────────────────────────────────────

function ZoneList({ label, paths, color }: { label: string; paths: string[]; color: string }) {
  if (paths.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {label}
      </div>
      {paths.map((p) => (
        <div
          key={p}
          title={p}
          style={{
            fontSize: 10,
            fontFamily: "JetBrains Mono, monospace",
            color: "var(--text-muted)",
            padding: "2px 4px",
            borderRadius: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            background: "var(--bg-base)",
            marginBottom: 2,
          }}
        >
          {p}
        </div>
      ))}
    </div>
  );
}

// ─── Event feed ───────────────────────────────────────────────────────────────

function EventFeed({ events }: { events: FileEvent[] }) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 11,
          opacity: 0.5,
        }}
      >
        No events yet
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {events.map((ev, i) => {
        const isBlocked = ev.type === "blocked";
        const time = new Date(ev.ts).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        // Show just the filename + one parent dir for brevity
        const parts = ev.path.split("/");
        const displayPath = parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : ev.path;

        return (
          <div
            key={`${ev.ts}-${i}`}
            title={ev.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 4px",
              borderRadius: 3,
              background: isBlocked ? "rgba(239,68,68,0.07)" : "transparent",
              borderLeft: isBlocked ? "2px solid #ef4444" : "2px solid transparent",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                opacity: 0.6,
                fontFamily: "JetBrains Mono, monospace",
                flexShrink: 0,
              }}
            >
              {time}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: isBlocked ? "#ef4444" : "#22c55e",
                flexShrink: 0,
                width: 38,
              }}
            >
              {isBlocked ? "BLOCK" : "WRITE"}
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                color: isBlocked ? "#fca5a5" : "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {displayPath}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function SandboxPanel({ agentId, sandboxLevel }: SandboxPanelProps) {
  const [events, setEvents] = useAtom(sessionFileEventsAtom(agentId));
  const [counts, setCounts] = useAtom(sessionEventCountsAtom(agentId));
  const [zones, setZones] = useAtom(sessionZonesAtom(agentId));

  // Fetch zones for this agent session
  const { data: fetchedZones } = trpc.sandbox.getZones.useQuery(
    { agentId },
    { enabled: sandboxLevel === 1, refetchOnWindowFocus: false },
  );

  // Merge fetched zones into atom
  useEffect(() => {
    if (fetchedZones) {
      setZones(fetchedZones as SandboxZones);
    }
  }, [fetchedZones, setZones]);

  // Subscribe to live file events
  trpc.sandbox.fileEvents.useSubscription(
    { agentId },
    {
      enabled: sandboxLevel === 1,
      onData: (event: FileEvent) => {
        setEvents((prev) => {
          const updated = [...prev, event];
          return updated.length > MAX_EVENTS ? updated.slice(updated.length - MAX_EVENTS) : updated;
        });
        setCounts((prev) => ({
          blocked: event.type === "blocked" ? prev.blocked + 1 : prev.blocked,
          writes: event.type === "write" ? prev.writes + 1 : prev.writes,
        }));
      },
    },
  );

  if (sandboxLevel === 0) return null;

  if (sandboxLevel >= 2) {
    return (
      <div
        style={{
          width: 260,
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          background: "var(--bg-sidebar)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          gap: 6,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
          Filesystem visibility is not available for container sandboxes.
        </div>
      </div>
    );
  }

  // Level 1: full panel
  const blockedCount = counts.blocked;
  const writeCount = counts.writes;

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--bg-sidebar)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "0.02em",
          }}
        >
          Sandbox View
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {blockedCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#ef4444",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                padding: "1px 6px",
              }}
            >
              {blockedCount} blocked
            </span>
          )}
          {writeCount > 0 && (
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                background: "var(--bg-hover)",
                borderRadius: 10,
                padding: "1px 6px",
              }}
            >
              {writeCount} writes
            </span>
          )}
        </div>
      </div>

      {/* Zones section */}
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Filesystem Zones
        </div>
        {zones ? (
          <>
            <ZoneList label="Writable" paths={zones.writable} color="#22c55e" />
            <ZoneList label="Read-Only" paths={zones.readOnly} color="#6b7280" />
            <ZoneList label="Blocked" paths={zones.blocked} color="#ef4444" />
          </>
        ) : (
          <div style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>
            Loading zones…
          </div>
        )}
      </div>

      {/* Live event feed */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          padding: "6px 10px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          Live Events
        </div>
        <EventFeed events={events} />
      </div>
    </div>
  );
}
