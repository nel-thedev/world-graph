import type { Focus, GraphDTO } from "./types";

export type TopItem = { id: string; label: string; score: number; kind: "person" | "event" };

export function analyzeGraph(graph: GraphDTO | null, focus: Focus | null) {
  if (!graph || !focus) return { topPeople: [] as TopItem[], topEvents: [] as TopItem[], summary: "" };

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const edges = graph.edges ?? [];

  const isPersonFocus = focus.kind === "person";

  // score events: sum of incident edge weights
  const eventScores = new Map<string, number>();
  for (const e of edges) {
    const w = typeof e.weight === "number" ? e.weight : 0;
    const target = e.target;
    const targetNode = nodeById.get(target);
    if (targetNode?.kind === "event") {
      eventScores.set(target, (eventScores.get(target) ?? 0) + w);
    }
  }

  const topEvents: TopItem[] = [...eventScores.entries()]
    .map(([id, score]) => {
      const n = nodeById.get(id);
      return { id, label: n?.label ?? id, score, kind: "event" as const };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // People connected to focus via shared events:
  // person -> event edges exist. Build event -> people map (with weights).
  const peopleByEvent = new Map<string, { personId: string; w: number }[]>();
  for (const e of edges) {
    const w = typeof e.weight === "number" ? e.weight : 0;
    const sourceNode = nodeById.get(e.source);
    const targetNode = nodeById.get(e.target);
    if (sourceNode?.kind === "person" && targetNode?.kind === "event") {
      const list = peopleByEvent.get(e.target) ?? [];
      list.push({ personId: e.source, w });
      peopleByEvent.set(e.target, list);
    }
  }

  const personScores = new Map<string, number>();

  if (isPersonFocus) {
    // identify focus person's events
    const focusEventIds = new Set<string>();
    for (const e of edges) {
      const sourceNode = nodeById.get(e.source);
      const targetNode = nodeById.get(e.target);
      if (sourceNode?.kind === "person" && targetNode?.kind === "event" && e.source === focus.id) {
        focusEventIds.add(e.target);
      }
    }

    // for each event the focus is in, add scores to other people in that same event
    for (const eventId of focusEventIds) {
      const people = peopleByEvent.get(eventId) ?? [];
      for (const p of people) {
        if (p.personId === focus.id) continue;
        personScores.set(p.personId, (personScores.get(p.personId) ?? 0) + p.w);
      }
    }
  }

  const topPeople: TopItem[] = [...personScores.entries()]
    .map(([id, score]) => {
      const n = nodeById.get(id);
      return { id, label: n?.label ?? id, score, kind: "person" as const };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const summary =
    isPersonFocus && topPeople.length > 0 && topEvents.length > 0
      ? `${focus.label ?? focus.id} is most connected to ${topPeople
          .slice(0, 2)
          .map((p) => p.label)
          .join(" and ")} through ${topEvents
          .slice(0, 2)
          .map((e) => e.label)
          .join(" and ")}.`
      : "";

  return { topPeople, topEvents, summary };
}
