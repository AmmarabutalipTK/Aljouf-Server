"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = adminOnly;
async function adminOnly(request, reply) {
    await request.jwtVerify();
    if (request.user.role !== "ADMIN") {
        return reply.status(403).send({
            message: "Access denied",
        });
    }
}
