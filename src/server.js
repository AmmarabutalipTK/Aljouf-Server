"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = require("fastify");
const cors_1 = require("@fastify/cors");
const jwt_1 = require("@fastify/jwt");
const tickets_1 = require("./routes/tickets");
const auth_1 = require("./routes/auth");
async function start() {
    const app = (0, fastify_1.default)({
        logger: true,
    });
    await app.register(cors_1.default, {
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    });
    await app.register(jwt_1.default, {
        secret: process.env.JWT_SECRET ?? "changeme",
    });
    await app.register(auth_1.authRoutes);
    await app.register(tickets_1.ticketRoutes);
    await app.listen({
        port: 3006,
        host: "0.0.0.0",
    });
}
start();
