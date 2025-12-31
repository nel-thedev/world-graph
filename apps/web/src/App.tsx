import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Graph, GraphPayload } from "./Graph";

type Person = { id: string; name: string };

type SearchResult = {
  results: Person[];
};

type ConnectionsResult = {
  results: {
    id: string;
    name: string;
    sharedEventCount: number;
    sharedStrength: number;
  }[];
};

type SharedEventsResult = {
  results: {
    id: string;
    name: string;
    eventType: string;
    startDate: any;
    endDate?: any;
  }[];
};

type WhyResult = {
  results: {
    event: { id: string; name: string; eventType: string; startDate: any; endDate?: any };
    claimA: { id: string; relationshipType: string; status: string; score: number };
    claimB: { id: string; relationshipType: string; status: string; score: number };
    aEvidencePreview: { id: string; sourceType: string; title: string; publisher?: string; url?: string }[];
    bEvidencePreview: { id: string; sourceType: string; title: string; publisher?: string; url?: string }[];
  }[];
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function fmtDate(d: any) {
  if (!d) return "";
  // Neo4j date comes back as {year,month,day}
  if (typeof d === "string") return d;
  if (d.year && d.month && d.day) return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  return JSON.stringify(d);
}

export default function App() {
  const [query, setQuery] = useState("church");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const [connections, setConnections] = useState<ConnectionsResult["results"]>([]);
  const [selectedOther, setSelectedOther] = useState<{ id: string; name: string } | null>(null);

  const [sharedEvents, setSharedEvents] = useState<SharedEventsResult["results"]>([]);
  const [why, setWhy] = useState<WhyResult["results"]>([]);
  const [showWhy, setShowWhy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [graphData, setGraphData] = useState<GraphPayload | null>(null);

  const canLoadConnections = useMemo(() => !!selectedPerson?.id, [selectedPerson]);

  async function runSearch() {
    setError(null);
    setSearchResults([]);
    try {
      const data = await apiGet<SearchResult>(`/search?type=person&q=${encodeURIComponent(query)}&limit=15`);
      setSearchResults(data.results);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function loadConnections(personId: string) {
    setError(null);
    setConnections([]);
    setSelectedOther(null);
    setSharedEvents([]);
    setWhy([]);
    setShowWhy(false);

    try {
      const data = await apiGet<ConnectionsResult>(`/people/${encodeURIComponent(personId)}/connections?limitPeople=25`);
      setConnections(data.results);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function loadSharedEvents(aId: string, bId: string) {
    setError(null);
    setSharedEvents([]);
    setWhy([]);
    setShowWhy(false);

    try {
      const data = await apiGet<SharedEventsResult>(
        `/people/${encodeURIComponent(aId)}/shared-events/${encodeURIComponent(bId)}?limit=10`
      );
      setSharedEvents(data.results);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function loadWhy(aId: string, bId: string) {
    setError(null);
    setWhy([]);
    try {
      const data = await apiGet<WhyResult>(
        `/people/${encodeURIComponent(aId)}/why/${encodeURIComponent(bId)}?limitEvents=20`
      );
      setWhy(data.results);
      setShowWhy(true);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function loadGraph(personId: string) {
    setError(null);
    setGraphData(null);
    try {
      const data = await apiGet<GraphPayload>(`/people/${encodeURIComponent(personId)}/neighborhood?limitEvents=25&limitPeople=60`);
      setGraphData(data);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }  

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>World Graph MVP</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search person…"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button onClick={runSearch} style={{ padding: "10px 14px", borderRadius: 8 }}>
          Search
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fff3f3", border: "1px solid #ffd0d0" }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        {/* Left: search results */}
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Search results</h3>
          {searchResults.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No results.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {searchResults.map((p) => (
                <li key={p.id} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedPerson(p);
                      loadConnections(p.id);
                      loadGraph(p.id);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: selectedPerson?.id === p.id ? "2px solid #333" : "1px solid #ddd",
                      background: "white",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{p.id}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: connections */}
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            Connections {selectedPerson ? <span style={{ opacity: 0.7 }}>— {selectedPerson.name}</span> : null}
          </h3>

          {!canLoadConnections ? (
            <div style={{ opacity: 0.7 }}>Select a person to see connected people.</div>
          ) : connections.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No connections found.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {connections.map((c) => (
                <li key={c.id} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedOther({ id: c.id, name: c.name });
                      if (selectedPerson) loadSharedEvents(selectedPerson.id, c.id);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: selectedOther?.id === c.id ? "2px solid #333" : "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{c.id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800 }}>{c.sharedEventCount}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>shared events</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Shared events + Why */}
      {selectedPerson && selectedOther && (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            {selectedPerson.name} ↔ {selectedOther.name}
          </h3>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <button
              onClick={() => loadSharedEvents(selectedPerson.id, selectedOther.id)}
              style={{ padding: "10px 14px", borderRadius: 8 }}
            >
              Refresh shared events
            </button>
            <button
              onClick={() => loadWhy(selectedPerson.id, selectedOther.id)}
              style={{ padding: "10px 14px", borderRadius: 8 }}
            >
              Load full details (why)
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h4 style={{ marginTop: 0 }}>Shared events (preview)</h4>
              {sharedEvents.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Select a connected person to load shared events.</div>
              ) : (
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {sharedEvents.map((e) => (
                    <li key={e.id} style={{ marginBottom: 6 }}>
                      <b>{e.name}</b> <span style={{ opacity: 0.7 }}>({e.eventType})</span>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {fmtDate(e.startDate)}{e.endDate ? ` → ${fmtDate(e.endDate)}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 style={{ marginTop: 0 }}>Why (claims + evidence)</h4>
              {!showWhy ? (
                <div style={{ opacity: 0.7 }}>Click “Load full details (why)”.</div>
              ) : why.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No details.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {why.map((row) => (
                    <div key={row.event.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>{row.event.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {row.event.eventType} • {fmtDate(row.event.startDate)}
                        {row.event.endDate ? ` → ${fmtDate(row.event.endDate)}` : ""}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>A claim</div>
                          <div style={{ fontSize: 13 }}>
                            {row.claimA.relationshipType} • {row.claimA.status} • score {row.claimA.score}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            Evidence: {row.aEvidencePreview.length}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>B claim</div>
                          <div style={{ fontSize: 13 }}>
                            {row.claimB.relationshipType} • {row.claimB.status} • score {row.claimB.score}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            Evidence: {row.bEvidencePreview.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedPerson && (
        <div style={{
          height: 520,
          width: "100%",
          border: "1px solid #eee",
          borderRadius: 12,
          background: "white",
          cursor: "grab"
        }}>
          <h3 style={{ marginTop: 0 }}>
            Graph <span style={{ opacity: 0.7 }}>— {selectedPerson.name}</span>
          </h3>
          <Graph
            data={graphData}
            onSelectNode={(n) => {
              // For now: if you click a PERSON node, refocus to that person
              if (n.type === "person") {
                setSelectedPerson({ id: n.id, name: n.label });
                loadConnections(n.id);
                loadGraph(n.id);
              }
              // If it's an event, we can later expand event-specific view
            }}
          />
        </div>
      )}
    </div>
  );
}
