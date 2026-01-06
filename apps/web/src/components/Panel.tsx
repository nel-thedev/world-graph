import type { ReactNode } from "react";

export function Panel(props: { title?: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.4)", // Very transparent for strong glass effect
        border: "1px solid rgba(255, 255, 255, 0.8)", // Brighter border
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.3)",
        backdropFilter: "blur(20px) saturate(180%)", // Stronger blur + saturation
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {props.title ? (
        <div style={{
          fontWeight: 800,
          fontSize: 14,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 20,
          opacity: 0.5
        }}>
          {props.title}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}
