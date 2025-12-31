import { useEffect, useState } from "react";
import { AppShell } from "../app/AppShell";
import type { Focus, GraphDTO } from "../app/types";
import { searchPeople } from "../api/search";
import { fetchNeighborhood } from "../api/graph";
import { SearchBar } from "../components/SearchBar";
import { GraphView } from "../components/GraphView";
import { LeftPanel } from "../components/LeftPanel";
import { RightPanel } from "../components/RightPanel";

export function ExplorePage() {
  const [focus, setFocus] = useState<Focus | null>(null);
  const [graph, setGraph] = useState<GraphDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When focus changes, load neighborhood graph (v1: only supports person focus)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      if (!focus) return;

      if (focus.kind !== "person") {
        // v1: if event clicked, do nothing for now (later: event neighborhood)
        return;
      }

      try {
        const dto = await fetchNeighborhood(focus.id, 25, 60);
        if (!cancelled) setGraph(dto);
      } catch (e: any) {
        if (!cancelled) setError(e.message || String(e));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  return (
    <AppShell
      topLeft={
        <SearchBar
          onSearch={async (q) => {
            const r = await searchPeople(q, 12);
            return r.results;
          }}
          onPick={(item) => setFocus({ kind: "person", id: item.id, label: item.name })}
        />
      }
      left={<LeftPanel focus={focus} />}
      right={
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error ? (
            <div
              style={{
                background: "rgba(255, 230, 230, 0.92)",
                border: "1px solid #ffc8c8",
                borderRadius: 14,
                padding: 12
              }}
            >
              <b>Error:</b> {error}
            </div>
          ) : null}
          <RightPanel focus={focus} graph={graph} onFocus={setFocus} />
        </div>
      }
      center={<GraphView graph={graph} onFocus={(f) => setFocus(f)} />}
    />
  );
}
