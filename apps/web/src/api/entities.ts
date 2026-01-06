
import { apiGet } from "./client";

export interface EntityDetails {
    id: string;
    kind: "person" | "event";
    name: string;
    shortDescription?: string;
    summary?: string;
    wikipediaTitle?: string;
    wikidataId?: string;
    wikipediaUrl?: string;
    thumbnailUrl?: string;
}

export async function fetchEntityDetails(id: string): Promise<EntityDetails> {
    return apiGet<EntityDetails>(`/entity/${encodeURIComponent(id)}/details`);
}
