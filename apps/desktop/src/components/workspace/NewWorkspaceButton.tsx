import { useState } from "react";
import { NewWorkspaceModal } from "./NewWorkspaceModal.js";

export function NewWorkspaceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "7px 10px",
          borderRadius: 6,
          border: "1px dashed var(--border)",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.1s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.background = "var(--bg-hover)";
          el.style.color = "var(--text-primary)";
          el.style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = "transparent";
          el.style.color = "var(--text-muted)";
          el.style.borderColor = "var(--border)";
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
        New Workspace
      </button>

      {open && <NewWorkspaceModal onClose={() => setOpen(false)} />}
    </>
  );
}
