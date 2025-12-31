import { apiGet } from "./client";
import type { SearchResultItem } from "../app/types";

export async function searchPeople(q: string, limit = 10) {
  return apiGet<{ results: SearchResultItem[] }>(
    `/search?type=person&q=${encodeURIComponent(q)}&limit=${limit}`
  );
}
