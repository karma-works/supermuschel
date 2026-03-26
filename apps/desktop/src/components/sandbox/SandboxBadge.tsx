interface Props {
  level: number;
}

const SANDBOX_CONFIG = {
  0: { label: "No Sandbox", color: "var(--sandbox-none)" },
  1: { label: "OS Sandbox", color: "var(--sandbox-os)" },
  2: { label: "Container", color: "var(--sandbox-container)" },
  4: { label: "OpenShell", color: "#76b900" },
} as Record<number, { label: string; color: string }>;

export function SandboxBadge({ level }: Props) {
  const config = SANDBOX_CONFIG[level] ?? SANDBOX_CONFIG[0];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.03em",
        background: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: config.color,
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}
