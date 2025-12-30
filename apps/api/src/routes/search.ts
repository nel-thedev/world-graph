import { FastifyInstance } from "fastify";
import { z } from "zod";
import { runRead } from "../neo4j.js";

const QuerySchema = z.object({
  q: z.string().min(1),
  type: z.enum(["person", "event"]).optional().default("person"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10)
});

export async function searchRoutes(app: FastifyInstance) {
  app.get("/search", async (req, res) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).send({ error: parsed.error.flatten() });

    const { q, type, limit } = parsed.data;
    const label = type === "person" ? "Person" : "Event";

    const cypher = `
      MATCH (n:${label})
      WHERE toLower(n.name) CONTAINS toLower($q)
      RETURN n
      ORDER BY n.name
      LIMIT toInteger($limit)
    `;

    const rows = await runRead(cypher, { q, limit }, (r) => r.get("n").properties);
    return { results: rows };
  });
}
