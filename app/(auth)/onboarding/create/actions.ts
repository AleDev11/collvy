"use server"

import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { redirect } from "next/navigation"
import { z } from "zod/v4"

const schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long")
    .transform((v) => v.trim()),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and dashes")
    .transform((v) => v.toLowerCase().trim()),
})

export async function createWorkspace(formData: FormData) {
  const session = await requireAuth()

  const { success } = rateLimit(`create-ws:${session.user.id}`)
  if (!success) {
    return { error: "Too many attempts. Please try again later." }
  }

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { name, slug } = result.data

  const existing = await db.workspace.findUnique({ where: { slug } })
  if (existing) {
    return { error: "This slug is already taken" }
  }

  await db.workspace.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: "owner",
        },
      },
    },
  })

  redirect("/dashboard")
}
