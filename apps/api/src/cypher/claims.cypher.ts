export const CYPHER_CREATE_PERSON_EVENT_CLAIM = `
MATCH (p:Person {id:$personId})
MATCH (e:Event {id:$eventId})
CREATE (c:Claim {
  id: $claimId,
  claimType:'PERSON_EVENT',
  relationshipType:$relationshipType,
  status:'PENDING',
  score:0,
  upWeight:0,
  downWeight:0,
  uniqueVoters:0,
  evidenceCount:0,
  createdAt: datetime(),
  createdByUserId:$createdByUserId
})
CREATE (p)-[:CLAIM_SUBJECT]->(c)
CREATE (c)-[:CLAIM_OBJECT]->(e)
RETURN c
`;

export const CYPHER_ADD_EVIDENCE = `
MATCH (c:Claim {id:$claimId})
MERGE (s:Source {id:$sourceId})
ON CREATE SET s += $sourceProps, s.createdAt = datetime()
MERGE (c)-[r:HAS_EVIDENCE]->(s)
ON CREATE SET r.addedByUserId = $addedByUserId, r.addedAt = datetime()
WITH c
MATCH (c)-[:HAS_EVIDENCE]->(sx:Source)
WITH c, count(DISTINCT sx) AS ec
SET c.evidenceCount = ec
RETURN c
`;

export const CYPHER_VOTE_ON_CLAIM = `
MATCH (u:User {id:$userId})
MATCH (c:Claim {id:$claimId})

MERGE (u)-[v:VOTED_ON]->(c)
ON CREATE SET v.createdAt = datetime()
SET v.value = $value,
    v.weight = $weight,
    v.updatedAt = datetime()

WITH c
MATCH (:User)-[vx:VOTED_ON]->(c)
WITH c,
     sum(CASE WHEN vx.value = 1 THEN vx.weight ELSE 0 END) AS upW,
     sum(CASE WHEN vx.value = -1 THEN vx.weight ELSE 0 END) AS downW,
     count(DISTINCT vx) AS voters
SET c.upWeight = upW,
    c.downWeight = downW,
    c.uniqueVoters = voters,
    c.score = (upW - downW)

WITH c, c.score AS score, c.uniqueVoters AS voters, c.evidenceCount AS evidence
FOREACH (_ IN CASE WHEN score >= 6 AND voters >= 4 AND evidence >= 1 THEN [1] ELSE [] END |
  SET c.status = 'APPROVED'
)
FOREACH (_ IN CASE WHEN score <= -6 AND voters >= 4 THEN [1] ELSE [] END |
  SET c.status = 'REJECTED'
)
RETURN c
`;
