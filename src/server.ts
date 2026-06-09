import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";

import { ticketRoutes } from "./routes/tickets";
import { userRoutes } from "./routes/auth";

async function start() {
  const app = Fastify({
    logger: true,
  });

await app.register(cors, {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "changeme",
  });
  await app.register(userRoutes);
  await app.register(ticketRoutes);

  await app.listen({
    port: 3006,
    host: "0.0.0.0",
  });
}

start();