"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const prisma_1 = require("../lib/prisma");
const admin_1 = require("../middleware/admin");
const bcrypt = require("bcryptjs");
async function userRoutes(app) {
    app.get("/users", { preHandler: [admin_1.adminOnly] }, async () => {
        return prisma_1.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    });
    app.post("/users", { preHandler: [admin_1.adminOnly] }, async (request) => {
        const body = request.body;
        const hashed = await bcrypt.hash(body.password, 10);
        return prisma_1.prisma.user.create({
            data: {
                username: body.username,
                password: hashed,
                role: body.role,
            },
            select: {
                id: true,
                username: true,
                role: true,
            },
        });
    });
    app.patch("/users/:id", { preHandler: [admin_1.adminOnly] }, async (request) => {
        const { id } = request.params;
        const body = request.body;
        const data = {};
        if (body.username)
            data.username = body.username;
        if (body.role)
            data.role = body.role;
        if (body.password) {
            data.password = await bcrypt.hash(body.password, 10);
        }
        return prisma_1.prisma.user.update({
            where: {
                id: Number(id),
            },
            data,
        });
    });
    app.delete("/users/:id", { preHandler: [admin_1.adminOnly] }, async (request) => {
        const { id } = request.params;
        await prisma_1.prisma.user.delete({
            where: {
                id: Number(id),
            },
        });
        return {
            success: true,
        };
    });
    app.post("/auth/login", async (request, reply) => {
        const { username, password } = request.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: {
                username,
            },
        });
        if (!user) {
            return reply.status(401).send({
                message: "اسم المستخدم أو كلمة المرور غير صحيحة",
            });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return reply.status(401).send({
                message: "اسم المستخدم أو كلمة المرور غير صحيحة",
            });
        }
        const token = app.jwt.sign({
            id: user.id,
            username: user.username,
            role: user.role,
        });
        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        };
    });
}
