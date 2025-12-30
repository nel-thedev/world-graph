import neo4j, { Driver } from "neo4j-driver";
import { env } from "./env.js";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD), {
      disableLosslessIntegers: true
    });
  }
  return driver;
}

export async function runRead<T>(
  cypher: string,
  params: Record<string, unknown> = {},
  mapper?: (record: any) => T
): Promise<T[]> {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(cypher, params);
    return mapper ? res.records.map(mapper) : (res.records as unknown as T[]);
  } finally {
    await session.close();
  }
}

export async function runWrite<T>(
  cypher: string,
  params: Record<string, unknown> = {},
  mapper?: (record: any) => T
): Promise<T[]> {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const res = await session.run(cypher, params);
    return mapper ? res.records.map(mapper) : (res.records as unknown as T[]);
  } finally {
    await session.close();
  }
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
