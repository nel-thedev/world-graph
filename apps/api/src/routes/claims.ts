import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { runWrite } from "../neo4j.js";
import {
  CYPHER_ADD_EVIDENCE,
  CYPHER_CREATE_PERSON_EVENT_CLAIM,
  CYPHER_VOTE_ON_CLAIM
} from "../cypher/claims.cypher.js";

const CreateClaimBody = z.object({
  personId: z.string().min(1),
  eventId: z.string().min(1),
  relationshipType: z.string().min(1)
});

const AddEvidenceBody = z.object({
  sourceType: z.enum(["NEWS", "BOOK", "PAPER", "WIKIDATA", "ARCHIVE", "OTHER"]),
  title: z.string().min(1),
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().datetime().optional()
});

const VoteBody = z.object({
  value: z.union([z.literal(1), z.literal(-1)])
});

// TEMP: no auth yet; we’ll hardcode a user id.
// Later: replace with real auth + role/reputation.
const DEV_USER_ID = "user:dev";

function voteWeightForRole(role: "USER" | "TRUSTED" | "MOD") {
  if (role === "MOD") return 3;
  if (role === "TRUSTED") return 2;
  return 1;
}

export async function claimsRoutes(app: FastifyInstance) {
  // Ensure dev user exists (simple and effective for MVP)
  app.addHook("onRequest", async () => {
    await runWrite(
      `
MERGE (u:User {id:$id})
ON CREATE SET u.displayName='Dev User', u.role='MOD', u.reputation=10, u.createdAt=datetime()
RETURN u
`,
      { id: DEV_USER_ID }
    );
  });

  app.post("/claims/person-event", async (req, res) => {
    const body = CreateClaimBody.safeParse(req.body);
    if (!body.success) return res.status(400).send({ error: body.error.flatten() });

    const claimId = crypto.randomUUID();

    const rows = await runWrite(
      CYPHER_CREATE_PERSON_EVENT_CLAIM,
      {
        claimId,
        personId: body.data.personId,
        eventId: body.data.eventId,
        relationshipType: body.data.relationshipType,
        createdByUserId: DEV_USER_ID
      },
      (r) => r.get("c").properties
    );

    return { claim: rows[0] };
  });

  app.post("/claims/:claimId/evidence", async (req, res) => {
    const params = z.object({ claimId: z.string().min(1) }).safeParse(req.params);
    const body = AddEvidenceBody.safeParse(req.body);
    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!body.success) return res.status(400).send({ error: body.error.flatten() });

    const sourceId =
      body.data.url ? `src:url:${body.data.url}` : `src:${crypto.randomUUID()}`;

    const sourceProps: Record<string, unknown> = {
      sourceType: body.data.sourceType,
      title: body.data.title
    };
    if (body.data.url) sourceProps.url = body.data.url;
    if (body.data.publisher) sourceProps.publisher = body.data.publisher;
    if (body.data.author) sourceProps.author = body.data.author;
    if (body.data.publishedAt) sourceProps.publishedAt = body.data.publishedAt;

    const rows = await runWrite(
      CYPHER_ADD_EVIDENCE,
      {
        claimId: params.data.claimId,
        sourceId,
        sourceProps,
        addedByUserId: DEV_USER_ID
      },
      (r) => r.get("c").properties
    );

    return { claim: rows[0] };
  });

  app.post("/claims/:claimId/vote", async (req, res) => {
    const params = z.object({ claimId: z.string().min(1) }).safeParse(req.params);
    const body = VoteBody.safeParse(req.body);
    if (!params.success) return res.status(400).send({ error: params.error.flatten() });
    if (!body.success) return res.status(400).send({ error: body.error.flatten() });

    // DEV user role is MOD in hook above
    const weight = voteWeightForRole("MOD");

    const rows = await runWrite(
      CYPHER_VOTE_ON_CLAIM,
      {
        userId: DEV_USER_ID,
        claimId: params.data.claimId,
        value: body.data.value,
        weight
      },
      (r) => r.get("c").properties
    );

    return { claim: rows[0] };
  });
}
