import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { Category, Status } from "@prisma/client";
import { authenticate } from "../middleware/auth";

// ==================================
// HELPERS
// ==================================

function parseQuantity(value?: string): number | null {
  if (!value) return null;
  const v = value.trim();
  const map: Record<string, number> = {
    واحد: 1,
    اثنين: 2,
    اثنان: 2,
    ثلاثة: 3,
    أربعة: 4,
    خمسة: 5,
  };
  if (map[v]) return map[v];
  const parsed = Number(v);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

async function verifyApiKey(request: any, reply: any) {
  const apiKey = request.headers["x-api-key"];
  if (apiKey !== process.env.BOT_API_KEY) {
    return reply.status(401).send({ message: "Unauthorized" });
  }
}

// ==================================
// ROUTES
// ==================================

export async function ticketRoutes(app: FastifyInstance) {
  // ==================================
  // BOT ENDPOINTS
  // ==================================

  app.post(
    "/bot/complaints",
    { preHandler: [verifyApiKey] },
    async (request) => {
      const body = request.body as {
        customerName?: string;
        phone?: string;
        description?: string;
        complaintStatus?: string;
        complaintSubmittedAt?: string;
        botPhone?: string;
        aljoufNote?: string;
        customerNote?: string;
      };

      return prisma.ticket.create({
        data: {
          category: Category.COMPLAINT,
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
    }
  );

  app.post(
    "/bot/modifications",
    { preHandler: [verifyApiKey] },
    async (request) => {
      const body = request.body as {
        orderNumber?: string;
        operation?: string;
        productType?: string;
        quantity?: string;
        botPhone?: string;
        imageUrl?: string;
        aljoufNote?: string;
        customerNote?: string;
        complaintSubmittedAt?: string;
      };

      return prisma.ticket.create({
        data: {
          category: Category.ORDER_MODIFICATION,
          orderNumber: body.orderNumber,
          operation: body.operation,
          productType: body.productType,
          quantity: parseQuantity(body.quantity),
          botPhone: body.botPhone,
          imageUrl: body.imageUrl,
          aljoufNote: body.aljoufNote,
          customerNote: body.customerNote,
          complaintSubmittedAt: parseDate(body.complaintSubmittedAt),
        },
      });
    }
  );

  app.post(
    "/bot/cancellations",
    { preHandler: [verifyApiKey] },
    async (request) => {
      const body = request.body as {
        orderNumber?: string;
        operation?: string;
        productType?: string;
        quantity?: string;
        botPhone?: string;
        complaintSubmittedAt?: string;
        imageUrl?: string;
        aljoufNote?: string;
        customerNote?: string;
      };

      return prisma.ticket.create({
        data: {
          category: Category.ORDER_CANCELLATION,
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
    }
  );

  app.post(
    "/bot/returns",
    { preHandler: [verifyApiKey] },
    async (request) => {
      const body = request.body as {
        orderNumber?: string;
        shipmentNumber?: string;
        phone?: string;
        subCategory?: string;
        reason?: string;
        imageUrl?: string;
        botPhone?: string;
        aljoufNote?: string;
        customerNote?: string;
        complaintSubmittedAt?: string;
      };

      return prisma.ticket.create({
        data: {
          category: Category.RETURN_REPLACEMENT,
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
    }
  );

  app.post(
    "/bot/delays",
    { preHandler: [verifyApiKey] },
    async (request) => {
      const body = request.body as {
        orderNumber?: string;
        phone?: string;
        title?: string;
        subCategory?: string;
        description?: string;
        location?: string;
        imageUrl?: string;
        botPhone?: string;
        aljoufNote?: string;
        customerNote?: string;
        complaintSubmittedAt?: string;
        quantity?: string;
      };

      return prisma.ticket.create({
        data: {
          category: Category.ORDER_DELAY_ERROR,
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
          quantity: body.quantity ? parseQuantity(body.quantity) : null,
          complaintSubmittedAt: parseDate(body.complaintSubmittedAt),
        },
      });
    }
  );

  // ==================================
  // HEALTH
  // ==================================

  app.get("/health", async (_, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: "connected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
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

app.get(
  "/tickets",
  { preHandler: [authenticate] },
  async (request) => {
    const query = request.query as {
      category?: string;
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 50);
    const search = query.search?.trim();

    const where: any = {};

    if (query.category) {
      where.category =
        query.category as Category;
    }

    if (query.status) {
      where.status =
        query.status as Status;
    }

    if (search) {
      where.OR = [
        {
          customerName: {
            contains: search,
          },
        },
        {
          orderNumber: {
            contains: search,
          },
        },
        {
          phone: {
            contains: search,
          },
        },
        {
          botPhone: {
            contains: search,
          },
        },
        {
          shipmentNumber: {
            contains: search,
          },
        },
        {
          description: {
            contains: search,
          },
        },
        {
          customerNote: {
            contains: search,
          },
        },
        {
          aljoufNote: {
            contains: search,
          },
        },
      ];
    }

    console.log(
      "WHERE:",
      JSON.stringify(where, null, 2)
    );

    const [tickets, total] =
      await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        prisma.ticket.count({
          where,
        }),
      ]);

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit
      ),
    };
  }
);


app.post(
  "/tickets",
  { preHandler: [authenticate] },
  async (request) => {
    const { data } = request.body as any;

    return prisma.ticket.create({
      data: {
        customerName: data.customerName,
        phone: data.phone,
        orderNumber: data.orderNumber,
        category: data.category,
        customerNote: data.notes,
      },
    });
  }
);

  app.get(
    "/tickets/:id",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };

      return prisma.ticket.findUnique({
        where: { id: Number(id) },
        include: {
          notes: { orderBy: { createdAt: "asc" } },
        },
      });
    }
  );

  app.patch(
    "/tickets/:id",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = { ...(request.body as any) };
      const user = request.user as { id: number; username: string; role: string };

      if (data.complaintStatus !== undefined) {
        data.complaintStatusUpdatedBy = user.username;
        data.complaintStatusUpdatedAt = new Date();
        switch (data.complaintStatus) {
          case "تم حلها":
            data.status = Status.RESOLVED;
            break;
          case "قيد المعالجة":
            data.status = Status.IN_PROGRESS;
            break;
          case "بانتظار العميل":
            data.status = Status.PENDING_CUSTOMER;
            break;
        }
      }

      if (data.status !== undefined) {
        data.complaintStatusUpdatedBy = user.username;
        data.complaintStatusUpdatedAt = new Date();
        switch (data.status) {
          case Status.RESOLVED:
            data.complaintStatus = "تم حلها";
            break;
          case Status.IN_PROGRESS:
            data.complaintStatus = "قيد المعالجة";
            break;
          case Status.PENDING_CUSTOMER:
            data.complaintStatus = "بانتظار العميل";
            break;
        }
      }

      return prisma.ticket.update({
        where: { id: Number(id) },
        data,
      });
    }
  );

  app.patch(
    "/tickets/:id/status",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: Status };

      return prisma.ticket.update({
        where: { id: Number(id) },
        data: { status },
      });
    }
  );

  app.delete(
    "/tickets/:id",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };

await prisma.ticket.delete({
  where: { id: parseInt(id) },
});


      return { success: true };
    }
  );

  // ==================================
  // NOTES
  // ==================================

  app.get(
    "/tickets/:id/notes",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };

      return prisma.ticketNote.findMany({
        where: { ticketId: Number(id) },
        orderBy: { createdAt: "asc" },
      });
    }
  );

  app.post(
    "/tickets/:id/notes",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { message } = request.body as { message: string };
      const user = request.user as { username: string };

      return prisma.ticketNote.create({
        data: {
          ticketId: Number(id),
          message,
          username: user.username,
        },
      });
    }
  );

  app.delete(
    "/tickets/notes/:noteId",
    { preHandler: [authenticate] },
    async (request) => {
      const { noteId } = request.params as { noteId: string };

      await prisma.ticketNote.delete({ where: { id: Number(noteId) } });

      return { success: true };
    }
  );

  // ==================================
  // STATS
  // ==================================

  app.get(
    "/stats",
    { preHandler: [authenticate] },
    async () => {
      const [
        total,
        complaints,
        modifications,
        cancellations,
        returns,
        delays,
        newTickets,
        inProgress,
        resolved,
      ] = await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.count({ where: { category: Category.COMPLAINT } }),
        prisma.ticket.count({ where: { category: Category.ORDER_MODIFICATION } }),
        prisma.ticket.count({ where: { category: Category.ORDER_CANCELLATION } }),
        prisma.ticket.count({ where: { category: Category.RETURN_REPLACEMENT } }),
        prisma.ticket.count({ where: { category: Category.ORDER_DELAY_ERROR } }),
        prisma.ticket.count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
        prisma.ticket.count({ where: { status: Status.IN_PROGRESS } }),
        prisma.ticket.count({ where: { status: Status.RESOLVED } }),
      ]);

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
    }
  );

  app.get(
    "/stats/trend",
    { preHandler: [authenticate] },
    async () => {
      const tickets = await prisma.ticket.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const grouped: Record<string, number> = {};
      for (const ticket of tickets) {
        const date = ticket.createdAt.toISOString().split("T")[0];
        grouped[date] = (grouped[date] || 0) + 1;
      }

      return Object.entries(grouped).map(([date, count]) => ({ date, count }));
    }
  );

  app.get(
    "/stats/category",
    { preHandler: [authenticate] },
    async () => {
      const data = await prisma.ticket.groupBy({
        by: ["category"],
        _count: { category: true },
      });

      return data.map((item) => ({
        category: item.category,
        count: item._count.category,
      }));
    }
  );
}