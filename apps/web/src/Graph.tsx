import { useEffect, useMemo, useRef } from "react";
import cytoscape, { Core } from "cytoscape";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);

type PersonNode = { id: string; name: string };
type EventNode = { id: string; name: string; eventType?: string; startDate?: any };

export type GraphPayload = {
  person: PersonNode;
  events: EventNode[];
  people: PersonNode[];
};

type Props = {
  data: GraphPayload | null;
  onSelectNode?: (node: { type: "person" | "event"; id: string; label: string }) => void;
};

function fmtDate(d: any) {
  if (!d) return "";
  if (typeof d === "string") return d;
  if (d.year && d.month && d.day) {
    return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  }
  return "";
}

/**
 * “Relaxation” behavior:
 * - User drags a node freely (no layout fighting them)
 * - On release (dragfree), we gently re-run a short layout on the dragged node’s neighborhood
 *   so nearby nodes “follow” and the graph settles (springy feel).
 */
export function Graph({ data, onSelectNode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo(() => {
    if (!data) return [];

    const nodes: any[] = [];
    const edges: any[] = [];

    nodes.push({
      data: { id: data.person.id, label: data.person.name, type: "person" }
    });

    for (const e of data.events) {
      nodes.push({
        data: {
          id: e.id,
          label: e.name,
          type: "event",
          subtitle: e.eventType ?? "",
          date: fmtDate(e.startDate)
        }
      });

      edges.push({
        data: {
          id: `${data.person.id}__${e.id}`,
          source: data.person.id,
          target: e.id,
          type: "person-event"
        }
      });
    }

    for (const p of data.people) {
      nodes.push({
        data: { id: p.id, label: p.name, type: "person" }
      });

      edges.push({
        data: {
          id: `${p.id}__${data.person.id}`,
          source: p.id,
          target: data.person.id,
          type: "person-person"
        }
      });
    }

    return [...nodes, ...edges];
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const runFullLayout = (cy: Core) => {
      cy.layout({
        name: "fcose",
        // @ts-ignore
        animate: true,
        animationDuration: 700,
        fit: true,
        padding: 30
      }).run();
    };

    // Short, gentle “relaxation” pass:
    // only on a small neighborhood, fewer iterations, so it feels like a spring settle.
    const runRelaxLayout = (cy: Core, nodeId: string) => {
      const n = cy.getElementById(nodeId);
      if (!n || n.empty()) return;

      const neighborhood = n.closedNeighborhood(); // node + adjacent nodes/edges

      // If graph is tiny, neighborhood might be too small; still fine.
      cy.layout({
        name: "fcose",
        animate: true,
        animationDuration: 450,
        fit: false, // IMPORTANT: don't auto-fit on relax (prevents camera snapping)
        padding: 30,

        // fcose supports restricting layout to a subset:
        // (works in cytoscape layouts that accept `eles`)
        eles: neighborhood,

        // Gentle settle; low effort
        quality: "default",
        randomize: false,
        // Smaller cooldown helps it stop quickly
        coolingFactor: 0.95
      } as any).run();
    };

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: el,
        elements,

        userPanningEnabled: true,
        userZoomingEnabled: true,
        // userPinchingEnabled: true,
        boxSelectionEnabled: false,
        autoungrabify: false,
        autounselectify: false,
        wheelSensitivity: 0.2,

        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "font-size": 12,
              color: "#111",
              "text-valign": "center",
              "text-halign": "center",
              "text-wrap": "wrap",
              "text-max-width": '140',
              "background-color": "#fff",
              "border-width": 2,
              "border-color": "#222",
              width: 48,
              height: 48,
              events: "yes",
              // subtle visual smoothness for hover/focus/dim changes
              "transition-property": "opacity, border-width",
              "transition-duration": 180
            }
          },
          {
            selector: 'node[type="event"]',
            style: {
              shape: "diamond",
              width: 42,
              height: 42,
              "border-color": "#555"
            }
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#999",
              "target-arrow-shape": "none",
              "curve-style": "bezier",
              events: "no",
              "transition-property": "opacity",
              "transition-duration": 180
            }
          },
          {
            selector: ".focused",
            style: { "border-width": 4 }
          },
          {
            selector: ".dim",
            style: { opacity: 0.25 }
          }
        ]
      });

      const cy = cyRef.current;

      runFullLayout(cy);

      // Track dragging so "tap" doesn't fire after a drag
      let isDragging = false;

      cy.on("grab", "node", (evt) => {
        isDragging = true;
        if (containerRef.current) containerRef.current.style.cursor = "grabbing";

        // Stop any running layout so it doesn't fight the drag
        const running = (cy as any).layout && (cy as any).layout();
        try {
          running?.stop?.();
        } catch {
          // ignore
        }
      });

      cy.on("free", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      });

      // On release, do the gentle neighborhood relaxation
      cy.on("dragfree", "node", (evt) => {
        const nodeId = evt.target.id();

        // Wait a tick so tap doesn't trigger immediately after drag
        setTimeout(() => {
          isDragging = false;
          runRelaxLayout(cy, nodeId);
        }, 0);
      });

      cy.on("tap", "node", (evt) => {
        if (isDragging) return;

        const n = evt.target;
        const type = n.data("type") as "person" | "event";
        const id = n.id();
        const label = n.data("label") as string;

        cy.elements().removeClass("dim focused");
        n.addClass("focused");
        n.closedNeighborhood().addClass("focused");
        cy.elements().not(n.closedNeighborhood()).addClass("dim");

        onSelectNode?.({ type, id, label });
      });
    } else {
      const cy = cyRef.current;
      cy.elements().remove();
      cy.add(elements);

      // Full layout only when graph data changes
      runFullLayout(cy);
    }
  }, [elements, onSelectNode]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8 }}>
        <button
          onClick={() => {
            const cy = cyRef.current;
            if (!cy) return;
            cy.layout({
              name: "fcose",
              // @ts-ignore
              animate: true,
              animationDuration: 700,
              fit: true,
              padding: 30
            }).run();
          }}
          style={{ padding: "8px 12px", borderRadius: 8 }}
        >
          Re-layout
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          height: 520,
          width: "100%",
          border: "1px solid #eee",
          borderRadius: 12,
          background: "white",
          cursor: "grab"
        }}
      />
    </div>
  );
}
