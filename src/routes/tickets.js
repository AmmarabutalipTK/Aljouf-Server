"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketRoutes = ticketRoutes;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
function parseQuantity(value) {
    if (!value)
        return null;
    const v = value.trim();
    const map = {
        "واحد": 1,
        "اثنين": 2,
        "اثنان": 2,
        "ثلاثة": 3,
        "أربعة": 4,
        "خمسة": 5,
    };
    if (map[v])
        return map[v];
    const parsed = Number(v);
    return Number.isNaN(parsed) ? null : parsed;
}
function parseDate(value) {
    if (!value)
        return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
}
async function verifyApiKey(request, reply) {
    const apiKey = request.headers["x-api-key"];
    if (apiKey !== process.env.BOT_API_KEY) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
}
async function ticketRoutes(app) {
    // ─── Tickets ───────────────────────────────────────────────
    app.get("/tickets", async (request) => {
        const query = request.query;
        const tickets = await prisma_1.prisma.ticket.findMany({
            where: {
                ...(query.category && { category: query.category }),
            },
            take: query.limit ? Number(query.limit) : 20,
            orderBy: { createdAt: "desc" },
        });
        return { tickets, query };
    });
    app.get("/tickets/:id", async (request) => {
        const { id } = request.params;
        return prisma_1.prisma.ticket.findUnique({ where: { id: Number(id) } });
    });
    app.post("/tickets", async (request) => {
        return prisma_1.prisma.ticket.create({ data: request.body });
    });
    app.patch("/tickets/:id", async (request) => {
        const { id } = request.params;
        return prisma_1.prisma.ticket.update({
            where: { id: Number(id) },
            data: request.body,
        });
    });
    app.delete("/tickets/:id", async (request) => {
        const { id } = request.params;
        await prisma_1.prisma.ticket.delete({ where: { id: Number(id) } });
        return { success: true };
    });
    // ─── Stats ─────────────────────────────────────────────────
    app.get("/stats", async () => {
        const [total, complaints, modifications, cancellations, returns, delays, newTickets, inProgress, resolved] = await Promise.all([
            prisma_1.prisma.ticket.count(),
            prisma_1.prisma.ticket.count({ where: { category: "COMPLAINT" } }),
            prisma_1.prisma.ticket.count({ where: { category: "ORDER_MODIFICATION" } }),
            prisma_1.prisma.ticket.count({ where: { category: "ORDER_CANCELLATION" } }),
            prisma_1.prisma.ticket.count({ where: { category: "RETURN_REPLACEMENT" } }),
            prisma_1.prisma.ticket.count({ where: { category: "ORDER_DELAY_ERROR" } }),
            prisma_1.prisma.ticket.count({
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            }),
            prisma_1.prisma.ticket.count({ where: { complaintStatus: null } }),
            prisma_1.prisma.ticket.count({ where: { complaintStatus: "تم حلها" } }),
        ]);
        return { total, complaints, modifications, cancellations, returns, delays, new: newTickets, inProgress, resolved };
    });
    app.get("/stats/trend", async () => {
        const tickets = await prisma_1.prisma.ticket.findMany({
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        });
        const grouped = {};
        for (const ticket of tickets) {
            const date = ticket.createdAt.toISOString().split("T")[0];
            grouped[date] = (grouped[date] || 0) + 1;
        }
        return Object.entries(grouped).map(([date, count]) => ({ date, count }));
    });
    app.get("/stats/category", async () => {
        const data = await prisma_1.prisma.ticket.groupBy({
            by: ["category"],
            _count: { category: true },
        });
        return data.map((item) => ({
            category: item.category.toLowerCase(),
            label: item.category,
            count: item._count.category,
        }));
    });
    // ─── Bot endpoints ─────────────────────────────────────────
    app.post("/bot/complaints", { preHandler: [verifyApiKey] }, async (request) => {
        const body = request.body;
        return prisma_1.prisma.ticket.create({
            data: {
                category: client_1.Category.COMPLAINT,
                customerName: body.customerName,
                phone: body.phone,
                description: body.description,
                complaintStatus: body.complaintStatus ?? null,
                complaintSubmittedAt: parseDate(body.complaintSubmittedAt),
                botPhone: body.botPhone,
                aljoufNote: body.aljoufNote,
                customerNote: body.customerNote,
            },
        });
    });
    app.post("/bot/modifications", { preHandler: [verifyApiKey] }, async (request) => {
        const body = request.body;
        return prisma_1.prisma.ticket.create({
            data: {
                category: client_1.Category.ORDER_MODIFICATION,
                orderNumber: body.orderNumber,
                operation: body.operation,
                productType: body.productType,
                quantity: parseQuantity(body.quantity),
                botPhone: body.botPhone,
                imageUrl: body.imageUrl,
                aljoufNote: body.aljoufNote,
                customerNote: body.customerNote,
            },
        });
    });
    app.post("/bot/cancellations", { preHandler: [verifyApiKey] }, async (request) => {
        const body = request.body;
        return prisma_1.prisma.ticket.create({
            data: {
                category: client_1.Category.ORDER_CANCELLATION,
                orderNumber: body.orderNumber,
                operation: body.operation,
                productType: body.productType,
                quantity: parseQuantity(body.quantity),
                botPhone: body.botPhone,
                complaintSubmittedAt: parseDate(body.complaintSubmittedAt),
                imageUrl: body.imageUrl,
                aljoufNote: body.aljoufNote,
                customerNote: body.customerNote,
            },
        });
    });
    app.post("/bot/returns", { preHandler: [verifyApiKey] }, async (request) => {
        const body = request.body;
        return prisma_1.prisma.ticket.create({
            data: {
                category: client_1.Category.RETURN_REPLACEMENT,
                orderNumber: body.orderNumber,
                shipmentNumber: body.shipmentNumber,
                phone: body.phone,
                subCategory: body.subCategory,
                reason: body.reason,
                imageUrl: body.imageUrl,
                botPhone: body.botPhone,
                aljoufNote: body.aljoufNote,
                customerNote: body.customerNote,
                complaintSubmittedAt: parseDate(body.complaintSubmittedAt),
            },
        });
    });
    app.post("/bot/delays", { preHandler: [verifyApiKey] }, async (request) => {
        const body = request.body;
        return prisma_1.prisma.ticket.create({
            data: {
                category: client_1.Category.ORDER_DELAY_ERROR,
                orderNumber: body.orderNumber,
                phone: body.phone,
                title: body.title,
                subCategory: body.subCategory,
                description: body.description,
                location: body.location,
                imageUrl: body.imageUrl,
                botPhone: body.botPhone,
                aljoufNote: body.aljoufNote,
                customerNote: body.customerNote,
                complaintSubmittedAt: parseDate(body.complaintSubmittedAt),
            },
        });
    });
}
