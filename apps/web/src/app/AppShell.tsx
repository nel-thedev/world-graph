import type { ReactNode } from "react";

export function AppShell(props: {
  topLeft: ReactNode;
  left: ReactNode;
  right: ReactNode;
  center: ReactNode;
}) {
  return (
    <div style={{
      position: "relative",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" // Subtle gradient
    }}>
      {/* Graph background */}
      <div style={{ position: "absolute", inset: 0 }}>{props.center}</div>

      <div style={{ position: "absolute", top: 16, left: 16, width: 420, zIndex: 30, display: "flex", flexDirection: "column", gap: 12 }}>
        {props.topLeft}
        {props.left}
      </div>

      {/* Right panel */}
      <div style={{ position: "absolute", top: 16, right: 16, width: 420, zIndex: 10 }}>
        {props.right}
      </div>
    </div>
  );
}
