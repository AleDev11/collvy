"use server"

import { signIn } from "@/lib/auth"
import { loginSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { AuthError } from "next-auth"
import { headers } from "next/headers"

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" })
}

export async function login(formData: FormData) {
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for") ?? "unknown"
  const { success } = rateLimit(`login:${ip}`)
  if (!success) {
    return { error: "Too many attempts. Please try again later." }
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    await signIn("credentials", {
      email: result.data.email,
      password: result.data.password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      // Generic message — never reveal if email exists or password is wrong
      return { error: "Invalid credentials" }
    }
    throw error
  }
}
