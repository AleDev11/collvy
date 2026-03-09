"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { signIn } from "@/lib/auth"
import { registerSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { AuthError } from "next-auth"
import { headers } from "next/headers"

export async function register(formData: FormData) {
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for") ?? "unknown"
  const { success } = rateLimit(`register:${ip}`)
  if (!success) {
    return { error: "Too many attempts. Please try again later." }
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const result = registerSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { name, email, password } = result.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    // Generic message to prevent email enumeration
    return { error: "Unable to create account. Please try a different email." }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.user.create({
    data: { name, email, hashedPassword },
  })

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Something went wrong" }
    }
    throw error
  }
}
