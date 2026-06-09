import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: {
      username: "admin",
    },
    data: {
      role: Role.ADMIN,
    },
  });

  console.log(user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());