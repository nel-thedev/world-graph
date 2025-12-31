export type Focus =
  | { kind: "person"; id: string; label?: string }
  | { kind: "event"; id: string; label?: string };

export type SearchResultItem = { id: string; name: string };

export type GraphDTO = {
  nodes: {
    id: string;
    kind: "person" | "event";
    label: string;
    meta?: Record<string, any>;
  }[];
  edges: {
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
