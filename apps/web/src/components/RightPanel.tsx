import type { Focus, GraphDTO } from "../app/types";
import { Panel } from "./Panel";
import { analyzeGraph } from "../app/graphAnalysis";

export function RightPanel(props: {
  focus: Focus | null;
  graph: GraphDTO | null;
  onFocus: (focus: Focus) => void;
}) {
  const { topPeople, topEvents, summary } = analyzeGraph(props.graph, props.focus);

  return (
    <Panel title="Details">
      {!props.focus ? (
        <div style={{ opacity: 0.7 }}>Select a node to see details.</div>
      ) : (
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{props.focus.label ?? props.focus.id}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{props.focus.kind}</div>

          {summary ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid #eee", background: "white" }}>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{summary}</div>
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Top connected people</div>
            {topPeople.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>None yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topPeople.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => props.onFocus({ kind: "person", id: p.id, label: p.label })}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #eee",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{p.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      score {Math.round(p.score * 10) / 10}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Top events</div>
            {topEvents.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>None yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => props.onFocus({ kind: "event", id: e.id, label: e.label })}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #eee",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{e.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      score {Math.round(e.score * 10) / 10}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
