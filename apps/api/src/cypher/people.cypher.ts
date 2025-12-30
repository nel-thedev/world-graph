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
WHERE ($includePending = true OR (ca.status = 'APPROVED' AND cb.status = 'APPROVED'))
WITH e, collect(DISTINCT ca) AS caList, collect(DISTINCT cb) AS cbList
UNWIND caList AS caItem
WITH e, cbList, caItem
ORDER BY coalesce(caItem.score, 0) DESC, caItem.createdAt DESC
WITH e, cbList, collect(caItem)[0] AS caBest
UNWIND cbList AS cbItem
WITH e, caBest, cbItem
ORDER BY coalesce(cbItem.score, 0) DESC, cbItem.createdAt DESC
WITH e, caBest, collect(cbItem)[0] AS cbBest
OPTIONAL MATCH (caBest)-[:HAS_EVIDENCE]->(sa:Source)
OPTIONAL MATCH (cbBest)-[:HAS_EVIDENCE]->(sb:Source)
WITH e, caBest, cbBest,
     collect(DISTINCT sa)[0..3] AS aEvidencePreview,
     collect(DISTINCT sb)[0..3] AS bEvidencePreview
ORDER BY e.startDate DESC
LIMIT toInteger($limitEvents)
RETURN e,
       caBest { .id, .relationshipType, .status, .score, .uniqueVoters, .evidenceCount } AS claimA,
       cbBest { .id, .relationshipType, .status, .score, .uniqueVoters, .evidenceCount } AS claimB,
       aEvidencePreview,
       bEvidencePreview
`;

export const CYPHER_SHARED_EVENTS_PREVIEW = `
MATCH (a:Person {id:$personAId})
MATCH (b:Person {id:$personBId})
MATCH (a)-[:CLAIM_SUBJECT]->(ca:Claim)-[:CLAIM_OBJECT]->(e:Event)<-[:CLAIM_OBJECT]-(:Claim)<-[:CLAIM_SUBJECT]-(b)
WHERE ($includePending = true OR ca.status = 'APPROVED')
WITH DISTINCT e
ORDER BY e.startDate DESC
LIMIT toInteger($limit)
RETURN e
`;