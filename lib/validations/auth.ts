import { z } from "zod/v4"

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long")
    .transform((v) => v.trim()),
  email: z
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
})

export const loginSchema = z.object({
  email: z
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required").max(128),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
