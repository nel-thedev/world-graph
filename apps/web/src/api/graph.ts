import { apiGet } from "./client";
import type { GraphDTO } from "../app/types";

export async function fetchNeighborhood(personId: string, limitEvents = 25, limitPeople = 60) {
  return apiGet<GraphDTO>(
    `/people/${encodeURIComponent(personId)}/neighborhood?limitEvents=${limitEvents}&limitPeople=${limitPeople}`
  );
}
