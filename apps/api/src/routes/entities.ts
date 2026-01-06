
import { FastifyInstance } from "fastify";
import { runRead, runWrite } from "../neo4j.js";
import { fetchWikipediaSummary } from "../services/wikipedia.js";

interface EntityDetails {
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

export async function entitiesRoutes(app: FastifyInstance) {
    app.get<{ Params: { id: string } }>("/entity/:id/details", async (req, reply) => {
        const { id } = req.params;

        // 1. Try to find the node and get existing details
        const result = await runRead(
            `
      MATCH (n)
      WHERE n.id = $id
      RETURN n { .* }, labels(n) as labels
      LIMIT 1
      `,
            { id },
            (record) => ({
                n: record.get("n"),
                labels: record.get("labels")
            })
        );

        if (result.length === 0) {
            return reply.status(404).send({ error: "Entity not found" });
        }

        const { n: props, labels } = result[0];
        const kind = labels.includes("Person") ? "person" : "event";
        const name = props.name || "Unknown";

        // If we already have a summary, return it immediately
        if (props.summary) {
            return {
                id: props.id,
                kind,
                name,
                shortDescription: props.shortDescription,
                summary: props.summary,
                wikipediaTitle: props.wikipediaTitle,
                wikidataId: props.wikidataId,
                wikipediaUrl: props.wikipediaUrl,
                thumbnailUrl: props.thumbnailUrl
            };
        }

        // 2. Fetch from Wikipedia
        // Use existing wikipediaTitle if set, otherwise try the name
        const searchTitle = props.wikipediaTitle || name;
        const wikiData = await fetchWikipediaSummary(searchTitle);

        let updates: Partial<EntityDetails> = {};

        if (wikiData) {
            updates = {
                shortDescription: wikiData.description,
                summary: wikiData.extract,
                wikipediaTitle: wikiData.title, // Update with canonical title
                wikipediaUrl: wikiData.content_urls?.desktop?.page,
                thumbnailUrl: wikiData.thumbnail?.source
            };

            // 3. Cache back to Neo4j
            await runWrite(
                `
        MATCH (n)
        WHERE n.id = $id
        SET n += $updates, n.summaryUpdatedAt = datetime()
        RETURN n
        `,
                { id, updates }
            );
        }

        // 4. Return combined result
        return {
            id: props.id,
            kind,
            name,
            ...updates,
            // Fallback to existing props if wiki failed
            shortDescription: updates.shortDescription || props.shortDescription,
            summary: updates.summary || props.summary,
            wikipediaTitle: updates.wikipediaTitle || props.wikipediaTitle,
            wikidataId: props.wikidataId
        };
    });
}
