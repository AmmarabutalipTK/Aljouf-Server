import { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    console.log("AUTH HEADER:", request.headers.authorization);

    await request.jwtVerify();

    console.log("USER:", request.user);
  } catch (err) {
    console.error(err);

    return reply.status(401).send({
      message: "Unauthorized",
    });
  }
}