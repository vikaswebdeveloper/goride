import bcrypt from "bcryptjs";
import { ok, parseBody, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validations/auth";

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 5, 10 * 60_000);
  const input = await parseBody(req, registerSchema);

  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw new AppError("CONFLICT", "An account with this email already exists. Try signing in.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, phone: input.phone, passwordHash }, // role defaults to CUSTOMER; never from input
    select: { id: true, name: true, email: true, role: true },
  });
  await createSession(user.id, user.role);
  return ok(user, undefined, 201);
});
