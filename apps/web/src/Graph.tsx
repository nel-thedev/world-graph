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

import { Focus } from "./app/types";

type Props = {
  data: GraphDTO | null;
  focus?: Focus | null;
  onSelectNode?: (node: { type: "person" | "event"; id: string; label: string }) => void;
};

export function Graph({ data, focus, onSelectNode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo(() => {
    if (!data) return [];

    const nodesArr = data.nodes ?? [];
    const edgesArr = data.edges ?? [];

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

  // Handle Focus Styling
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (!focus) {
      cy.elements().removeClass("dim focused");
      return;
    }

    const n = cy.getElementById(focus.id);
    if (n.nonempty()) {
      cy.elements().removeClass("dim focused");

      // If focusing a PERSON, highlight connected people through events
      if (focus.kind === "person") {
        // 1. Get all events this person is connected to
        const connectedEvents = n.neighborhood('node[type="event"]');

        // 2. Get all people connected to those events (2-hop: Person → Event → Person)
        const connectedPeople = connectedEvents.neighborhood('node[type="person"]');

        // 3. Highlight: the person + their events + people who share those events
        const toHighlight = n.union(connectedEvents).union(connectedPeople);

        toHighlight.addClass("focused");

        // Also highlight the edges connecting them
        const relevantEdges = cy.edges().filter((edge) => {
          const src = edge.source();
          const tgt = edge.target();
          return toHighlight.contains(src) && toHighlight.contains(tgt);
        });
        relevantEdges.addClass("focused");

        // Dim everything else
        cy.elements().not(toHighlight.union(relevantEdges)).addClass("dim");
      } else {
        // For events, just show direct neighborhood (people who participated)
        n.addClass("focused");
        n.closedNeighborhood().addClass("focused");
        cy.elements().not(n.closedNeighborhood()).addClass("dim");
      }
    }
  }, [focus, elements]); // Run when focus changes OR elements change (new nodes arrive)


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
      } as any).run();
    };

    const runOverlapRemoval = (cy: Core, nodeId: string) => {
      const n = cy.getElementById(nodeId);
      if (!n || n.empty()) return;

      // Find spatially close nodes (potential overlaps)
      const p = n.position();
      const radius = 40; // Collision only (Nodes are 26px + borders)

      const nearby = cy.nodes().filter((x) => {
        if (x.id() === nodeId) return true; // Always include self
        const pos = x.position();
        const dist = Math.sqrt(Math.pow(pos.x - p.x, 2) + Math.pow(pos.y - p.y, 2));
        return dist < radius;
      });

      if (nearby.length <= 1) return; // Only self found

      // Lock the dragged node so IT stays where the user put it
      n.lock();

      const layout = cy.layout({
        name: "fcose",
        animate: true,
        animationDuration: 200, // Snappier
        fit: false,
        padding: 10,
        eles: nearby, // Only adjust these nodes
        quality: "default",
        randomize: false,

        // Physics settings for "Repulsion Only"
        nodeRepulsion: 6000,
        nodeSeparation: 50, // Try to keep them this far apart
        edgeElasticity: 0,    // No spring effect (don't pull connected nodes)
        gravity: 0,           // Don't pull to center
        gravityRange: 0,
        numIter: 500,
        coolingFactor: 0.9,

        stop: () => {
          n.unlock(); // Unlock after settling
        }
      } as any);

      layout.run();
    };

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: el,
        elements,

        userPanningEnabled: true,
        userZoomingEnabled: true,
        boxSelectionEnabled: false,
        autoungrabify: false,
        autounselectify: false,
        wheelSensitivity: 0.2,

        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "font-size": 10, // Slightly smaller
              "font-weight": "bold",
              color: "#000",

              // Move text OUTSIDE the node
              "text-valign": "bottom",
              "text-halign": "center",
              "text-margin-y": 6, // Spacing from node

              "text-wrap": "wrap",
              "text-max-width": 80, // Tighter wrap for names below

              // Legibility halo (so lines under text don't kill readability)
              "text-outline-color": "#fff",
              "text-outline-width": 3,

              "background-color": "#fff", // default
              "border-width": 2,
              "border-color": "#555",

              width: 24, // Smaller nodes since they don't hold text
              height: 24,

              events: "yes",
              "transition-property": "opacity, border-width, border-color, background-color, width, height",
              "transition-duration": "180ms"
            } as any
          },
          {
            selector: 'node[type="person"]',
            style: {
              shape: "ellipse",
              width: 24,
              height: 24,
              "background-color": "#e0f2fe", // Light Blue
              "border-color": "#0284c7"      // Strong Blue
            } as any
          },
          {
            selector: 'node[type="event"]',
            style: {
              shape: "ellipse", // Everything is a circle now
              width: 55,        // Large Hub
              height: 55,
              "background-color": "#fff7ed", // Very Light Amber
              "border-color": "#ea580c",     // Burnt Orange
              "border-width": 4,             // Thicker border for hubs
              "font-size": 11,               // Slightly larger text for hubs
              "text-margin-y": 8
            } as any
          },
          {
            selector: "edge",
            style: {
              width: "mapData(weight, -10, 10, 1, 6)",
              "line-color": "#cbd5e1", // Slate 300
              "target-arrow-shape": "none",
              "curve-style": "bezier",
              events: "no",
              opacity: 0.8,
              "transition-property": "opacity, width",
              "transition-duration": "180ms"
            } as any
          },
          {
            selector: 'edge[status="PENDING"]',
            style: {
              "line-style": "dashed",
              opacity: 0.6
            } as any
          },
          {
            selector: 'edge[status="REJECTED"]',
            style: {
              opacity: 0.25
            } as any
          },
          {
            selector: ".focused",
            style: {
              "border-width": 4,
              "border-color": "#2563eb", // Bright Blue Focus
              "shadow-blur": 10,
              "shadow-color": "#2563eb",
              "shadow-opacity": 0.5
            } as any
          },
          {
            selector: ".dim",
            style: { opacity: 0.2 } as any
          }
        ]
      });

      const cy = cyRef.current;
      runFullLayout(cy);

      // ✅ Correct drag detection:
      // - grab does NOT mean drag
      // - only if we see a "drag" event do we treat it as dragging
      let didDrag = false;

      cy.on("grab", "node", () => {
        didDrag = false;
        if (containerRef.current) containerRef.current.style.cursor = "grabbing";

        // stop any running layout that might fight the drag
        try {
          const currentLayout = (cy as any).layout?.();
          currentLayout?.stop?.();
        } catch {
          // ignore
        }
      });

      cy.on("drag", "node", () => {
        didDrag = true;
      });

      cy.on("free", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      });

      cy.on("dragfree", "node", (evt) => {
        const nodeId = evt.target.id();
        // only resolve overlap if it actually moved
        if (!didDrag) return;
        setTimeout(() => runOverlapRemoval(cy, nodeId), 20);
      });

      cy.on("tap", "node", (evt) => {
        // If it was a drag, ignore the tap that often fires after drag
        if (didDrag) {
          // reset after the tap cycle
          setTimeout(() => {
            didDrag = false;
          }, 0);
          return;
        }

        const n = evt.target;
        const type = n.data("type") as "person" | "event";
        const id = n.id();
        const label = n.data("label") as string;

        // Immediate feedback: center camera on clicked node
        cy.animate({ center: { eles: n }, duration: 220 }, { easing: "ease-in-out" });

        // Focus styling is now handled by the useEffect above reacting to props change
        // But we still fire the event to update the parent
        onSelectNode?.({ type, id, label });
      });

      cy.on("tap", (evt) => {
        if (evt.target !== cy) return;
        // cy.elements().removeClass("dim focused");
        // We probably don't want to clear focus on background click if we want to "explore"
        // But if user wants to clear selection?
        // Let's leave it for now.
      });
    } else {
      const cy = cyRef.current;

      // MAP BEHAVIOR:
      // 1. Lock all existing nodes so they function as anchors and don't move.
      // 2. Add only NEW nodes/edges from the incoming data (Merge).
      // 3. Run layout. Since old nodes are locked, only new nodes will be placed around them.
      // 4. (Optional) Unlock after layout if we want them to be movable again, 
      //    but keeping them locked prevents "drift" on subsequent updates. 
      //    Let's unlock on 'layoutstop' so user can manually drag them.

      cy.nodes().lock();

      const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
      const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));

      const nodesToAdd = elements.filter((e) => !('source' in e.data) && !existingNodeIds.has(e.data.id));
      const edgesToAdd = elements.filter((e) => 'source' in e.data && !existingEdgeIds.has(e.data.id));

      if (nodesToAdd.length > 0 || edgesToAdd.length > 0) {
        cy.add([...nodesToAdd, ...edgesToAdd]);

        const layout = cy.layout({
          name: "fcose",
          animate: true,
          animationDuration: 500,
          randomize: false,
          fit: false,             // Don't auto-fit, let user pan/zoom
          padding: 30,
          nodeDimensionsIncludeLabels: true,
          quality: "default",
          // Layout only affects new nodes naturally if old ones are locked?
          // Actually fcose respects locks.
          stop: () => {
            cy.nodes().unlock(); // Allow user manipulation after layout settles
          }
        } as any);

        layout.run();
      } else {
        // Just unlock if we didn't add anything (unlikely path if data changed)
        cy.nodes().unlock();
      }
    }
  }, [elements, onSelectNode]); // REMOVE focus from dependency array here, handled in separate effect

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        border: "1px solid #eee",
        borderRadius: 12,
        background: "white",
        cursor: "grab"
      }}
    />
  );
}
