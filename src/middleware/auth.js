"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
async function authenticate(request, reply) {
    try {
        console.log("AUTH HEADER:", request.headers.authorization);
        await request.jwtVerify();
        console.log("USER:", request.user);
    }
    catch (err) {
        console.error(err);
        return reply.status(401).send({
            message: "Unauthorized",
        });
    }
}
