export const CYPHER_PERSON_NEIGHBORHOOD_GRAPH = `
MATCH (center:Person {id:$personId})

// claims from center -> events
MATCH (center)-[:CLAIM_SUBJECT]->(c1:Claim)-[:CLAIM_OBJECT]->(e:Event)
WHERE ($includePending = true OR c1.status = 'APPROVED')

WITH center, collect(DISTINCT e)[0..toInteger($limitEvents)] AS events

// other people connected through those events
UNWIND events AS ev
MATCH (p:Person)-[:CLAIM_SUBJECT]->(c2:Claim)-[:CLAIM_OBJECT]->(ev)
WHERE p <> center AND ($includePending = true OR c2.status = 'APPROVED')

WITH center, events, collect(DISTINCT p)[0..toInteger($limitPeople)] AS people

// collect all relevant claims for edges
WITH center, events, people
UNWIND events AS ev
MATCH (s:Person)-[:CLAIM_SUBJECT]->(c:Claim)-[:CLAIM_OBJECT]->(ev)
WHERE s = center OR s IN people
  AND ($includePending = true OR c.status = 'APPROVED')

RETURN
  center,
  events,
  people,
  collect({
    source: s.id,
    target: ev.id,
    id: c.id,
    relationshipType: c.relationshipType,
    status: c.status,
    score: coalesce(c.score,0)
  }) AS claimEdges
`;

export const CYPHER_EVENT_NEIGHBORHOOD_GRAPH = `
MATCH (center:Event {id: $eventId})

// People directly connected to this event
MATCH (p:Person)-[:CLAIM_SUBJECT]->(c1:Claim)-[:CLAIM_OBJECT]->(center)
WHERE ($includePending = true OR c1.status = 'APPROVED')
WITH center, collect(DISTINCT p)[0..toInteger($limitPeople)] AS people

// Other events those people participated in
UNWIND people AS peep
MATCH (peep)-[:CLAIM_SUBJECT]->(c2:Claim)-[:CLAIM_OBJECT]->(e2:Event)
WHERE e2 <> center AND ($includePending = true OR c2.status = 'APPROVED')
WITH center, people, collect(DISTINCT e2)[0..toInteger($limitEvents)] AS events

// Collect claim edges for:
// - people -> center event
// - people -> other related events
WITH center, people, events
WITH center, people, events, (events + [center]) AS allEvents

UNWIND allEvents AS ev
MATCH (s:Person)-[:CLAIM_SUBJECT]->(c:Claim)-[:CLAIM_OBJECT]->(ev)
WHERE s IN people
  AND ($includePending = true OR c.status = 'APPROVED')

RETURN
  center,
  events,
  people,
  collect({
    source: s.id,
    target: ev.id,
    id: c.id,
    relationshipType: c.relationshipType,
    status: c.status,
    score: coalesce(c.score, 0)
  }) AS claimEdges
`;