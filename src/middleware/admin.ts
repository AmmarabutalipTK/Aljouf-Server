import { FastifyReply, FastifyRequest } from "fastify";

export async function adminOnly(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await request.jwtVerify();

  if ((request.user as any).role !== "ADMIN") {
    return reply.status(403).send({
      message: "Access denied",
    });
  }
}