export const CYPHER_PERSON_NEIGHBORHOOD = `
MATCH (p:Person {id: $personId})
MATCH (p)-[:CLAIM_SUBJECT]->(c:Claim)-[:CLAIM_OBJECT]->(e:Event)
WHERE
  ($includePending = true OR c.status = 'APPROVED')
  AND ($minScore IS NULL OR c.score >= $minScore)
  AND ($startYear IS NULL OR e.startDate >= date({year: $startYear, month: 1, day: 1}))
  AND ($endYear   IS NULL OR e.startDate <  date({year: $endYear + 1, month: 1, day: 1}))
WITH p, c, e
ORDER BY e.startDate DESC
LIMIT toInteger($limitEvents)
OPTIONAL MATCH (e)<-[:CLAIM_OBJECT]-(:Claim {claimType:'PERSON_EVENT'})<-[:CLAIM_SUBJECT]-(op:Person)
WHERE op.id <> p.id
WITH p, collect(DISTINCT e) AS events, collect(DISTINCT op) AS people
RETURN p, events, people
`;

export const CYPHER_PERSON_CONNECTIONS = `
MATCH (p:Person {id: $personId})
MATCH (p)-[:CLAIM_SUBJECT]->(c1:Claim)-[:CLAIM_OBJECT]->(e:Event)
WHERE ($includePending = true OR c1.status = 'APPROVED')
MATCH (e)<-[:CLAIM_OBJECT]-(c2:Claim)<-[:CLAIM_SUBJECT]-(other:Person)
WHERE other.id <> p.id
  AND ($includePending = true OR c2.status = 'APPROVED')
WITH other,
     count(DISTINCT e) AS sharedEventCount,
     sum(coalesce(c1.score,0) + coalesce(c2.score,0)) AS sharedStrength
ORDER BY sharedEventCount DESC, sharedStrength DESC
LIMIT toInteger($limitPeople)
RETURN other, sharedEventCount, sharedStrength
`;

export const CYPHER_WHY_CONNECTED = `
MATCH (a:Person {id:$personAId})
MATCH (b:Person {id:$personBId})
MATCH (a)-[:CLAIM_SUBJECT]->(ca:Claim)-[:CLAIM_OBJECT]->(e:Event)<-[:CLAIM_OBJECT]-(cb:Claim)<-[:CLAIM_SUBJECT]-(b)
WHERE
  ($includePending = true OR (ca.status = 'APPROVED' AND cb.status = 'APPROVED'))
OPTIONAL MATCH (ca)-[:HAS_EVIDENCE]->(sa:Source)
OPTIONAL MATCH (cb)-[:HAS_EVIDENCE]->(sb:Source)
WITH e, ca, cb,
     collect(DISTINCT sa)[0..3] AS aEvidencePreview,
     collect(DISTINCT sb)[0..3] AS bEvidencePreview
ORDER BY e.startDate DESC
LIMIT toInteger($limitEvents)
RETURN e,
       ca { .id, .relationshipType, .status, .score, .uniqueVoters, .evidenceCount } AS claimA,
       cb { .id, .relationshipType, .status, .score, .uniqueVoters, .evidenceCount } AS claimB,
       aEvidencePreview,
       bEvidencePreview
`;
