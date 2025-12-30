import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { closeDriver } from "./neo4j.js";
import { healthRoutes } from "./routes/health.js";
import { searchRoutes } from "./routes/search.js";
import { peopleRoutes } from "./routes/people.js";
import { claimsRoutes } from "./routes/claims.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.CORS_ORIGIN });

await app.register(healthRoutes);
await app.register(searchRoutes);
await app.register(peopleRoutes);
await app.register(claimsRoutes);

app.addHook("onClose", async () => {
  await closeDriver();
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
