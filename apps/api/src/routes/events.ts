import { FastifyInstance } from "fastify";
import { z } from "zod";
import { runRead } from "../neo4j.js";
import { CYPHER_EVENT_NEIGHBORHOOD_GRAPH } from "../cypher/graph.cypher.js";

export async function eventsRoutes(app: FastifyInstance) {
    app.get("/events/:id/neighborhood", async (req, res) => {
        const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
        const query = z.object({
        includePending: z.coerce.boolean().optional().default(false),
        limitPeople: z.coerce.number().int().min(1).max(200).optional().default(60),
        limitEvents: z.coerce.number().int().min(1).max(100).optional().default(25)
        }).safeParse(req.query);
    
        if (!params.success) return res.status(400).send({ error: params.error.flatten() });
        if (!query.success) return res.status(400).send({ error: query.error.flatten() });
    
        const rows = await runRead(
        CYPHER_EVENT_NEIGHBORHOOD_GRAPH,
        { eventId: params.data.id, ...query.data },
        (r) => {
            const center = r.get("center").properties;
            const events = r.get("events").map((e: any) => e.properties);
            const people = r.get("people").map((p: any) => p.properties);
            const edges = r.get("claimEdges");
    
            return {
            nodes: [
                { id: center.id, kind: "event", label: center.name, meta: center },
                ...events.map((e: any) => ({ id: e.id, kind: "event", label: e.name, meta: e })),
                ...people.map((p: any) => ({ id: p.id, kind: "person", label: p.name, meta: p }))
            ],
            edges: edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                kind: "claim",
                weight: e.score,
                meta: { relationshipType: e.relationshipType, status: e.status, score: e.score }
            }))
            };
        }
        );
    
        return rows[0];
    });
}
  