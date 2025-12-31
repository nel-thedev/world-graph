import { useEffect, useRef, useState } from "react";
import type { SearchResultItem } from "../app/types";
import { Panel } from "./Panel";

export function SearchBar(props: {
  onSearch: (q: string) => Promise<SearchResultItem[]>;
  onPick: (item: SearchResultItem) => void;
}) {
  const [q, setQ] = useState("churchill");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const lastReq = useRef(0);

  useEffect(() => {
    // initial search
    void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(query: string) {
    const reqId = ++lastReq.current;
    setLoading(true);
    try {
      const r = await props.onSearch(query);
      if (reqId === lastReq.current) setResults(r);
    } finally {
      if (reqId === lastReq.current) setLoading(false);
    }
  }

  return (
    <Panel>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people / events…"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            outline: "none"
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setOpen(true);
              void runSearch(q);
            }
          }}
        />
        <button
          onClick={() => {
            setOpen(true);
            void runSearch(q);
          }}
          style={{ padding: "10px 12px", borderRadius: 10 }}
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10, maxHeight: 320, overflow: "auto" }}>
          {results.length === 0 ? (
            <div style={{ opacity: 0.7, padding: 8 }}>No results.</div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  props.onPick(r);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #eee",
                  background: "white",
                  cursor: "pointer",
                  marginBottom: 8
                }}
              >
                <div style={{ fontWeight: 800 }}>{r.name}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{r.id}</div>
              </button>
            ))
          )}
        </div>
      )}
    </Panel>
  );
}
