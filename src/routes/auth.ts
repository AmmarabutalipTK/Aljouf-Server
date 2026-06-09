import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { adminOnly } from "../middleware/admin";
import * as bcrypt from  "bcryptjs";



export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/users",
    { preHandler: [adminOnly] },
    async () => {
      return prisma.user.findMany({
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
    }
  );

  app.post(
    "/users",
    { preHandler: [adminOnly] },
    async (request) => {
      const body = request.body as {
        username: string;
        password: string;
        role: "ADMIN" | "USER";
      };

      const hashed = await bcrypt.hash(
        body.password,
        10
      );

      return prisma.user.create({
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
    }
  );

  app.patch(
    "/users/:id",
    { preHandler: [adminOnly] },
    async (request) => {
      const { id } = request.params as {
        id: string;
      };

      const body = request.body as {
        username?: string;
        password?: string;
        role?: "ADMIN" | "USER";
      };

      const data: any = {};

      if (body.username)
        data.username = body.username;

      if (body.role)
        data.role = body.role;

      if (body.password) {
        data.password = await bcrypt.hash(
          body.password,
          10
        );
      }

      return prisma.user.update({
        where: {
          id: Number(id),
        },
        data,
      });
    }
  );

  app.delete(
    "/users/:id",
    { preHandler: [adminOnly] },
    async (request) => {
      const { id } = request.params as {
        id: string;
      };

      await prisma.user.delete({
        where: {
          id: Number(id),
        },
      });

      return {
        success: true,
      };
    }
  );

  app.post(
  "/auth/login",
  async (request, reply) => {
    const { username, password } =
      request.body as {
        username: string;
        password: string;
      };

    const user =
      await prisma.user.findUnique({
        where: {
          username,
        },
      });

    if (!user) {
      return reply.status(401).send({
        message:
          "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    const valid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!valid) {
      return reply.status(401).send({
        message:
          "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    const token =
      app.jwt.sign({
        id: user.id,
        username:
          user.username,
        role: user.role,
      });

    return {
      token,
      user: {
        id: user.id,
        username:
          user.username,
        role: user.role,
      },
    };
  }
);
}

