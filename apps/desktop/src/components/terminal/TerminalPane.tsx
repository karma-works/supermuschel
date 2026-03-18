import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";
import { trpc } from "../../lib/trpc.js";

interface Props {
  agentId: string;
}

export function TerminalPane({ agentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const writeMutation = trpc.agent.write.useMutation();
  const resizeMutation = trpc.agent.resize.useMutation();

  // Subscribe to agent output
  trpc.agent.output.useSubscription(
    { agentId },
    {
      onData: (data) => {
        termRef.current?.write(data.data);
      },
    },
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      theme: {
        background: "#181d26",
        foreground: "#f0f4ff",
        cursor: "#6366f1",
        selectionBackground: "rgba(99,102,241,0.3)",
        black: "#1e2533",
        brightBlack: "#4a5568",
        red: "#fc8181",
        brightRed: "#fc8181",
        green: "#68d391",
        brightGreen: "#68d391",
        yellow: "#f6e05e",
        brightYellow: "#f6e05e",
        blue: "#63b3ed",
        brightBlue: "#63b3ed",
        magenta: "#b794f4",
        brightMagenta: "#b794f4",
        cyan: "#76e4f7",
        brightCyan: "#76e4f7",
        white: "#e2e8f0",
        brightWhite: "#f0f4ff",
      },
      allowTransparency: false,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send input to agent
    term.onData((data) => {
      writeMutation.mutate({ agentId, data });
    });

    // Handle resize
    term.onResize(({ cols, rows }) => {
      resizeMutation.mutate({ agentId, cols, rows });
    });

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
    };
  }, [agentId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#181d26",
        overflow: "hidden",
      }}
    />
  );
}
