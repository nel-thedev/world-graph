import { useEffect, useMemo, useRef } from "react";
import cytoscape, { Core } from "cytoscape";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);

export type GraphDTO = {
  nodes?: {
    id: string;
    kind: "person" | "event";
    label: string;
    meta?: Record<string, any>;
  }[];
  edges?: {
    id: string;
    source: string;
    target: string;
    kind: "claim";
    weight: number;
    meta?: {
      relationshipType: string;
      status: string;
      score: number;
    };
  }[];
};

type Props = {
  data: GraphDTO | null;
  onSelectNode?: (node: { type: "person" | "event"; id: string; label: string }) => void;
};

export function Graph({ data, onSelectNode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo(() => {
    if (!data) return [];

    const nodesArr = data.nodes ?? [];
    const edgesArr = data.edges ?? [];

    // Helpful dev hint if you're still returning the old payload
    if (!Array.isArray(nodesArr) || !Array.isArray(edgesArr)) {
      // eslint-disable-next-line no-console
      console.warn("Graph received non-GraphDTO payload:", data);
      return [];
    }

    const nodes = nodesArr.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.kind,
        meta: n.meta ?? {}
      }
    }));

    const edges = edgesArr.map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.kind,
        weight: typeof e.weight === "number" ? e.weight : 0,
        status: e.meta?.status ?? "UNKNOWN",
        relationshipType: e.meta?.relationshipType ?? "UNKNOWN",
        score: e.meta?.score ?? e.weight ?? 0
      }
    }));

    return [...nodes, ...edges];
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const runFullLayout = (cy: Core) => {
      cy.layout({
        name: "fcose",
        animate: true,
        animationDuration: 700,
        fit: true,
        padding: 30
      }).run();
    };

    const runRelaxLayout = (cy: Core, nodeId: string) => {
      const n = cy.getElementById(nodeId);
      if (!n || n.empty()) return;

      const neighborhood = n.closedNeighborhood();

      cy.layout({
        name: "fcose",
        animate: true,
        animationDuration: 450,
        fit: false,
        padding: 30,
        eles: neighborhood,
        quality: "default",
        randomize: false,
        coolingFactor: 0.95
      } as any).run();
    };

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: el,
        elements,

        userPanningEnabled: true,
        userZoomingEnabled: true,
        userPinchingEnabled: true,
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
              "text-max-width": 150,
              "background-color": "#fff",
              "border-width": 2,
              "border-color": "#222",
              width: 48,
              height: 48,
              events: "yes",
              "transition-property": "opacity, border-width, border-color",
              "transition-duration": "180ms"
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
              width: "mapData(weight, -10, 10, 1, 6)",
              "line-color": "#999",
              "target-arrow-shape": "none",
              "curve-style": "bezier",
              events: "no",
              opacity: 0.9,
              "transition-property": "opacity, width",
              "transition-duration": "180ms"
            }
          },
          {
            selector: 'edge[status="PENDING"]',
            style: {
              "line-style": "dashed",
              opacity: 0.6
            }
          },
          {
            selector: 'edge[status="REJECTED"]',
            style: {
              opacity: 0.25
            }
          },
          {
            selector: ".focused",
            style: {
              "border-width": 4
            }
          },
          {
            selector: ".dim",
            style: {
              opacity: 0.2
            }
          }
        ]
      });

      const cy = cyRef.current;

      runFullLayout(cy);

      let isDragging = false;

      cy.on("grab", "node", () => {
        isDragging = true;
        if (containerRef.current) containerRef.current.style.cursor = "grabbing";
        try {
          const currentLayout = (cy as any).layout?.();
          currentLayout?.stop?.();
        } catch {
          // ignore
        }
      });

      cy.on("free", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      });

      cy.on("dragfree", "node", (evt) => {
        const nodeId = evt.target.id();
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

      cy.on("tap", (evt) => {
        if (evt.target !== cy) return;
        cy.elements().removeClass("dim focused");
      });
    } else {
      const cy = cyRef.current;

      const prevPan = cy.pan();
      const prevZoom = cy.zoom();

      cy.elements().remove();
      cy.add(elements);

      cy.pan(prevPan);
      cy.zoom(prevZoom);

      runFullLayout(cy);
    }
  }, [elements, onSelectNode]);

  return (
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
  );
}
