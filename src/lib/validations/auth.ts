import { z } from "zod";
import { indianPhone } from "./common";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: indianPhone.optional().or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters")
    .regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password").max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
