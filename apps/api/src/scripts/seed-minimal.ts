import { runWrite } from "../neo4j.js";
import crypto from "node:crypto";

function id(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`;
}

async function main() {
  // Minimal demo: two people connected via one event
  const p1 = { id: "p:lincoln", name: "Abraham Lincoln" };
  const p2 = { id: "p:grant", name: "Ulysses S. Grant" };
  const e1 = { id: "e:civilwar", name: "American Civil War", eventType: "WAR", startDate: "1861-04-12", endDate: "1865-05-09" };

  const c1 = { id: id("c"), relationshipType: "LED", status: "APPROVED", score: 10, uniqueVoters: 5, evidenceCount: 1 };
  const c2 = { id: id("c"), relationshipType: "PARTICIPATED_IN", status: "APPROVED", score: 8, uniqueVoters: 4, evidenceCount: 1 };

  const s1 = { id: "src:wikidata:civilwar", sourceType: "WIKIDATA", title: "Wikidata seed", publisher: "Wikidata" };

  // Upserts
  await runWrite(
    `
MERGE (p:Person {id:$p1.id}) SET p.name=$p1.name, p.updatedAt=datetime()
MERGE (q:Person {id:$p2.id}) SET q.name=$p2.name, q.updatedAt=datetime()
MERGE (e:Event {id:$e1.id}) SET e.name=$e1.name, e.eventType=$e1.eventType,
  e.startDate=date($e1.startDate), e.endDate=date($e1.endDate), e.updatedAt=datetime()

MERGE (src:Source {id:$s1.id}) SET src.sourceType=$s1.sourceType, src.title=$s1.title, src.publisher=$s1.publisher, src.createdAt=datetime()

CREATE (cA:Claim {id:$c1.id, claimType:'PERSON_EVENT', relationshipType:$c1.relationshipType, status:$c1.status,
  score:$c1.score, uniqueVoters:$c1.uniqueVoters, evidenceCount:$c1.evidenceCount, createdAt:datetime(), createdByUserId:'system'})
CREATE (cB:Claim {id:$c2.id, claimType:'PERSON_EVENT', relationshipType:$c2.relationshipType, status:$c2.status,
  score:$c2.score, uniqueVoters:$c2.uniqueVoters, evidenceCount:$c2.evidenceCount, createdAt:datetime(), createdByUserId:'system'})

CREATE (p)-[:CLAIM_SUBJECT]->(cA)
CREATE (cA)-[:CLAIM_OBJECT]->(e)
CREATE (cA)-[:HAS_EVIDENCE {addedByUserId:'system', addedAt:datetime()}]->(src)

CREATE (q)-[:CLAIM_SUBJECT]->(cB)
CREATE (cB)-[:CLAIM_OBJECT]->(e)
CREATE (cB)-[:HAS_EVIDENCE {addedByUserId:'system', addedAt:datetime()}]->(src)
`,
    { p1, p2, e1, c1, c2, s1 }
  );

  console.log("Seeded minimal dataset.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
