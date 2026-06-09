import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { Category, Status } from "@prisma/client";
import { authenticate } from "../middleware/auth";


export async function ticketRoutes(app: FastifyInstance) {


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
        limit?: string;
      };

      const tickets = await prisma.ticket.findMany({
        where: {
          ...(query.category && {
            category: query.category as Category,
          }),
          ...(query.status && {
            status: query.status as Status,
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
    }
  );

app.get(
  "/tickets/:id",
  { preHandler: [authenticate] },
  async (request) => {
    const { id } = request.params as {
      id: string;
    };

return prisma.ticket.findUnique({
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
  }
);

app.get(
  "/tickets/:id/notes",
  { preHandler: [authenticate] },
  async (request) => {
    const { id } = request.params as {
      id: string;
    };

    return prisma.ticketNote.findMany({
      where: {
        ticketId: Number(id),
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }
);

app.post(
  "/tickets/:id/notes",
  { preHandler: [authenticate] },
  async (request) => {
    const { id } = request.params as {
      id: string;
    };

    const { message } = request.body as {
      message: string;
    };

    const user = request.user as {
      username: string;
    };

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
    const { noteId } = request.params as {
      noteId: string;
    };

    await prisma.ticketNote.delete({
      where: {
        id: Number(noteId),
      },
    });

    return {
      success: true,
    };
  }
);

  app.patch(
    "/tickets/:id/status",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as {
        id: string;
      };

      const { status } = request.body as {
        status: Status;
      };

      return prisma.ticket.update({
        where: {
          id: Number(id),
        },
        data: {
          status,
        },
      });
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

        prisma.ticket.count({
          where: {
            category: Category.COMPLAINT,
          },
        }),

        prisma.ticket.count({
          where: {
            category: Category.ORDER_MODIFICATION,
          },
        }),

        prisma.ticket.count({
          where: {
            category: Category.ORDER_CANCELLATION,
          },
        }),

        prisma.ticket.count({
          where: {
            category: Category.RETURN_REPLACEMENT,
          },
        }),

        prisma.ticket.count({
          where: {
            category: Category.ORDER_DELAY_ERROR,
          },
        }),

        prisma.ticket.count({
          where: {
            createdAt: {
              gte: new Date(
                Date.now() - 24 * 60 * 60 * 1000
              ),
            },
          },
        }),

        prisma.ticket.count({
          where: {
            status: Status.IN_PROGRESS,
          },
        }),

        prisma.ticket.count({
          where: {
            status: Status.RESOLVED,
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
    }
  );

  app.get(
    "/stats/trend",
    { preHandler: [authenticate] },
    async () => {
      const tickets = await prisma.ticket.findMany({
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const grouped: Record<string, number> = {};

      for (const ticket of tickets) {
        const date = ticket.createdAt
          .toISOString()
          .split("T")[0];

        grouped[date] = (grouped[date] || 0) + 1;
      }

      return Object.entries(grouped).map(
        ([date, count]) => ({
          date,
          count,
        })
      );
    }
  );

  app.get(
    "/stats/category",
    { preHandler: [authenticate] },
    async () => {
      const data = await prisma.ticket.groupBy({
        by: ["category"],
        _count: {
          category: true,
        },
      });

      return data.map((item) => ({
        category: item.category,
        count: item._count.category,
      }));
    }
  );

app.patch(
  "/tickets/:id",
  { preHandler: [authenticate] },
  async (request) => {
    const { id } = request.params as {
      id: string;
    };

    const data = {
      ...(request.body as any),
    };

    const user = request.user as {
      id: number;
      username: string;
      role: string;
    };

    if (data.complaintStatus !== undefined) {
      data.complaintStatusUpdatedBy =
        user.username;

      data.complaintStatusUpdatedAt =
        new Date();

      switch (data.complaintStatus) {
        case "تم حلها":
          data.status =
            Status.RESOLVED;
          break;

        case "قيد المعالجة":
          data.status =
            Status.IN_PROGRESS;
          break;

        case "بانتظار العميل":
          data.status =
            Status.PENDING_CUSTOMER;
          break;
      }
    }

    if (data.status !== undefined) {
      switch (data.status) {
        case Status.RESOLVED:
          data.complaintStatus =
            "تم حلها";
          break;

        case Status.IN_PROGRESS:
          data.complaintStatus =
            "قيد المعالجة";
          break;

        case Status.PENDING_CUSTOMER:
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

    return prisma.ticket.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }
);

app.delete(
  "/tickets/:id",
  { preHandler: [authenticate] },
  async (request) => {
    const { id } =
      request.params as {
        id: string;
      };

    await prisma.ticket.delete({
      where: {
        id: Number(id),
      },
    });

    return {
      success: true,
    };
  }
);

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