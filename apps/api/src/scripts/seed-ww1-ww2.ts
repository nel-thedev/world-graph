import { runWrite } from "../neo4j.js";
import crypto from "node:crypto";

type Person = { id: string; name: string };
type Event = {
  id: string;
  name: string;
  eventType: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
};

type Claim = {
  personId: string;
  eventId: string;
  relationshipType: string;
};

const SYSTEM_USER = "system";

function cId() {
  return `c:${crypto.randomUUID()}`;
}

async function wipe() {
  // Wipe the domain graph nodes. (Keeps User nodes if you want; you can also wipe users if desired.)
  await runWrite(`
MATCH (n)
WHERE n:Claim OR n:Person OR n:Event OR n:Source
DETACH DELETE n
`);
}

async function seed() {
  const people: Person[] = [
    { id: "p:woodrow_wilson", name: "Woodrow Wilson" },
    { id: "p:george_v", name: "George V" },
    { id: "p:kaiser_wilhelm_ii", name: "Wilhelm II" },
    { id: "p:franz_ferdinand", name: "Archduke Franz Ferdinand" },
    { id: "p:gav_princip", name: "Gavrilo Princip" },

    { id: "p:lloyd_george", name: "David Lloyd George" },
    { id: "p:georges_clemenceau", name: "Georges Clemenceau" },
    { id: "p:vittorio_orlando", name: "Vittorio Emanuele Orlando" },

    { id: "p:lenin", name: "Vladimir Lenin" },
    { id: "p:stalin", name: "Joseph Stalin" },
    { id: "p:trotsky", name: "Leon Trotsky" },

    { id: "p:hitler", name: "Adolf Hitler" },
    { id: "p:churchill", name: "Winston Churchill" },
    { id: "p:franklin_roosevelt", name: "Franklin D. Roosevelt" },
    { id: "p:truman", name: "Harry S. Truman" },

    { id: "p:mussolini", name: "Benito Mussolini" },
    { id: "p:hirohito", name: "Hirohito" },
    { id: "p:tojo", name: "Hideki Tojo" },

    { id: "p:charles_de_gaulle", name: "Charles de Gaulle" },
    { id: "p:petain", name: "Philippe Pétain" },

    { id: "p:strawman", name: "Neville Chamberlain" }, // typo-safe id, name correct
    { id: "p:eden", name: "Anthony Eden" },

    { id: "p:einstein", name: "Albert Einstein" },
    { id: "p:oppenheimer", name: "J. Robert Oppenheimer" },
    { id: "p:fermi", name: "Enrico Fermi" },
    { id: "p:szilard", name: "Leo Szilard" },

    { id: "p:chiang_kai_shek", name: "Chiang Kai-shek" },
    { id: "p:mao", name: "Mao Zedong" },

    { id: "p:franco", name: "Francisco Franco" },
    { id: "p:emperor_haile_selassie", name: "Haile Selassie" }
  ];

  const events: Event[] = [
    { id: "e:assassination_ferdinand", name: "Assassination of Archduke Franz Ferdinand", eventType: "ASSASSINATION", startDate: "1914-06-28" },
    { id: "e:world_war_1", name: "World War I", eventType: "WAR", startDate: "1914-07-28", endDate: "1918-11-11" },
    { id: "e:treaty_versailles", name: "Treaty of Versailles", eventType: "TREATY", startDate: "1919-06-28" },

    { id: "e:russian_revolution", name: "Russian Revolution", eventType: "REVOLUTION", startDate: "1917-03-08", endDate: "1917-11-07" },
    { id: "e:formation_ussr", name: "Formation of the Soviet Union", eventType: "FOUNDATION", startDate: "1922-12-30" },

    { id: "e:great_depression", name: "Great Depression", eventType: "ECONOMIC_CRISIS", startDate: "1929-10-24" },

    { id: "e:rise_nazi_party", name: "Nazi Party rises to power in Germany", eventType: "POLITICAL_SHIFT", startDate: "1933-01-30" },
    { id: "e:italy_ethiopia_war", name: "Second Italo-Ethiopian War", eventType: "WAR", startDate: "1935-10-03", endDate: "1936-05-05" },
    { id: "e:spanish_civil_war", name: "Spanish Civil War", eventType: "WAR", startDate: "1936-07-17", endDate: "1939-04-01" },

    { id: "e:munich_agreement", name: "Munich Agreement", eventType: "TREATY", startDate: "1938-09-30" },

    { id: "e:world_war_2", name: "World War II", eventType: "WAR", startDate: "1939-09-01", endDate: "1945-09-02" },
    { id: "e:invasion_poland", name: "Invasion of Poland", eventType: "BATTLE_CAMPAIGN", startDate: "1939-09-01", endDate: "1939-10-06" },

    { id: "e:operation_barbarossa", name: "Operation Barbarossa", eventType: "BATTLE_CAMPAIGN", startDate: "1941-06-22" },
    { id: "e:pearl_harbor", name: "Attack on Pearl Harbor", eventType: "ATTACK", startDate: "1941-12-07" },

    { id: "e:d_day", name: "D-Day (Normandy landings)", eventType: "BATTLE", startDate: "1944-06-06" },
    { id: "e:yalta_conference", name: "Yalta Conference", eventType: "CONFERENCE", startDate: "1945-02-04", endDate: "1945-02-11" },

    { id: "e:manhattan_project", name: "Manhattan Project", eventType: "PROGRAM", startDate: "1942-08-13", endDate: "1946-12-31" },
    { id: "e:hiroshima_nagasaki", name: "Atomic bombings of Hiroshima and Nagasaki", eventType: "ATTACK", startDate: "1945-08-06", endDate: "1945-08-09" }
  ];

  // Claims (approved) – keep relationship types consistent and few
  const claims: Claim[] = [
    // assassination
    { personId: "p:franz_ferdinand", eventId: "e:assassination_ferdinand", relationshipType: "VICTIM_OF" },
    { personId: "p:gav_princip", eventId: "e:assassination_ferdinand", relationshipType: "PARTICIPATED_IN" },

    // WWI
    { personId: "p:woodrow_wilson", eventId: "e:world_war_1", relationshipType: "LED" },
    { personId: "p:george_v", eventId: "e:world_war_1", relationshipType: "LED" },
    { personId: "p:kaiser_wilhelm_ii", eventId: "e:world_war_1", relationshipType: "LED" },

    // Versailles
    { personId: "p:woodrow_wilson", eventId: "e:treaty_versailles", relationshipType: "SIGNED" },
    { personId: "p:lloyd_george", eventId: "e:treaty_versailles", relationshipType: "SIGNED" },
    { personId: "p:georges_clemenceau", eventId: "e:treaty_versailles", relationshipType: "SIGNED" },
    { personId: "p:vittorio_orlando", eventId: "e:treaty_versailles", relationshipType: "SIGNED" },

    // Russian Revolution + USSR
    { personId: "p:lenin", eventId: "e:russian_revolution", relationshipType: "LED" },
    { personId: "p:trotsky", eventId: "e:russian_revolution", relationshipType: "PARTICIPATED_IN" },
    { personId: "p:stalin", eventId: "e:formation_ussr", relationshipType: "LED" },

    // Great Depression (not “led”, but participated)
    { personId: "p:franklin_roosevelt", eventId: "e:great_depression", relationshipType: "PARTICIPATED_IN" },

    // Rise of Nazis
    { personId: "p:hitler", eventId: "e:rise_nazi_party", relationshipType: "LED" },

    // Italy-Ethiopia
    { personId: "p:mussolini", eventId: "e:italy_ethiopia_war", relationshipType: "LED" },
    { personId: "p:emperor_haile_selassie", eventId: "e:italy_ethiopia_war", relationshipType: "LED" },

    // Spanish Civil War
    { personId: "p:franco", eventId: "e:spanish_civil_war", relationshipType: "LED" },

    // Munich
    { personId: "p:strawman", eventId: "e:munich_agreement", relationshipType: "SIGNED" },
    { personId: "p:hitler", eventId: "e:munich_agreement", relationshipType: "SIGNED" },

    // WWII + key operations
    { personId: "p:hitler", eventId: "e:world_war_2", relationshipType: "LED" },
    { personId: "p:churchill", eventId: "e:world_war_2", relationshipType: "LED" },
    { personId: "p:franklin_roosevelt", eventId: "e:world_war_2", relationshipType: "LED" },
    { personId: "p:stalin", eventId: "e:world_war_2", relationshipType: "LED" },
    { personId: "p:hirohito", eventId: "e:world_war_2", relationshipType: "LED" },

    { personId: "p:hitler", eventId: "e:invasion_poland", relationshipType: "LED" },
    { personId: "p:stalin", eventId: "e:invasion_poland", relationshipType: "PARTICIPATED_IN" },

    { personId: "p:hitler", eventId: "e:operation_barbarossa", relationshipType: "LED" },
    { personId: "p:stalin", eventId: "e:operation_barbarossa", relationshipType: "OPPOSED" },

    { personId: "p:tojo", eventId: "e:pearl_harbor", relationshipType: "LED" },
    { personId: "p:franklin_roosevelt", eventId: "e:pearl_harbor", relationshipType: "OPPOSED" },

    { personId: "p:churchill", eventId: "e:d_day", relationshipType: "LED" },
    { personId: "p:charles_de_gaulle", eventId: "e:d_day", relationshipType: "PARTICIPATED_IN" },

    { personId: "p:churchill", eventId: "e:yalta_conference", relationshipType: "PARTICIPATED_IN" },
    { personId: "p:franklin_roosevelt", eventId: "e:yalta_conference", relationshipType: "PARTICIPATED_IN" },
    { personId: "p:stalin", eventId: "e:yalta_conference", relationshipType: "PARTICIPATED_IN" },

    // Manhattan Project + bombs
    { personId: "p:oppenheimer", eventId: "e:manhattan_project", relationshipType: "LED" },
    { personId: "p:fermi", eventId: "e:manhattan_project", relationshipType: "PARTICIPATED_IN" },
    { personId: "p:szilard", eventId: "e:manhattan_project", relationshipType: "PARTICIPATED_IN" },
    { personId: "p:einstein", eventId: "e:manhattan_project", relationshipType: "PARTICIPATED_IN" },

    { personId: "p:truman", eventId: "e:hiroshima_nagasaki", relationshipType: "LED" }
  ];

  // Upsert people/events
  await runWrite(
    `
UNWIND $people AS p
MERGE (n:Person {id:p.id})
SET n.name = p.name,
    n.updatedAt = datetime()
`,
    { people }
  );

  await runWrite(
    `
UNWIND $events AS e
MERGE (n:Event {id:e.id})
SET n.name = e.name,
    n.eventType = e.eventType,
    n.startDate = date(e.startDate),
    n.endDate = CASE WHEN e.endDate IS NULL THEN NULL ELSE date(e.endDate) END,
    n.updatedAt = datetime()
`,
    { events }
  );

  // Create a per-event placeholder source (keeps evidence logic working)
  await runWrite(
    `
UNWIND $events AS e
MERGE (s:Source {id: "src:wikidata:" + e.id})
SET s.sourceType = "WIKIDATA",
    s.title = "Wikidata seed for " + e.name,
    s.publisher = "Wikidata",
    s.createdAt = datetime()
`,
    { events }
  );

  // Create claims as APPROVED with initial score/votes baked in
  await runWrite(
    `
UNWIND $claims AS x
MATCH (p:Person {id:x.personId})
MATCH (e:Event {id:x.eventId})
MATCH (s:Source {id: "src:wikidata:" + x.eventId})
CREATE (c:Claim {
  id: $idPrefix + randomUUID(),
  claimType: "PERSON_EVENT",
  relationshipType: x.relationshipType,
  status: "APPROVED",
  score: 10,
  upWeight: 10,
  downWeight: 0,
  uniqueVoters: 5,
  evidenceCount: 1,
  createdAt: datetime(),
  createdByUserId: $systemUser
})
CREATE (p)-[:CLAIM_SUBJECT]->(c)
CREATE (c)-[:CLAIM_OBJECT]->(e)
CREATE (c)-[:HAS_EVIDENCE {addedByUserId:$systemUser, addedAt:datetime()}]->(s)
`,
    { claims, systemUser: SYSTEM_USER, idPrefix: "c:" }
  );
}

async function main() {
  console.log("Wiping graph...");
  await wipe();
  console.log("Seeding WWI→WWII slice...");
  await seed();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
