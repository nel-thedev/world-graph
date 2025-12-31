import type { Focus } from "../app/types";
import { Panel } from "./Panel";

export function LeftPanel(props: { focus: Focus | null }) {
  return (
    <Panel title="Context">
      {!props.focus ? (
        <div style={{ opacity: 0.7 }}>Search a person to begin.</div>
      ) : (
        <div>
          <div style={{ fontWeight: 800 }}>
            Focus: {props.focus.kind} — {props.focus.label ?? props.focus.id}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            {props.focus.id}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
            (Later: breadcrumbs, timeline, filters)
          </div>
        </div>
      )}
    </Panel>
  );
}
