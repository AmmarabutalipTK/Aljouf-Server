"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const prisma_1 = require("../lib/prisma");
//@ts-ignore
const bcryptjs_1 = require("bcryptjs");
async function authRoutes(app) {
    app.post("/auth/login", async (request, reply) => {
        const { username, password } = request.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (!user)
            return reply.status(401).send({ message: "بيانات غير صحيحة" });
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return reply.status(401).send({ message: "بيانات غير صحيحة" });
        const token = app.jwt.sign({ id: user.id, username: user.username });
        return { token };
    });
    app.post("/auth/register", async (request, reply) => {
        const { username, password } = request.body;
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { username, password: hashed },
        });
        return { id: user.id, username: user.username };
    });
}
