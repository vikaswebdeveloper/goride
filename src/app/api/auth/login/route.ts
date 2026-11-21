import bcrypt from "bcryptjs";
import { ok, parseBody, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations/auth";

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Yq3x0sEwJvJ6rQe3b9m6bOa1m9yq3S";

export const POST = route(async (req) => {
  const input = await parseBody(req, loginSchema);
  rateLimit(`login:ip:${clientIp(req)}`, 20, 10 * 60_000);
  rateLimit(`login:email:${input.email}`, 8, 10 * 60_000);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError("UNAUTHENTICATED", "Incorrect email or password.");

  await createSession(user.id, user.role);
  return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
});
