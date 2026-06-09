"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.update({
        where: {
            username: "admin",
        },
        data: {
            role: client_1.Role.ADMIN,
        },
    });
    console.log(user);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
