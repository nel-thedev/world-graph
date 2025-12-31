import { FastifyInstance } from "fastify";
import { z } from "zod";
import { runRead } from "../neo4j.js";
import {
  CYPHER_PERSON_CONNECTIONS,
  CYPHER_PERSON_NEIGHBORHOOD,
  CYPHER_SHARED_EVENTS_PREVIEW,
  CYPHER_WHY_CONNECTED
} from "../cypher/people.cypher.js";
import { CYPHER_PERSON_NEIGHBORHOOD_GRAPH } from "../cypher/graph.cypher.js";

const GraphQuery = z.object({
  includePending: z.coerce.boolean().optional().default(false),
  minScore: z.coerce.number().optional(),
  startYear: z.coerce.number().int().optional(),
  endYear: z.coerce.number().int().optional(),
  limitEvents: z.coerce.number().int().min(1).max(200).optional().default(50)
});

const ConnectionsQuery = z.object({
  includePending: z.coerce.boolean().optional().default(false),
  limitPeople: z.coerce.number().int().min(1).max(200).optional().default(50)
});

const WhyQuery = z.object({
  includePending: z.coerce.boolean().optional().default(false),
  limitEvents: z.coerce.number().int().min(1).max(200).optional().default(20)
});

export async function peopleRoutes(app: FastifyInstance) {
  app.get("/people/:id/graph", async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    const query = GraphQuery.safeParse(req.query);
    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!query.success) return res.status(400).send({ error: query.error.flatten() });

    const q = query.data;

    const paramsForNeo4j = {
    personId: params.data.id,
    includePending: q.includePending,
    limitEvents: q.limitEvents,

    // ensure these always exist
    minScore: q.minScore ?? null,
    startYear: q.startYear ?? null,
    endYear: q.endYear ?? null
    };

    const out = await runRead(
      CYPHER_PERSON_NEIGHBORHOOD,
      paramsForNeo4j,
      (r) => ({
        person: r.get("p").properties,
        events: r.get("events").map((n: any) => n.properties),
        people: r.get("people").map((n: any) => n.properties)
      })
    );

    if (out.length === 0) return res.status(404).send({ error: "Person not found or no data." });
    return out[0];
  });

  app.get("/people/:id/connections", async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    const query = ConnectionsQuery.safeParse(req.query);
    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!query.success) return res.status(400).send({ error: query.error.flatten() });

    const rows = await runRead(
      CYPHER_PERSON_CONNECTIONS,
      { personId: params.data.id, ...query.data },
      (r) => {
        const p = r.get("other").properties;
        return {
          id: p.id,
          name: p.name,
          person: p,
          sharedEventCount: r.get("sharedEventCount"),
          sharedStrength: r.get("sharedStrength")
        };
      }      
    );

    return { results: rows };
  });

  app.get("/people/:aId/why/:bId", async (req, res) => {
    const params = z.object({ aId: z.string().min(1), bId: z.string().min(1) }).safeParse(req.params);
    const query = WhyQuery.safeParse(req.query);
    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!query.success) return res.status(400).send({ error: query.error.flatten() });

    const rows = await runRead(
      CYPHER_WHY_CONNECTED,
      { personAId: params.data.aId, personBId: params.data.bId, ...query.data },
      (r) => ({
        event: r.get("e").properties,
        claimA: r.get("claimA"),
        claimB: r.get("claimB"),
        aEvidencePreview: r.get("aEvidencePreview").map((n: any) => n.properties),
        bEvidencePreview: r.get("bEvidencePreview").map((n: any) => n.properties)
      })
    );

    return { results: rows };
  });

  app.get("/people/:aId/shared-events/:bId", async (req, res) => {
    const params = z.object({ aId: z.string().min(1), bId: z.string().min(1) }).safeParse(req.params);
    const query = z.object({
      includePending: z.coerce.boolean().optional().default(false),
      limit: z.coerce.number().int().min(1).max(100).optional().default(10)
    }).safeParse(req.query);
  
    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!query.success) return res.status(400).send({ error: query.error.flatten() });
  
    const rows = await runRead(
      CYPHER_SHARED_EVENTS_PREVIEW,
      { personAId: params.data.aId, personBId: params.data.bId, ...query.data },
      (r) => r.get("e").properties
    );
  
    return { results: rows };
  });

    app.get("/people/:id/neighborhood", async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
    const query = z.object({
        includePending: z.coerce.boolean().optional().default(false),
        limitEvents: z.coerce.number().int().min(1).max(100).optional().default(25),
        limitPeople: z.coerce.number().int().min(1).max(200).optional().default(50)
    }).safeParse(req.query);

    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!query.success) return res.status(400).send({ error: query.error.flatten() });

    const rows = await runRead(
        CYPHER_PERSON_NEIGHBORHOOD_GRAPH,
        {
        personId: params.data.id,
        ...query.data
        },
        (r) => {
        const center = r.get("center").properties;
        const events = r.get("events").map((e: any) => e.properties);
        const people = r.get("people").map((p: any) => p.properties);
        const edges = r.get("claimEdges");

        const graph = {
            nodes: [
            {
                id: center.id,
                kind: "person",
                label: center.name,
                meta: center
            },
            ...events.map((e: any) => ({
                id: e.id,
                kind: "event",
                label: e.name,
                meta: e
            })),
            ...people.map((p: any) => ({
                id: p.id,
                kind: "person",
                label: p.name,
                meta: p
            }))
            ],
            edges: edges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            kind: "claim",
            weight: e.score,
            meta: {
                relationshipType: e.relationshipType,
                status: e.status,
                score: e.score
            }
            }))
        };

        return graph;
        }
    );

    return rows[0];
    });
}
