import { apiGet } from "./client";
import type { GraphDTO } from "../app/types";

export async function fetchPersonNeighborhood(personId: string, limitEvents = 25, limitPeople = 60) {
  return apiGet<GraphDTO>(
    `/people/${encodeURIComponent(personId)}/neighborhood?limitEvents=${limitEvents}&limitPeople=${limitPeople}`
  );
}

export async function fetchEventNeighborhood(eventId: string, limitPeople = 60, limitEvents = 25) {
  return apiGet<GraphDTO>(
    `/events/${encodeURIComponent(eventId)}/neighborhood?limitPeople=${limitPeople}&limitEvents=${limitEvents}`
  );
}
