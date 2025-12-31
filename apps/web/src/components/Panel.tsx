import type { ReactNode } from "react";

export function Panel(props: { title?: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        backdropFilter: "blur(6px)"
      }}
    >
      {props.title ? <div style={{ fontWeight: 800, marginBottom: 8 }}>{props.title}</div> : null}
      {props.children}
    </div>
  );
}
