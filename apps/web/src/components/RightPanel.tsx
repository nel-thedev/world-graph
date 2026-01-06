import { useEffect, useState } from "react";
import type { Focus, GraphDTO } from "../app/types";
import { Panel } from "./Panel";
import { analyzeGraph } from "../app/graphAnalysis";
import { fetchEntityDetails, type EntityDetails } from "../api/entities";

export function RightPanel(props: {
  focus: Focus | null;
  graph: GraphDTO | null;
  onFocus: (focus: Focus) => void;
}) {
  const { topPeople, topEvents } = analyzeGraph(props.graph, props.focus);

  const [details, setDetails] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!props.focus) {
      setDetails(null);
      return;
    }

    let active = true;
    setLoading(true);
    // Don't clear immediately to avoid flickering if switching between nodes? 
    // Actually, distinct nodes should probably clear to show we are fetching new data.
    setDetails(null);

    fetchEntityDetails(props.focus.id)
      .then((d) => {
        if (active) {
          setDetails(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch details", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [props.focus?.id]);

  return (
    <Panel title="Details">
      {!props.focus ? (
        <div style={{ opacity: 0.7 }}>Select a node to see details.</div>
      ) : (
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
            {props.focus.label ?? props.focus.id}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {props.focus.kind}
          </div>

          {/* Details Section */}
          <div style={{ marginTop: 16 }}>
            {loading ? (
              <div style={{ opacity: 0.5, fontSize: 13, fontStyle: "italic" }}>Loading details...</div>
            ) : details ? (
              <div className="details-fade-in">
                {details.shortDescription && (
                  <div style={{ fontSize: 14, fontStyle: "italic", marginBottom: 8, color: "#555" }}>
                    {details.shortDescription}
                  </div>
                )}

                {details.summary ? (
                  <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
                    {details.summary}
                  </div>
                ) : (
                  <div style={{ opacity: 0.5, fontSize: 13, padding: "10px 0" }}>
                    No summary available.
                  </div>
                )}

                {details.wikipediaUrl && (
                  <a
                    href={details.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#666", textDecoration: "none", borderBottom: "1px dotted #999" }}
                  >
                    Read on Wikipedia →
                  </a>
                )}
              </div>
            ) : (
              <div style={{ opacity: 0.5, fontSize: 13 }}>Could not load details.</div>
            )}
          </div>

          <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #eee" }} />

          {/* Connections Section */}
          <div>
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
                      borderRadius: 8,
                      border: "1px solid #eee",
                      background: "white",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</div>
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
                      borderRadius: 8,
                      border: "1px solid #eee",
                      background: "white",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.label}</div>
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
