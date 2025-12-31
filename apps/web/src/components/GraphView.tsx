import type { GraphDTO, Focus } from "../app/types";
import { Graph } from "../Graph"; // your Cytoscape renderer file

export function GraphView(props: {
  graph: GraphDTO | null;
  onFocus: (focus: Focus) => void;
}) {
  return (
    <div style={{ height: "100%", width: "100%", background: "#f7f7f8" }}>
      <Graph
        data={props.graph}
        onSelectNode={(n) => props.onFocus({ kind: n.type, id: n.id, label: n.label })}
      />
    </div>
  );
}
