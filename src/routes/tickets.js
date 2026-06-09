"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketRoutes = ticketRoutes;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
async function ticketRoutes(app) {
    app.get("/health", async (_, reply) => {
        try {
            await prisma_1.prisma.$queryRaw `SELECT 1`;
            return {
                status: "ok",
                database: "connected",
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            app.log.error(error);
            return reply.code(500).send({
                status: "error",
                database: "disconnected",
                timestamp: new Date().toISOString(),
            });
        }
    });
    // ==================================
    // TICKETS
    // ==================================
    app.get("/tickets", { preHandler: [auth_1.authenticate] }, async (request) => {
        const query = request.query;
        const tickets = await prisma_1.prisma.ticket.findMany({
            where: {
                ...(query.category && {
                    category: query.category,
                }),
                ...(query.status && {
                    status: query.status,
                }),
            },
            orderBy: {
                createdAt: "desc",
            },
            take: query.limit ? Number(query.limit) : 50,
        });
        return {
            tickets,
        };
    });
    app.get("/tickets/:id", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { id } = request.params;
        return prisma_1.prisma.ticket.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                notes: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });
    });
    app.get("/tickets/:id/notes", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { id } = request.params;
        return prisma_1.prisma.ticketNote.findMany({
            where: {
                ticketId: Number(id),
            },
            orderBy: {
                createdAt: "asc",
            },
        });
    });
    app.post("/tickets/:id/notes", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { id } = request.params;
        const { message } = request.body;
        const user = request.user;
        return prisma_1.prisma.ticketNote.create({
            data: {
                ticketId: Number(id),
                message,
                username: user.username,
            },
        });
    });
    app.delete("/tickets/notes/:noteId", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { noteId } = request.params;
        await prisma_1.prisma.ticketNote.delete({
            where: {
                id: Number(noteId),
            },
        });
        return {
            success: true,
        };
    });
    app.patch("/tickets/:id/status", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { id } = request.params;
        const { status } = request.body;
        return prisma_1.prisma.ticket.update({
            where: {
                id: Number(id),
            },
            data: {
                status,
            },
        });
    });
    // ==================================
    // STATS
    // ==================================
    app.get("/stats", { preHandler: [auth_1.authenticate] }, async () => {
        const [total, complaints, modifications, cancellations, returns, delays, newTickets, inProgress, resolved,] = await Promise.all([
            prisma_1.prisma.ticket.count(),
            prisma_1.prisma.ticket.count({
                where: {
                    category: client_1.Category.COMPLAINT,
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    category: client_1.Category.ORDER_MODIFICATION,
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    category: client_1.Category.ORDER_CANCELLATION,
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    category: client_1.Category.RETURN_REPLACEMENT,
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    category: client_1.Category.ORDER_DELAY_ERROR,
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    status: client_1.Status.IN_PROGRESS,
                },
            }),
            prisma_1.prisma.ticket.count({
                where: {
                    status: client_1.Status.RESOLVED,
                },
            }),
        ]);
        console.log({
            total,
            inProgress,
            resolved,
        });
        return {
            total,
            complaints,
            modifications,
            cancellations,
            returns,
            delays,
            new: newTickets,
            inProgress,
            resolved,
        };
    });
    app.get("/stats/trend", { preHandler: [auth_1.authenticate] }, async () => {
        const tickets = await prisma_1.prisma.ticket.findMany({
            select: {
                createdAt: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        const grouped = {};
        for (const ticket of tickets) {
            const date = ticket.createdAt
                .toISOString()
                .split("T")[0];
            grouped[date] = (grouped[date] || 0) + 1;
        }
        return Object.entries(grouped).map(([date, count]) => ({
            date,
            count,
        }));
    });
    app.get("/stats/category", { preHandler: [auth_1.authenticate] }, async () => {
        const data = await prisma_1.prisma.ticket.groupBy({
            by: ["category"],
            _count: {
                category: true,
            },
        });
        return data.map((item) => ({
            category: item.category,
            count: item._count.category,
        }));
    });
    app.patch("/tickets/:id", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { id } = request.params;
        const data = {
            ...request.body,
        };
        const user = request.user;
        if (data.complaintStatus !== undefined) {
            data.complaintStatusUpdatedBy =
                user.username;
            data.complaintStatusUpdatedAt =
                new Date();
            switch (data.complaintStatus) {
                case "تم حلها":
                    data.status =
                        client_1.Status.RESOLVED;
                    break;
                case "قيد المعالجة":
                    data.status =
                        client_1.Status.IN_PROGRESS;
                    break;
                case "بانتظار العميل":
                    data.status =
                        client_1.Status.PENDING_CUSTOMER;
                    break;
            }
        }
        if (data.status !== undefined) {
            switch (data.status) {
                case client_1.Status.RESOLVED:
                    data.complaintStatus =
                        "تم حلها";
                    break;
                case client_1.Status.IN_PROGRESS:
                    data.complaintStatus =
                        "قيد المعالجة";
                    break;
                case client_1.Status.PENDING_CUSTOMER:
                    data.complaintStatus =
                        "بانتظار العميل";
                    break;
            }
            data.complaintStatusUpdatedBy =
                user.username;
            data.complaintStatusUpdatedAt =
                new Date();
        }
        console.log("FINAL DATA", data);
        return prisma_1.prisma.ticket.update({
            where: {
                id: Number(id),
            },
            data,
        });
    });
    app.delete("/tickets/:id", { preHandler: [auth_1.authenticate] }, async (request) => {
        const { id } = request.params;
        await prisma_1.prisma.ticket.delete({
            where: {
                id: Number(id),
            },
        });
        return {
            success: true,
        };
    });

    
    // ==================================
    // BOT ENDPOINTS
    // ==================================
    // أبقِ جميع:
    // /bot/complaints
    // /bot/modifications
    // /bot/cancellations
    // /bot/returns
    // /bot/delays
    // كما هي مع:
    // { preHandler: [verifyApiKey] }
}
